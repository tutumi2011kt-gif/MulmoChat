import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI, PersonGeneration } from "@google/genai";

/**
 * Generate an image from a text prompt using Google's Gemini model.
 *
 * @param apiKey - Gemini API key supplied by the UI.
 * @param prompt - Description of the desired image.
 * @param callback - Called with a data URL of the image when available.
 */
export async function generateImage(
  apiKey: string,
  prompt: string,
  callback: (image: string) => void
): Promise<void> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-2.5-flash-image-preview";
    const contents: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [{ text: prompt }];
    const response = await ai.models.generateContent({ model, contents });
    const imageData =
      response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (imageData) {
      callback(`data:image/png;base64,${imageData}`);
    }
  } catch (err) {
    console.error("Image generation failed", err);
  }
}

