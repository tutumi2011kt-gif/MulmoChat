import { Plugin, PluginContext, PluginResult } from "./type";
import { blankImageBase64 } from "./blank";

const toolDefinition = {
  type: "function" as const,
  name: "pushMulmoScript",
  description:
    "Let MulmoCast to process a given MulmoScript to generate a presentation of a given topic or story.",
  parameters: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "The title of the presentation" },
      lang: {
        type: "string",
        description: "The language of the presentation, such as en, ja, etc.",
      },
      beats: {
        type: "array",
        items: {
          type: "object",
          properties: {
            text: {
              type: "string",
              description:
                "The text to be spoken by the presenter, which is also used to generate an image",
            },
          },
          required: ["text"],
          additionalProperties: false,
        },
        minItems: 1,
      },
    },
    required: ["title", "lang", "beats"],
    additionalProperties: false,
  },
};

const mulmocast = async (
  context: PluginContext,
  args: Record<string, any>,
): Promise<PluginResult> => {
  console.log("******** Mulmocast plugin\n", JSON.stringify(args, null, 2));

  const { title, beats } = args;
  const style =
    "<style>Photo realistic and cinematic. Let the art convey the story and emotions without text.Use the last image for the aspect ratio.</style>";

  // Generate HTML from MulmoScript
  let htmlContent = `<h1 style="font-size: 2em; margin-bottom: 1em;">${title}</h1>`;

  // Generate images for each beat concurrently
  const imagePromises = beats.map(async (beat: { text: string }) => {
    const prompt = `generate image appropriate for the text. <text>${beat.text}</text>${style}`;

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt, images: [blankImageBase64] }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.imageData) {
          return data.imageData;
        }
      }
    } catch (error) {
      console.error("Failed to generate image for beat:", error);
    }
    return null;
  });

  const images = await Promise.all(imagePromises);

  // Build HTML with images and text
  beats.forEach((beat: { text: string }, index: number) => {
    if (images[index]) {
      htmlContent += `<img src="data:image/png;base64,${images[index]}" style="max-width: 100%; margin: 1em 0;" alt="${beat.text}" />`;
    }
    htmlContent += `<p style="margin-bottom: 1em;">${beat.text}</p>`;
  });

  return {
    message: `Mulmocast has processed the MulmoScript for "${title}" with ${beats.length} beats.`,
    title: title,
    htmlData: htmlContent,
    instructions: "Acknowledge that the mulmocast operation was completed.",
  };
};

export const plugin: Plugin = {
  toolDefinition,
  execute: mulmocast,
  generatingMessage: "Processing with Mulmocast...",
  waitingMessage: "Tell the user that you are processing with Mulmocast.",
};
