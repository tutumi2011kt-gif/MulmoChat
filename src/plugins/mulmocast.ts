import { Plugin, PluginContext, PluginResult } from "./type";

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

  // Placeholder implementation
  return {
    message: `Mulmocast has received the MulmoScript and is processing it.`,
    instructions: "Acknowledge that the mulmocast operation was completed.",
  };
};

export const plugin: Plugin = {
  toolDefinition,
  execute: mulmocast,
  generatingMessage: "Processing with Mulmocast...",
  waitingMessage: "Tell the user that you are processing with Mulmocast.",
};
