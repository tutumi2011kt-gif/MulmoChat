<template>
  <div class="p-4 space-y-4">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold">mulmochat</h1>
      <button
        @click="showConfigPopup = true"
        class="p-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        title="Configuration"
      >
        <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"
            clip-rule="evenodd"
          />
        </svg>
      </button>
    </div>

    <!-- Voice chat controls -->
    <div class="space-y-2">
      <div
        v-if="messages.length || currentText"
        class="border rounded p-2 h-40 overflow-y-auto whitespace-pre-wrap text-sm"
      >
        <div v-for="(m, i) in messages" :key="i">{{ m }}</div>
        <div v-if="currentText">{{ currentText }}</div>
      </div>
      <button
        v-if="!chatActive"
        @click="startChat"
        :disabled="connecting"
        class="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
      >
        {{ connecting ? "Connecting..." : "Start Voice Chat" }}
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
      class="border rounded p-2 overflow-y-auto space-y-2"
      style="height: 70vh"
    >
      <div
        v-if="!generatedImages.length && !isGeneratingImage"
        class="text-gray-500 text-sm"
      >
        Feel free to ask me to generate images...
      </div>
      <img
        v-for="(image, index) in generatedImages"
        :key="index"
        :src="image"
        class="max-w-full h-auto rounded"
        alt="Generated image"
      />
      <div
        v-if="isGeneratingImage"
        class="flex items-center justify-center py-4"
      >
        <div
          class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
        ></div>
        <span class="ml-2 text-sm text-gray-600">Generating image...</span>
      </div>
    </div>

    <!-- Config Popup -->
    <div
      v-if="showConfigPopup"
      class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      @click.self="showConfigPopup = false"
    >
      <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div class="flex justify-between items-center mb-4">
          <h2 class="text-xl font-semibold">Configuration</h2>
          <button
            @click="showConfigPopup = false"
            class="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              v-model="systemPrompt"
              placeholder="You are a helpful assistant."
              class="w-full border rounded px-3 py-2 h-32 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            ></textarea>
          </div>

          <div class="flex justify-end space-x-2">
            <button
              @click="showConfigPopup = false"
              class="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              @click="saveConfig"
              class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from "vue";

const SYSTEM_PROMPT_KEY = "system_prompt";
const audioEl = ref<HTMLAudioElement | null>(null);
const imageContainer = ref<HTMLDivElement | null>(null);
const connecting = ref(false);
const systemPrompt = ref(localStorage.getItem(SYSTEM_PROMPT_KEY) || "");
const messages = ref<string[]>([]);
const currentText = ref("");
const generatedImages = ref<string[]>([]);
const isGeneratingImage = ref(false);
const pendingToolArgs: Record<string, string> = {};
const showConfigPopup = ref(false);

watch(systemPrompt, (val) => {
  localStorage.setItem(SYSTEM_PROMPT_KEY, val);
});
const chatActive = ref(false);

let pc: RTCPeerConnection | null = null;
let localStream: MediaStream | null = null;
let remoteStream: MediaStream | null = null;

async function generateImage(
  prompt: string,
  callback: (image: string | undefined, message: string) => void,
): Promise<void> {
  try {
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.image) {
      console.log("*** Image generation succeeded", data.image.length);
      callback(data.image, "image generation succeeded");
    } else {
      console.log("*** Image generation failed");
      callback(data.image, "image generation failed");
    }
  } catch (error) {
    console.error("*** Image generation failed", error);
    isGeneratingImage.value = false;
  }
}

async function startChat(): Promise<void> {
  // Gard against double start
  if (chatActive.value || connecting.value) return;

  connecting.value = true;

  // Call the start API endpoint to get ephemeral key
  const config = {
    apiKey: undefined as string | undefined,
  };
  try {
    const response = await fetch("/api/start", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    config.apiKey = data.ephemeralKey;

    if (!config.apiKey) {
      throw new Error("No ephemeral key received from server");
    }
  } catch (err) {
    console.error("Failed to get ephemeral key:", err);
    alert("Failed to start session. Check console for details.");
    connecting.value = false;
    return;
  }

  try {
    pc = new RTCPeerConnection();

    // Data channel for model events
    const dc = pc.createDataChannel("oai-events");
    dc.addEventListener("open", () => {
      dc.send(
        JSON.stringify({
          type: "session.update",
          session: {
            instructions: systemPrompt.value,
            modalities: ["text", "audio"],
            voice: "shimmer",
            tools: [
              {
                type: "function",
                name: "generateImage",
                description: "Generate an image from a text prompt.",
                parameters: {
                  type: "object",
                  properties: {
                    prompt: {
                      type: "string",
                      description: "Description of the desired image",
                    },
                  },
                  required: ["prompt"],
                },
              },
            ],
          },
        }),
      );
    });
    dc.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      console.log("Message", event.data.length, msg.type);
      if (msg.type === "error") {
        console.error("Error", msg.error);
      }
      if (msg.type === "response.text.delta") {
        currentText.value += msg.delta;
      }
      if (msg.type === "response.completed") {
        if (currentText.value.trim()) {
          messages.value.push(currentText.value);
        }
        currentText.value = "";
      }
      if (msg.type === "response.function_call_arguments.delta") {
        const id = msg.id || msg.call_id;
        pendingToolArgs[id] = (pendingToolArgs[id] || "") + msg.delta;
      }
      if (
        msg.type === "response.function_call_arguments.done" &&
        msg.name === "generateImage"
      ) {
        const id = msg.id || msg.call_id;
        try {
          const argStr = pendingToolArgs[id] || msg.arguments || "";
          const args = typeof argStr === "string" ? JSON.parse(argStr) : argStr;
          delete pendingToolArgs[id];
          const { prompt } = args || {};
          // Allow the model to continue immediately while the image is generated
          console.log("Generating image", prompt);
          isGeneratingImage.value = true;
          nextTick(() => {
            if (imageContainer.value) {
              imageContainer.value.scrollTop =
                imageContainer.value.scrollHeight;
            }
          });
          generateImage(prompt, (image, message) => {
            isGeneratingImage.value = false;
            console.log("Generated image", message);
            if (image) {
              console.log("Generated image", image.length);
              generatedImages.value.push(image);
              nextTick(() => {
                if (imageContainer.value) {
                  imageContainer.value.scrollTop =
                    imageContainer.value.scrollHeight;
                }
              });
            }
            dc?.send(
              JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: msg.call_id, // <-- from msg.call_id of the function call
                  output: JSON.stringify({
                    status: message,
                  }),
                },
              }),
            );
            dc?.send(
              JSON.stringify({
                type: "response.create",
                response: {
                  instructions: image
                    ? "Acknowledge that the image was generated and has been presented."
                    : "Acknowledge that the image generation failed.",
                  // e.g., the model might say: "Your image is ready."
                },
              }),
            );
          });
          dc.send(
            JSON.stringify({
              type: "response.create",
              response: {
                instructions:
                  "Tell the user to wait for the image to be generated.",
                // e.g., the model might say: "Your image is ready."
              },
            }),
          );
        } catch (e) {
          console.error("Failed to parse function call arguments", e);
        }
      }
    });

    // Play remote audio
    remoteStream = new MediaStream();
    pc.ontrack = (event) => {
      remoteStream.addTrack(event.track);
    };
    if (audioEl.value) {
      audioEl.value.srcObject = remoteStream;
    }

    // Send microphone audio
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

    // Create and send offer SDP
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    const response = await fetch(
      "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      },
    );
    const responseText = await response.text();
    console.log("Received answer from OpenAI", response, responseText);

    await pc.setRemoteDescription({ type: "answer", sdp: responseText });
    chatActive.value = true;
  } catch (err) {
    console.error(err);
    alert("Failed to start voice chat. Check console for details.");
  } finally {
    connecting.value = false;
  }
}

function stopChat(): void {
  if (pc) {
    pc.close();
    pc = null;
  }
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop());
    localStream = null;
  }
  if (remoteStream) {
    remoteStream.getTracks().forEach((track) => track.stop());
    remoteStream = null;
  }
  if (audioEl.value) {
    audioEl.value.srcObject = null;
  }
  chatActive.value = false;
}

function saveConfig(): void {
  showConfigPopup.value = false;
}
</script>

<style scoped></style>
