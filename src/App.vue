<template>
  <div class="p-4 space-y-4">
    <h1 class="text-2xl font-bold">mulmochat</h1>

    <!-- API key prompt -->
    <div v-if="!geminiKey" class="space-y-2">
      <p class="text-sm">Enter your Gemini API key to start chatting.</p>
      <div class="flex gap-2">
        <input
          v-model="tempGeminiKey"
          type="password"
          placeholder="Gemini key"
          class="border rounded px-2 py-1 flex-1"
        />
      </div>
      <button @click="saveKeys" class="px-3 py-1 bg-blue-600 text-white rounded">
        Save
      </button>
    </div>

    <!-- Voice chat controls -->
    <div v-else class="space-y-2">
      <p class="text-sm">
        Using stored Gemini API key.
        <button @click="clearKeys" class="underline text-blue-600">Change</button>
      </p>
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
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { generateImage } from './generateImage'

const GEMINI_STORAGE_KEY = 'gemini_api_key'
const SYSTEM_PROMPT_KEY = 'system_prompt'

const geminiKey = ref(localStorage.getItem(GEMINI_STORAGE_KEY) || '')
const tempGeminiKey = ref('')
const audioEl = ref<HTMLAudioElement | null>(null)
const connecting = ref(false)
const systemPrompt = ref(localStorage.getItem(SYSTEM_PROMPT_KEY) || '')
const messages = ref<string[]>([])
const currentText = ref('')
const pendingToolArgs: Record<string, string> = {}

watch(systemPrompt, (val) => {
  localStorage.setItem(SYSTEM_PROMPT_KEY, val)
})
const chatActive = ref(false)

let pc: RTCPeerConnection | null = null
let localStream: MediaStream | null = null
let remoteStream: MediaStream | null = null

function saveKeys(): void {
  localStorage.setItem(GEMINI_STORAGE_KEY, tempGeminiKey.value)
  geminiKey.value = tempGeminiKey.value
  tempGeminiKey.value = ''
}

function clearKeys(): void {
  localStorage.removeItem(GEMINI_STORAGE_KEY)
  geminiKey.value = ''
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
        generateImage(geminiKey.value, prompt, (image) => {
          console.log('Generated image', image.length)
          const img = new Image()
          img.src = image
          document.body.appendChild(img)
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
