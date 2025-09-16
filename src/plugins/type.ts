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
