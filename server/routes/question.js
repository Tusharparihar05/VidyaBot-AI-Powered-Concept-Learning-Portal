const express = require('express');
const router = express.Router();
const rateLimiter = require('../middleware/rateLimiter');

router.post('/', rateLimiter, (req, res) => {
  res.json({ message: 'Question received', question: req.body.question });
});

module.exports = router;