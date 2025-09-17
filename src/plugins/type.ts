import * as GenerateImagePlugin from "./generateImage";
import * as EditImagePlugin from "./editImage";

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
  execute: (
    context: PluginContext,
    args: Record<string, any>,
  ) => Promise<{ imageData?: string; message: string }>;
  generatingMessage: string;
}

const pluginList = [GenerateImagePlugin, EditImagePlugin];

export const pluginTools = pluginList.map(
  (plugin) => plugin.plugin.toolDefinition,
);

const plugins = pluginList.reduce(
  (acc, plugin) => {
    acc[plugin.plugin.toolDefinition.name] = plugin.plugin;
    return acc;
  },
  {} as Record<string, Plugin>,
);

export const pluginExecute = (
  context: PluginContext,
  name: string,
  args: Record<string, any>,
) => {
  console.log("******** Plugin execute", name, args);
  const plugin = plugins[name];
  if (!plugin) {
    throw new Error(`Plugin ${name} not found`);
  }
  return plugin.execute(context, args);
};

export const pluginGeneratingMessage = (name: string) => {
  const plugin = plugins[name];
  if (!plugin) {
    throw new Error(`Plugin ${name} not found`);
  }
  return plugin.generatingMessage;
};
