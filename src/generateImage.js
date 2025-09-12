import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Generate an image from a text prompt using Google's Gemini model.
 *
 * @param {string} apiKey - Gemini API key supplied by the UI.
 * @param {string} prompt - Description of the desired image.
 * @param {(image: string) => void} callback - Called with a data URL of the image when available.
 */
export function generateImage(apiKey, prompt, callback) {
  (async () => {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "image/png" },
      });
      const imageData = result.response.candidates[0].content.parts[0].inlineData.data;
      callback(`data:image/png;base64,${imageData}`);
    } catch (err) {
      console.error("Image generation failed", err);
    }
  })();
}

