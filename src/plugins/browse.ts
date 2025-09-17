import { Plugin, PluginContext, PluginResult } from "./type";

const toolDefinition = {
  type: "function" as const,
  name: "browse",
  description:
    "Browse and extract content from a web page using the provided URL.",
  parameters: {
    type: "object" as const,
    properties: {
      url: {
        type: "string",
        description:
          "The URL of the webpage to browse and extract content from",
      },
    },
    required: ["url"],
  },
};

const browse = async (
  context: PluginContext,
  args: Record<string, any>,
): Promise<PluginResult> => {
  const url = args.url as string;
  console.log("******** Browse URL", url);

  try {
    const response = await fetch("/api/browse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.success && data.data) {
      console.log("*** Browse succeeded", data.data);
      return {
        message: "Successfully browsed the webpage",
        jsonData: data.data,
      };
    } else {
      console.log("*** Browse failed");
      return {
        message: data.error || "Failed to browse webpage",
      };
    }
  } catch (error) {
    console.error("*** Browse failed", error);
    return {
      message: `Failed to browse webpage: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
};

export const plugin: Plugin = {
  toolDefinition,
  execute: browse,
  generatingMessage: "Browsing webpage...",
  waitingMessage: "Tell the user to wait for the webpage to be browsed.",
};
