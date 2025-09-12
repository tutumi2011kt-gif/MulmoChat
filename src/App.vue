<template>
  <div class="p-4 space-y-4">
    <h1 class="text-2xl font-bold">mulmochat</h1>

    <!-- API key prompt -->
    <div v-if="!openaiKey || !geminiKey" class="space-y-2">
      <p class="text-sm">Enter your OpenAI and Gemini API keys to start chatting.</p>
      <div class="flex gap-2">
        <input
          v-model="tempOpenaiKey"
          type="password"
          placeholder="OpenAI sk-..."
          class="border rounded px-2 py-1 flex-1"
        />
      </div>
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
        Using stored API keys.
        <button @click="clearKeys" class="underline text-blue-600">Change</button>
      </p>
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

<script setup>
import { ref, watch } from 'vue'
import { generateImage } from './generateImage'

const OPENAI_STORAGE_KEY = 'openai_api_key'
const GEMINI_STORAGE_KEY = 'gemini_api_key'
const SYSTEM_PROMPT_KEY = 'system_prompt'

const openaiKey = ref(localStorage.getItem(OPENAI_STORAGE_KEY) || '')
const geminiKey = ref(localStorage.getItem(GEMINI_STORAGE_KEY) || '')
const tempOpenaiKey = ref('')
const tempGeminiKey = ref('')
const audioEl = ref(null)
const connecting = ref(false)
const systemPrompt = ref(localStorage.getItem(SYSTEM_PROMPT_KEY) || '')

watch(systemPrompt, (val) => {
  localStorage.setItem(SYSTEM_PROMPT_KEY, val)
})
const chatActive = ref(false)

let pc = null
let localStream = null
let remoteStream = null

function saveKeys() {
  localStorage.setItem(OPENAI_STORAGE_KEY, tempOpenaiKey.value)
  localStorage.setItem(GEMINI_STORAGE_KEY, tempGeminiKey.value)
  openaiKey.value = tempOpenaiKey.value
  geminiKey.value = tempGeminiKey.value
  tempOpenaiKey.value = ''
  tempGeminiKey.value = ''
}

function clearKeys() {
  localStorage.removeItem(OPENAI_STORAGE_KEY)
  localStorage.removeItem(GEMINI_STORAGE_KEY)
  openaiKey.value = ''
  geminiKey.value = ''
}

async function startChat() {
  connecting.value = true
  try {
    pc = new RTCPeerConnection()

    // Data channel for model events
    const dc = pc.createDataChannel('oai-events')
    dc.addEventListener('open', () => {
      dc.send(
        JSON.stringify({
          type: 'response.create',
          response: {
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
      if (msg.type === 'response.call_tool' && msg.name === 'generateImage') {
        const { prompt } = msg.arguments || {}
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

    const response = await fetch(
      'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey.value}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      }
    )

    const answer = { type: 'answer', sdp: await response.text() }
    await pc.setRemoteDescription(answer)
    chatActive.value = true
  } catch (err) {
    console.error(err)
    alert('Failed to start voice chat. Check console for details.')
  } finally {
    connecting.value = false
  }
}

function stopChat() {
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
