<template>
  <div class="p-4 space-y-4">
    <div role="toolbar" class="flex justify-between items-center">
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

    <!-- Main content area with sidebar -->
    <div class="flex space-x-4" style="height: calc(100vh - 80px)">
      <!-- Sidebar -->
      <div
        class="w-[30%] bg-gray-50 border rounded p-4 flex flex-col space-y-4"
      >
        <!-- Voice chat controls -->
        <div class="space-y-2 flex-shrink-0">
          <button
            v-if="!chatActive"
            @click="startChat"
            :disabled="connecting"
            class="w-full px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
          >
            {{ connecting ? "Connecting..." : "Start Voice Chat" }}
          </button>
          <button
            v-else
            @click="stopChat"
            class="w-full px-4 py-2 bg-red-600 text-white rounded"
          >
            Stop Voice Chat
          </button>
          <audio ref="audioEl" autoplay></audio>
        </div>

        <!-- Generated images container -->
        <div class="flex-1 flex flex-col min-h-0">
          <div
            ref="imageContainer"
            class="border rounded p-2 overflow-y-auto space-y-2 flex-1"
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
              :src="`data:image/png;base64,${image}`"
              class="max-w-full h-auto rounded cursor-pointer hover:opacity-75 transition-opacity"
              :class="{ 'ring-2 ring-blue-500': selectedImageIndex === index }"
              alt="Generated image"
              @click="selectedImageIndex = index"
            />
            <div
              v-if="isGeneratingImage"
              class="flex items-center justify-center py-4"
            >
              <div
                class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"
              ></div>
              <span class="ml-2 text-sm text-gray-600">{{
                generatingMessage
              }}</span>
            </div>
          </div>
        </div>

        <div class="space-y-2 flex-shrink-0">
          <input
            v-model="userInput"
            @keyup.enter.prevent="sendTextMessage"
            :disabled="!chatActive"
            type="text"
            placeholder="Type a message"
            class="w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          />
          <button
            @click="sendTextMessage"
            :disabled="!chatActive || !userInput.trim()"
            class="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Send Message
          </button>
        </div>
      </div>

      <!-- Main content -->
      <div class="flex-1 flex flex-col">
        <div
          class="flex-1 border rounded p-4 flex items-center justify-center bg-gray-50"
        >
          <img
            v-if="generatedImages.length > 0 && selectedImageIndex !== null"
            :src="`data:image/png;base64,${generatedImages[selectedImageIndex]}`"
            class="max-w-full max-h-full object-contain rounded"
            alt="Current generated image"
          />
          <div v-else class="text-gray-400 text-lg">Canvas</div>
        </div>
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
import {
  pluginTools,
  pluginExecute,
  PluginContext,
  pluginGeneratingMessage,
  pluginWaitingMessage,
} from "./plugins/type";

const SYSTEM_PROMPT_KEY = "system_prompt";
const audioEl = ref<HTMLAudioElement | null>(null);
const imageContainer = ref<HTMLDivElement | null>(null);
const connecting = ref(false);
const systemPrompt = ref(localStorage.getItem(SYSTEM_PROMPT_KEY) || "");
const messages = ref<string[]>([]);
const currentText = ref("");
const generatedImages = ref<string[]>([]);
const isGeneratingImage = ref(false);
const generatingMessage = ref("");
const pendingToolArgs: Record<string, string> = {};
const showConfigPopup = ref(false);
const selectedImageIndex = ref<number | null>(null);
const userInput = ref("");

watch(systemPrompt, (val) => {
  localStorage.setItem(SYSTEM_PROMPT_KEY, val);
});
const chatActive = ref(false);

const webrtc = {
  pc: null as RTCPeerConnection | null,
  dc: null as RTCDataChannel | null,
  localStream: null as MediaStream | null,
  remoteStream: null as MediaStream | null,
};

function scrollToBottomOfImageContainer(): void {
  nextTick(() => {
    if (imageContainer.value) {
      imageContainer.value.scrollTop = imageContainer.value.scrollHeight;
    }
  });
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
    webrtc.pc = new RTCPeerConnection();

    // Data channel for model events
    const dc = webrtc.pc.createDataChannel("oai-events");
    webrtc.dc = dc;
    dc.addEventListener("open", () => {
      dc.send(
        JSON.stringify({
          type: "session.update",
          session: {
            instructions: systemPrompt.value,
            modalities: ["text", "audio"],
            voice: "shimmer",
            tools: pluginTools,
          },
        }),
      );
    });
    dc.addEventListener("message", async (event) => {
      const msg = JSON.parse(event.data);
      // console.log("Message", event.data.length, msg.type);
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
      if (msg.type === "response.function_call_arguments.done") {
        const id = msg.id || msg.call_id;
        try {
          const argStr = pendingToolArgs[id] || msg.arguments || "";
          const args = typeof argStr === "string" ? JSON.parse(argStr) : argStr;
          delete pendingToolArgs[id];
          isGeneratingImage.value = true;
          generatingMessage.value = pluginGeneratingMessage(msg.name);
          scrollToBottomOfImageContainer();
          const context: PluginContext = {
            images: [],
          };
          if (
            generatedImages.value.length > 0 &&
            selectedImageIndex.value !== null
          ) {
            context.images = [generatedImages.value[selectedImageIndex.value]];
          }
          const promise = pluginExecute(context, msg.name, args);
          // Allow the model to continue immediately while the image is generated
          dc.send(
            JSON.stringify({
              type: "response.create",
              response: {
                instructions: pluginWaitingMessage(msg.name),
                // e.g., the model might say: "Your image is ready."
              },
            }),
          );

          const result = await promise;
          isGeneratingImage.value = false;
          if (result.imageData) {
            generatedImages.value.push(result.imageData);
            selectedImageIndex.value = generatedImages.value.length - 1;
            scrollToBottomOfImageContainer();
          }
          const outputPayload: Record<string, unknown> = {
            status: result.message,
          };
          if (result.jsonData) {
            outputPayload.data = result.jsonData;
          }
          dc?.send(
            JSON.stringify({
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: msg.call_id,
                output: JSON.stringify(outputPayload),
              },
            }),
          );
          dc?.send(
            JSON.stringify({
              type: "response.create",
              response: {
                instructions: result.imageData
                  ? "Acknowledge that the image was generated and has been already presented to the user."
                  : "Acknowledge that the image generation failed.",
              },
            }),
          );
        } catch (e) {
          console.error("Failed to parse function call arguments", e);
        }
      }
    });
    dc.addEventListener("close", () => {
      webrtc.dc = null;
    });

    // Play remote audio
    webrtc.remoteStream = new MediaStream();
    webrtc.pc.ontrack = (event) => {
      webrtc.remoteStream.addTrack(event.track);
    };
    if (audioEl.value) {
      audioEl.value.srcObject = webrtc.remoteStream;
    }

    // Send microphone audio
    webrtc.localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
    });
    webrtc.localStream
      .getTracks()
      .forEach((track) => webrtc.pc.addTrack(track, webrtc.localStream));

    // Create and send offer SDP
    const offer = await webrtc.pc.createOffer();
    await webrtc.pc.setLocalDescription(offer);

    const response = await fetch(
      "https://api.openai.com/v1/realtime?model=gpt-realtime", // gpt-4o-realtime-preview is available.
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

    await webrtc.pc.setRemoteDescription({ type: "answer", sdp: responseText });
    chatActive.value = true;
  } catch (err) {
    console.error(err);
    stopChat();
    alert("Failed to start voice chat. Check console for details.");
  } finally {
    connecting.value = false;
  }
}

function sendTextMessage(): void {
  const text = userInput.value.trim();
  if (!text) return;

  const dc = webrtc.dc;
  if (!chatActive.value || !dc || dc.readyState !== "open") {
    console.warn("Cannot send text message because the data channel is not ready.");
    return;
  }

  dc.send(
    JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [
          {
            type: "input_text",
            text,
          },
        ],
      },
    }),
  );
  dc.send(
    JSON.stringify({
      type: "response.create",
      response: {},
    }),
  );

  messages.value.push(`You: ${text}`);
  userInput.value = "";
}

function stopChat(): void {
  if (webrtc.pc) {
    webrtc.pc.close();
    webrtc.pc = null;
  }
  if (webrtc.dc) {
    webrtc.dc.close();
    webrtc.dc = null;
  }
  if (webrtc.localStream) {
    webrtc.localStream.getTracks().forEach((track) => track.stop());
    webrtc.localStream = null;
  }
  if (webrtc.remoteStream) {
    webrtc.remoteStream.getTracks().forEach((track) => track.stop());
    webrtc.remoteStream = null;
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
