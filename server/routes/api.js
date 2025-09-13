import express from 'express'
import dotenv from 'dotenv'
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

    const data = await response.json()
    console.log('Generated ephemeral key:', data.value)

    res.json({
      success: true,
      message: 'Session started',
      ephemeralKey: data.value
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

export default router