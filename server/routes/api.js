import express from 'express'

const router = express.Router()

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