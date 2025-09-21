import * as GenerateImagePlugin from "./generateImage";
import * as EditImagePlugin from "./editImage";
import * as BrowsePlugin from "./browse";
import * as MulmocastPlugin from "./mulmocast";

export interface PluginContext {
  images: string[];
}

export interface PluginResult {
  message: string;
  title?: string;
  imageData?: string;
  url?: string;
  jsonData?: any;
  instructions?: string;
  htmlData?: string;
  location?: string | { lat: number; lng: number };
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
  ) => Promise<PluginResult>;
  generatingMessage: string;
  waitingMessage?: string;
}

const pluginList = [
  GenerateImagePlugin,
  EditImagePlugin,
  BrowsePlugin,
  MulmocastPlugin,
];

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

export const pluginWaitingMessage = (name: string) => {
  const plugin = plugins[name];
  if (!plugin) {
    throw new Error(`Plugin ${name} not found`);
  }
  return plugin.waitingMessage;
};
