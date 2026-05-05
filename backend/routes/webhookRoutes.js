const express = require('express');
const router = express.Router();
const redis = require('../config/redis');
const Outputs = require('../models/Outputs');
const Session = require('../models/Session');

/**
 * Creatomate sends a POST when a render completes or fails.
 * Payload: { id, status, url, ... }
 */
router.post('/creatomate', async (req, res) => {
  const { id, status, url } = req.body;
  console.log(`[Webhook] Creatomate callback: job=${id} status=${status}`);

  try {
    const sessionId = await redis.get(`animjob:${id}`);
    if (!sessionId) {
      console.warn(`[Webhook] No session mapping for Creatomate job ${id}`);
      return res.sendStatus(200);
    }

    if (status === 'succeeded' && url) {
      await Outputs.findOneAndUpdate(
        { sessionId },
        { animationUrl: url, animationStatus: 'done' },
      );
      await Session.findByIdAndUpdate(sessionId, { 'pipelines.animation': 'done' });
      await checkAndCompleteSession(sessionId);

      await redis.publish('pipeline-events', JSON.stringify({
        sessionId, pipeline: 'animation', status: 'done', url,
      }));

      await redis.del(`animjob:${id}`);
      console.log(`[Webhook] Animation resolved for session ${sessionId}`);
    } else if (status === 'failed') {
      await Outputs.findOneAndUpdate(
        { sessionId },
        {
          animationStatus: 'failed',
          $push: { errorLogs: { pipeline: 'animation', message: `Creatomate: ${status}` } },
        },
      );
      await Session.findByIdAndUpdate(sessionId, { 'pipelines.animation': 'failed' });

      await redis.publish('pipeline-events', JSON.stringify({
        sessionId, pipeline: 'animation', status: 'failed',
      }));
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[Webhook] Creatomate handler error:', err.message);
    res.sendStatus(500);
  }
});

/**
 * HeyGen sends a POST when a video completes.
 * Payload varies — common: { event_type, event_data: { video_id, status, url } }
 */
router.post('/heygen', async (req, res) => {
  const eventData = req.body.event_data || req.body;
  const videoId = eventData.video_id || eventData.id;
  const status = eventData.status;
  const url = eventData.video_url || eventData.url;

  console.log(`[Webhook] HeyGen callback: video=${videoId} status=${status}`);

  try {
    const sessionId = await redis.get(`videojob:${videoId}`);
    if (!sessionId) {
      console.warn(`[Webhook] No session mapping for HeyGen video ${videoId}`);
      return res.sendStatus(200);
    }

    if ((status === 'completed' || status === 'success') && url) {
      await Outputs.findOneAndUpdate(
        { sessionId },
        { videoUrl: url, videoStatus: 'done' },
      );
      await Session.findByIdAndUpdate(sessionId, { 'pipelines.video': 'done' });
      await checkAndCompleteSession(sessionId);

      await redis.publish('pipeline-events', JSON.stringify({
        sessionId, pipeline: 'video', status: 'done', url,
      }));

      await redis.del(`videojob:${videoId}`);
      console.log(`[Webhook] Video resolved for session ${sessionId}`);
    } else if (status === 'failed' || status === 'error') {
      await Outputs.findOneAndUpdate(
        { sessionId },
        {
          videoStatus: 'failed',
          $push: { errorLogs: { pipeline: 'video', message: `HeyGen: ${status}` } },
        },
      );
      await Session.findByIdAndUpdate(sessionId, { 'pipelines.video': 'failed' });

      await redis.publish('pipeline-events', JSON.stringify({
        sessionId, pipeline: 'video', status: 'failed',
      }));
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[Webhook] HeyGen handler error:', err.message);
    res.sendStatus(500);
  }
});

async function checkAndCompleteSession(sessionId) {
  const session = await Session.findById(sessionId).lean();
  if (!session) return;
  const { text, animation, video } = session.pipelines;
  if (text === 'done' && animation === 'done' && video === 'done') {
    await Session.findByIdAndUpdate(sessionId, { status: 'complete' });
    await Outputs.findOneAndUpdate({ sessionId }, { completedAt: new Date() });
  }
}

module.exports = router;
