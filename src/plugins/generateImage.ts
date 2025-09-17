import { Plugin, PluginContext, PluginResult } from "./type";

const toolDefinition = {
  type: "function" as const,
  name: "generateImage",
  description: "Generate an image from a text prompt.",
  parameters: {
    type: "object" as const,
    properties: {
      prompt: {
        type: "string",
        description: "Description of the desired image in English",
      },
    },
    required: ["prompt"],
  },
};

export async function generateImageCommon(
  context: PluginContext,
  prompt: string,
  editImage: boolean,
): Promise<PluginResult> {
  try {
    const response = await fetch("/api/generate-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt, images: editImage ? context.images : [] }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.imageData) {
      console.log("*** Image generation succeeded", data.imageData.length);
      return {
        imageData: data.imageData,
        message: "image generation succeeded",
      };
    } else {
      console.log("*** Image generation failed");
      return { message: data.message || "image generation failed" };
    }
  } catch (error) {
    console.error("*** Image generation failed", error);
    return { message: "image generation failed" };
  }
}

const generateImage = async (
  context: PluginContext,
  args: Record<string, any>,
): Promise<PluginResult> => {
  const prompt = args.prompt as string;
  console.log("******** Generate image", prompt);
  return generateImageCommon(context, prompt, false);
};

export const plugin: Plugin = {
  toolDefinition,
  execute: generateImage,
  generatingMessage: "Generating image...",
  waitingMessage: "Tell the user to wait for the image to be generated.",
};
