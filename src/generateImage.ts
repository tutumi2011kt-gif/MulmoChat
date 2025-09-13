import { GoogleGenerativeAI } from "@google/generative-ai";

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
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "image/png" },
    });
    const imageData =
      result.response?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (imageData) {
      callback(`data:image/png;base64,${imageData}`);
    }
  } catch (err) {
    console.error("Image generation failed", err);
  }
}

