import express from 'express'
import dotenv from 'dotenv'
import { GoogleGenAI } from '@google/genai'
dotenv.config()

const router = express.Router()

// Session start endpoint
router.post('/start', async (req, res) => {
  console.log('session started', process.env.OPENAI_API_KEY);

  const openaiKey = process.env.OPENAI_API_KEY

  if (!openaiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY environment variable not set' })
  }

  try {
    const sessionConfig = JSON.stringify({
      session: {
        type: "realtime",
        model: "gpt-realtime",
        audio: {
          output: { voice: "marin" },
        },
      },
    })

    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: sessionConfig,
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
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
      message: 'Session started',
      ephemeralKey: openaiKey, // HACK: Use the real key for now
    })
  } catch (error) {
    console.error('Failed to generate ephemeral key:', error)
    res.status(500).json({
      error: 'Failed to generate ephemeral key',
      details: error.message
    })
  }
})

// Chat history endpoint
router.get('/chat/history', (req, res) => {
  res.json({
    messages: [
      { id: 1, text: 'Hello!', timestamp: new Date().toISOString(), type: 'user' },
      { id: 2, text: 'Hi there! How can I help you?', timestamp: new Date().toISOString(), type: 'assistant' }
    ]
  })
})

// Save chat message
router.post('/chat/message', (req, res) => {
  const { text, type } = req.body

  if (!text || !type) {
    return res.status(400).json({ error: 'Text and type are required' })
  }

  const message = {
    id: Date.now(),
    text,
    type,
    timestamp: new Date().toISOString()
  }

  res.json({ success: true, message })
})

// User preferences
router.get('/user/preferences', (req, res) => {
  res.json({
    theme: 'dark',
    language: 'en',
    notifications: true
  })
})

router.put('/user/preferences', (req, res) => {
  const { theme, language, notifications } = req.body

  res.json({
    success: true,
    preferences: { theme, language, notifications }
  })
})

// Generate image endpoint
router.post('/generate-image', async (req, res) => {
  const { prompt } = req.body

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' })
  }

  const geminiKey = process.env.GEMINI_API_KEY

  if (!geminiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY environment variable not set' })
  }

  try {
    const ai = new GoogleGenAI({ apiKey: geminiKey })
    const model = "gemini-2.5-flash-image-preview"
    const contents = [{ text: prompt }]
    const response = await ai.models.generateContent({ model, contents })
    const parts = response.candidates?.[0]?.content?.parts ?? []

    console.log("*** Gemini image generation response parts:", parts.length)

    for (const part of parts) {
      if (part.text) {
        console.log("*** Gemini image generation response:", part.text)
      } else if (part.inlineData) {
        const imageData = part.inlineData.data
        if (!imageData) {
          throw new Error("ERROR: generateContent returned no image data")
        }
        console.log("*** Image generation succeeded")
        return res.json({
          success: true,
          image: `data:image/png;base64,${imageData}`
        })
      }
    }

    // If we get here, no image was found in the response
    throw new Error("No image data found in response")
  } catch (error) {
    console.error("*** Image generation failed", error)
    res.status(500).json({
      error: 'Failed to generate image',
      details: error.message
    })
  }
})

export default router