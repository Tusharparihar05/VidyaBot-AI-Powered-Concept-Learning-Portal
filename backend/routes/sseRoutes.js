const express = require('express');
const router = express.Router();
const Redis = require('ioredis');
const protect = require('../middleware/authMiddleware');

/**
 * SSE endpoint: GET /api/events/:sessionId
 * Frontend connects and receives real-time pipeline updates.
 * Uses Redis pub/sub — workers/webhooks publish events, this route streams them.
 */
router.get('/:sessionId', protect, (req, res) => {
  const { sessionId } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);

  // Dedicated subscriber (can't reuse the main redis client for sub)
  const subscriber = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

  subscriber.subscribe('pipeline-events', (err) => {
    if (err) console.error('[SSE] Subscribe error:', err.message);
  });

  subscriber.on('message', (_channel, message) => {
    try {
      const event = JSON.parse(message);
      if (event.sessionId === sessionId) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);

        // Auto-close when both pipelines resolve
        if (event.pipeline === 'video' || event.pipeline === 'animation') {
          // Client can close after receiving both 'done' events
        }
      }
    } catch {
      // Ignore malformed messages
    }
  });

  // Clean up on disconnect
  req.on('close', () => {
    subscriber.unsubscribe('pipeline-events');
    subscriber.quit();
  });
});

module.exports = router;
