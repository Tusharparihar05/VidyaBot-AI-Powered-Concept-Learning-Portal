const express = require('express');
const router = express.Router();

router.get('/:sessionId', (req, res) => {
  res.json({ sessionId: req.params.sessionId, status: 'pending' });
});

module.exports = router;