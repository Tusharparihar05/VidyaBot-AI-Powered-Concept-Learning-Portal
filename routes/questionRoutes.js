const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');

router.post('/submit', protect, rateLimiter, async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ message: 'Question is required' });
  res.json({
    message: 'received',
    sessionId: `session_${Date.now()}`,
    question
  });
});

module.exports = router;