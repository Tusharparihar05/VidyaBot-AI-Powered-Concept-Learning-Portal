const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const Session = require('../models/Session');
const Outputs = require('../models/Outputs');

router.get('/:sessionId', protect, async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId).lean();

    if (!session) {
      return res.status(404).json({ message: 'Session not found' });
    }

    if (session.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const output = await Outputs.findOne({ sessionId: session._id }).lean();

    res.json({
      sessionId: session._id,
      status: session.status,
      text: session.pipelines.text,
      animation: session.pipelines.animation,
      video: session.pipelines.video,
      animationUrl: output?.animationUrl || null,
      videoUrl: output?.videoUrl || null,
      cachedHit: session.cachedHit,
    });
  } catch (err) {
    console.error('Status check error:', err.message);
    res.status(500).json({ message: 'Error checking status' });
  }
});

module.exports = router;
