<template>
  <div class="p-4 space-y-4">
    <h1 class="text-2xl font-bold">mulmochat</h1>

    <!-- Voice chat controls -->
    <div class="space-y-2">
      <div
        v-if="messages.length || currentText"
        class="border rounded p-2 h-40 overflow-y-auto whitespace-pre-wrap text-sm"
      >
        <div v-for="(m, i) in messages" :key="i">{{ m }}</div>
        <div v-if="currentText">{{ currentText }}</div>
      </div>
      <textarea
        v-model="systemPrompt"
        placeholder="You are a helpful assistant."
        class="w-full border rounded px-2 py-1"
      ></textarea>
      <button
        v-if="!chatActive"
        @click="startChat"
        :disabled="connecting"
        class="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {{ connecting ? 'Connecting...' : 'Start Voice Chat' }}
      </button>
      <button
        v-else
        @click="stopChat"
        class="px-4 py-2 bg-red-600 text-white rounded"
      >
        Stop Voice Chat
      </button>
      <audio ref="audioEl" autoplay></audio>
    </div>

    <!-- Generated images container -->
    <div
      ref="imageContainer"
      class="border rounded p-2 h-60 overflow-y-auto space-y-2"
    >
      <div v-if="!generatedImages.length" class="text-gray-500 text-sm">Generated images will appear here...</div>
      <img
        v-for="(image, index) in generatedImages"
        :key="index"
        :src="image"
        class="max-w-full h-auto rounded"
        alt="Generated image"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const SYSTEM_PROMPT_KEY = 'system_prompt'
const audioEl = ref<HTMLAudioElement | null>(null)
const imageContainer = ref<HTMLDivElement | null>(null)
const connecting = ref(false)
const systemPrompt = ref(localStorage.getItem(SYSTEM_PROMPT_KEY) || '')
const messages = ref<string[]>([])
const currentText = ref('')
const generatedImages = ref<string[]>([])
const pendingToolArgs: Record<string, string> = {}

watch(systemPrompt, (val) => {
  localStorage.setItem(SYSTEM_PROMPT_KEY, val)
})
const chatActive = ref(false)

let pc: RTCPeerConnection | null = null
let localStream: MediaStream | null = null
let remoteStream: MediaStream | null = null

async function generateImage(prompt: string, callback: (image: string) => void): Promise<void> {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ prompt })
    })

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`)
    }

    const data = await response.json()

    if (data.success && data.image) {
      console.log('*** Image generation succeeded', data.image.length)
      callback(data.image)
    } else {
      throw new Error(data.error || 'Failed to generate image')
    }
  } catch (error) {
    console.error('*** Image generation failed', error)
  }
}

async function startChat(): Promise<void> {
  connecting.value = true

  // Call the start API endpoint to get ephemeral key
  let ephemeralKey: string
  try {
    const response = await fetch('/api/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    const data = await response.json()
    ephemeralKey = data.ephemeralKey

    if (!ephemeralKey) {
      throw new Error('No ephemeral key received from server')
    }
  } catch (err) {
    console.error('Failed to get ephemeral key:', err)
    alert('Failed to start session. Check console for details.')
    connecting.value = false
    return
  }

  try {
    pc = new RTCPeerConnection()

    // Data channel for model events
    const dc = pc.createDataChannel('oai-events')
    dc.addEventListener('open', () => {
      dc.send(
        JSON.stringify({
          type: 'session.update',
          session: {
            instructions: systemPrompt.value,
            tools: [
              {
                name: 'generateImage',
                type: 'function',
                description: 'Generate an image from a text prompt.',
                parameters: {
                  type: 'object',
                  properties: {
                    prompt: {
                      type: 'string',
                      description: 'Description of the desired image'
                    }
                  },
                  required: ['prompt']
                }
              }
            ]
          }
        })
      )
    })
    dc.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data)
      console.log('Message', event.data.length, msg.type)
      if (msg.type === 'error') {
        console.error('Error', msg.error)
      }
      if (msg.type === 'response.text.delta') {
        currentText.value += msg.delta
      }
      if (msg.type === 'response.completed') {
        if (currentText.value.trim()) {
          messages.value.push(currentText.value)
        }
        currentText.value = ''
      }
      if (msg.type === 'response.function_call_arguments.delta') {
        const id = msg.id || msg.call_id
        pendingToolArgs[id] = (pendingToolArgs[id] || '') + msg.delta
      }
      if (msg.type === 'response.function_call_arguments.done' && msg.name === 'generateImage') {
        const id = msg.id || msg.call_id
        let args = {}
        try {
          const argStr = pendingToolArgs[id] || msg.arguments || ''
          args = typeof argStr === 'string' ? JSON.parse(argStr) : argStr
        } catch (e) {
          console.error('Failed to parse function call arguments', e)
        }
        delete pendingToolArgs[id]
        const { prompt } = args || {}
        // Allow the model to continue immediately while the image is generated
        console.log('Generating image', prompt)
        generateImage(prompt, (image) => {
          console.log('Generated image', image.length)
          generatedImages.value.push(image)
          nextTick(() => {
            if (imageContainer.value) {
              imageContainer.value.scrollTop = imageContainer.value.scrollHeight
            }
          })
        })
        dc.send(
          JSON.stringify({
            type: 'response.create'
          })
        )
      }
    })

    // Play remote audio
    remoteStream = new MediaStream()
    pc.ontrack = (event) => {
      remoteStream.addTrack(event.track)
    }
    if (audioEl.value) {
      audioEl.value.srcObject = remoteStream
    }

    // Send microphone audio
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))

    // Create and send offer SDP
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    console.log('Sending offer to OpenAI', ephemeralKey)
    const response = await fetch(
      'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${ephemeralKey}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      }
    )
    const responseText = await response.text()
    console.log('Received answer from OpenAI', response, responseText)

    const answer = { type: 'answer', sdp: responseText }
    await pc.setRemoteDescription(answer)
    chatActive.value = true
  } catch (err) {
    console.error(err)
    alert('Failed to start voice chat. Check console for details.')
  } finally {
    connecting.value = false
  }
}

function stopChat(): void {
  if (pc) {
    pc.close()
    pc = null
  }
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop())
    localStream = null
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop())
    remoteStream = null
  }
  if (audioEl.value) {
    audioEl.value.srcObject = null
  }
  chatActive.value = false
}
</script>

<style scoped>
</style>
