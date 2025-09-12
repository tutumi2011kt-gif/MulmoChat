<template>
  <div class="p-4 space-y-4">
    <h1 class="text-2xl font-bold">mulmochat</h1>

    <!-- API key prompt -->
    <div v-if="!apiKey" class="space-y-2">
      <p class="text-sm">Enter your OpenAI API key to start chatting.</p>
      <div class="flex gap-2">
        <input
          v-model="tempKey"
          type="password"
          placeholder="sk-..."
          class="border rounded px-2 py-1 flex-1"
        />
        <button @click="saveKey" class="px-3 py-1 bg-blue-600 text-white rounded">
          Save
        </button>
      </div>
    </div>

    <!-- Voice chat controls -->
    <div v-else class="space-y-2">
      <p class="text-sm">
        Using stored API key.
        <button @click="clearKey" class="underline text-blue-600">Change</button>
      </p>
      <button
        @click="startChat"
        :disabled="connecting"
        class="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {{ connecting ? 'Connecting...' : 'Start Voice Chat' }}
      </button>
      <audio ref="audioEl" autoplay></audio>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const STORAGE_KEY = 'openai_api_key'

const apiKey = ref(localStorage.getItem(STORAGE_KEY) || '')
const tempKey = ref('')
const audioEl = ref(null)
const connecting = ref(false)

function saveKey() {
  localStorage.setItem(STORAGE_KEY, tempKey.value)
  apiKey.value = tempKey.value
  tempKey.value = ''
}

function clearKey() {
  localStorage.removeItem(STORAGE_KEY)
  apiKey.value = ''
}

async function startChat() {
  connecting.value = true
  try {
    const pc = new RTCPeerConnection()

    // Data channel for model events
    const dc = pc.createDataChannel('oai-events')
    dc.addEventListener('open', () => {
      dc.send(JSON.stringify({ type: 'response.create' }))
    })

    // Play remote audio
    const remoteStream = new MediaStream()
    pc.ontrack = (event) => {
      remoteStream.addTrack(event.track)
    }
    if (audioEl.value) {
      audioEl.value.srcObject = remoteStream
    }

    // Send microphone audio
    const localStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream))

    // Create and send offer SDP
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    const response = await fetch(
      'https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.value}`,
          'Content-Type': 'application/sdp'
        },
        body: offer.sdp
      }
    )

    const answer = { type: 'answer', sdp: await response.text() }
    await pc.setRemoteDescription(answer)
  } catch (err) {
    console.error(err)
    alert('Failed to start voice chat. Check console for details.')
  } finally {
    connecting.value = false
  }
}
</script>

<style scoped>
</style>
