import express, { Request, Response, Router } from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();

const router: Router = express.Router();

// Session start endpoint
router.get("/start", async (req: Request, res: Response): Promise<void> => {
  console.log("Chat session started");

  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    res
      .status(500)
      .json({ error: "OPENAI_API_KEY environment variable not set" });
    return;
  }

  try {
    const sessionConfig = JSON.stringify({
      session: {
        type: "realtime",
        model: "gpt-realtime",
        audio: {
          output: { voice: "shimmer" },
        },
      },
    });

    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: sessionConfig,
      },
    );

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    /*
    const data = await response.json()
    console.log('Generated ephemeral key:', data.value)

    res.json({
      success: true,
      message: 'Session started',
      ephemeralKey: data.value
    })
    */
    // HACK: Use a fake ephemeral key for now
    res.json({
      success: true,
      message: "Session started",
      ephemeralKey: openaiKey, // HACK: Use the real key for now
    });
  } catch (error: unknown) {
    console.error("Failed to generate ephemeral key:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      error: "Failed to generate ephemeral key",
      details: errorMessage,
    });
  }
});

// Generate image endpoint
router.post(
  "/generate-image",
  async (req: Request, res: Response): Promise<void> => {
    const { prompt } = req.body;

    if (!prompt) {
      res.status(400).json({ error: "Prompt is required" });
      return;
    }

    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      res
        .status(500)
        .json({ error: "GEMINI_API_KEY environment variable not set" });
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const model = "gemini-2.5-flash-image-preview";
      const contents = [{ text: prompt }];
      const response = await ai.models.generateContent({ model, contents });
      const parts = response.candidates?.[0]?.content?.parts ?? [];
      const returnValue: {
        success: boolean;
        message?: string;
        image?: string;
      } = {
        success: false,
        message: undefined,
        image: undefined,
      };

      console.log(
        "*** Gemini image generation response parts:",
        parts.length,
        prompt,
      );

      for (const part of parts) {
        if (part.text) {
          console.log("*** Gemini image generation response:", part.text);
          returnValue.message = part.text;
        }
        if (part.inlineData) {
          const imageData = part.inlineData.data;
          if (imageData) {
            console.log("*** Image generation succeeded");
            returnValue.success = true;
            returnValue.image = `data:image/png;base64,${imageData}`;
          } else {
            console.log("*** the part has inlineData, but no image data", part);
          }
        }
      }
      if (!returnValue.message) {
        returnValue.message = returnValue.image
          ? "image generation succeeded"
          : "no image data found in response";
      }

      res.json(returnValue);
    } catch (error: unknown) {
      console.error("*** Image generation failed", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({
        error: "Failed to generate image",
        details: errorMessage,
      });
    }
  },
);

export default router;
