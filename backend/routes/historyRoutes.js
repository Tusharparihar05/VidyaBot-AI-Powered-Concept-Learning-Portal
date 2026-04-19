const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const History = require('../models/History');

// GET /api/history
router.get('/', protect, async (req, res) => {
  try {
    const filter = { userId: req.user.id };
    if (req.query.subject) {
      filter.subjectTag = req.query.subject;
    }
    const history = await History.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);
    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/history/tags
router.get('/tags', protect, async (req, res) => {
  try {
    const tags = await History.distinct('subjectTag', { userId: req.user.id });
    res.json(tags);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;