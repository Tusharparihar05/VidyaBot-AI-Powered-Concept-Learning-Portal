const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/refine', protect, async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ message: 'Question is required' });
  }

  // Phase 1: still returning static stub
  // Phase 2: we will make the real Gemini call below
  res.json({
    refinedPrompt: `Explain "${question}" for a Class 10 student. Include: a clear definition, a real-world analogy, 3 key points, and a simple data example for visualization.`
  });
});

module.exports = router;