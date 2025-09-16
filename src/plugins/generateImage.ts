import { Plugin } from "./type";

const toolDefinition = {
  type: "function" as const,
  name: "generateImage",
  description: "Generate an image from a text prompt.",
  parameters: {
    type: "object" as const,
    properties: {
      prompt: {
        type: "string",
        description: "Description of the desired image",
      },
    },
    required: ["prompt"],
  },
};

async function generateImage(
  prompt: string,
): Promise<{ image?: string; message: string }> {
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
      return { image: data.image, message: "image generation succeeded" };
    } else {
      console.log("*** Image generation failed");
      return { message: data.message || "image generation failed" };
    }
  } catch (error) {
    console.error("*** Image generation failed", error);
    return { message: "image generation failed" };
  }
}

export const plugin: Plugin = {
  toolDefinition,
  generateImage,
};
