import * as GenerateImagePlugin from "./generateImage";

export interface PluginContext {
  images: string[];
}

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
  execute: (context: PluginContext, prompt: string) => Promise<{ image?: string; message: string }>;
}

export const pluginTools = [GenerateImagePlugin].map(
  (plugin) => plugin.plugin.toolDefinition,
);

const plugins = [GenerateImagePlugin].reduce(
  (acc, plugin) => {
    acc[plugin.plugin.toolDefinition.name] = plugin.plugin;
    return acc;
  },
  {} as Record<string, Plugin>,
);

export const pluginExecute = (context: PluginContext, name: string, prompt: string) => {
  const plugin = plugins[name];
  if (!plugin) {
    throw new Error(`Plugin ${name} not found`);
  }
  return plugin.execute(context, prompt);
};
