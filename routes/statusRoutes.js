const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');

router.get('/:sessionId', protect, (req, res) => {
  res.json({
    sessionId: req.params.sessionId,
    text:      'pending',
    animation: 'pending',
    video:     'pending'
  });
});

module.exports = router;