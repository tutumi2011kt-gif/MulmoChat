import * as GenerateImagePlugin from "./generateImage";

export interface Plugin {
  toolDefinition: {
    type: "function";
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: {
        [key: string]: any;
      };
      required: string[];
    };
  };
  execute: (
    prompt: string,
  ) => Promise<{ image?: string; message: string }>;
}

export const tools = [GenerateImagePlugin].map((plugin) => plugin.plugin.toolDefinition);

const plugins = [GenerateImagePlugin].reduce((acc, plugin) => {
  acc[plugin.plugin.toolDefinition.name] = plugin.plugin;
  return acc;
}, {} as Record<string, Plugin>);

export const pluginExecute = (name: string, prompt: string) => {
  const plugin = plugins[name];
  if (!plugin) {
    throw new Error(`Plugin ${name} not found`);
  }
  return plugin.execute(prompt);
};
