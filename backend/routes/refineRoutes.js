const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const { refinePrompt } = require('../services/nvidiaService');

router.post('/', protect, async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ message: 'Question is required' });
  }

  const grade = req.user.grade || 'Class 10';

  try {
    const refined = await refinePrompt(question, grade);
    res.json({ refinedPrompt: refined, grade });
  } catch (err) {
    console.error('Refine error:', err.message);

    const fallback = `Explain "${question}" for a ${grade} student. Include: a clear definition, a real-world analogy, 4 key points, data for a chart, a 5-7 slide animation script, and a 60-second teacher script.`;
    res.json({ refinedPrompt: fallback, grade, fallback: true });
  }
});

module.exports = router;
