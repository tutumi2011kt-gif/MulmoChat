import * as GenerateImagePlugin from "./generateImage";
import * as EditImagePlugin from "./editImage";
import * as BrowsePlugin from "./browse";
import * as MulmocastPlugin from "./mulmocast";
import * as MapPlugin from "./map";
import type { StartApiResponse } from "../../server/types";

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
  requiresGoogleMapKey?: boolean;
}

const pluginList = [
  GenerateImagePlugin,
  EditImagePlugin,
  BrowsePlugin,
  MulmocastPlugin,
  MapPlugin,
];

export const pluginTools = (startResponse?: StartApiResponse) => {
  return pluginList
    .filter((plugin) => {
      // If plugin requires googleMapKey but it's not available, exclude it
      if (plugin.plugin.requiresGoogleMapKey && !startResponse?.googleMapKey) {
        return false;
      }
      return true;
    })
    .map((plugin) => plugin.plugin.toolDefinition);
};

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
