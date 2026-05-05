const path = require('path');
if (!process.env.PORT) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}

const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const redis = require('../config/redis');
const { submitRenderJob, checkRenderStatus } = require('../api/creatomate');
const Outputs = require('../models/Outputs');
const Session = require('../models/Session');

const REDIS_OPTS = {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
};

const FALLBACK_POLL_DELAY = 90000;

if (mongoose.connection.readyState === 0) {
  const connectDB = require('../config/db');
  connectDB();
}

const worker = new Worker('animation', async (job) => {
  const { sessionId, animationScript } = job.data;
  console.log(`[AnimWorker] Processing job ${job.id} for session ${sessionId}`);

  // Update status to processing
  await Session.findByIdAndUpdate(sessionId, { 'pipelines.animation': 'processing' });
  await Outputs.findOneAndUpdate(
    { sessionId },
    { animationStatus: 'processing' },
    { upsert: true },
  );

  let renderJob;
  try {
    renderJob = await submitRenderJob(animationScript);
  } catch (err) {
    if (err.unrecoverable) {
      console.error(`[AnimWorker] UNRECOVERABLE: ${err.message}`);
      await Outputs.findOneAndUpdate(
        { sessionId },
        { animationStatus: 'failed', $push: { errorLogs: { pipeline: 'animation', message: err.message } } },
      );
      await Session.findByIdAndUpdate(sessionId, { 'pipelines.animation': 'failed' });
      await redis.publish('pipeline-events', JSON.stringify({ sessionId, pipeline: 'animation', status: 'failed', error: err.message }));
      return { error: err.message };
    }
    throw err;
  }
  console.log(`[AnimWorker] Creatomate job submitted: ${renderJob.id} (mock: ${renderJob.mock})`);

  // Store job ID for webhook routing
  await Outputs.findOneAndUpdate(
    { sessionId },
    { animationJobId: renderJob.id },
  );

  if (renderJob.mock) {
    // Mock mode — resolve immediately
    const mockResult = await checkRenderStatus(renderJob.id);
    await markComplete(sessionId, mockResult.url);
    return { url: mockResult.url, mock: true };
  }

  // Store mapping: externalJobId → sessionId (for webhook lookup)
  await redis.setex(`animjob:${renderJob.id}`, 600, sessionId);

  // Defensive fallback: single poll after 90s if webhook hasn't arrived
  await new Promise(r => setTimeout(r, FALLBACK_POLL_DELAY));

  const output = await Outputs.findOne({ sessionId }).lean();
  if (output?.animationStatus === 'done') {
    console.log(`[AnimWorker] Already resolved by webhook for session ${sessionId}`);
    return { url: output.animationUrl, webhook: true };
  }

  // Webhook didn't fire — do one status check
  console.log(`[AnimWorker] No webhook after 90s, checking status...`);
  const status = await checkRenderStatus(renderJob.id);

  if (status.status === 'succeeded' && status.url) {
    await markComplete(sessionId, status.url);
    return { url: status.url, fallback: true };
  }

  // Still not done — let BullMQ retry handle it
  throw new Error(`Animation not ready: status=${status.status}`);
}, {
  ...REDIS_OPTS,
  concurrency: 2,
});

async function markComplete(sessionId, url) {
  await Outputs.findOneAndUpdate(
    { sessionId },
    { animationUrl: url, animationStatus: 'done' },
  );
  await Session.findByIdAndUpdate(sessionId, { 'pipelines.animation': 'done' });
  await updateOverallStatus(sessionId);

  // Publish SSE event
  await redis.publish('pipeline-events', JSON.stringify({
    sessionId, pipeline: 'animation', status: 'done', url,
  }));

  console.log(`[AnimWorker] Animation DONE for session ${sessionId}`);
}

async function updateOverallStatus(sessionId) {
  const session = await Session.findById(sessionId).lean();
  if (!session) return;
  const { text, animation, video } = session.pipelines;
  if (text === 'done' && animation === 'done' && video === 'done') {
    await Session.findByIdAndUpdate(sessionId, { status: 'complete' });
    await Outputs.findOneAndUpdate({ sessionId }, { completedAt: new Date() });
  }
}

worker.on('completed', (job, result) => {
  console.log(`[AnimWorker] Job ${job.id} completed:`, result?.url?.slice(0, 60));
});

worker.on('failed', async (job, err) => {
  console.error(`[AnimWorker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  if (job && job.attemptsMade >= 3) {
    const { sessionId } = job.data;
    await Outputs.findOneAndUpdate(
      { sessionId },
      {
        animationStatus: 'failed',
        $push: { errorLogs: { pipeline: 'animation', message: err.message } },
      },
    );
    await Session.findByIdAndUpdate(sessionId, { 'pipelines.animation': 'failed' });
    await redis.publish('pipeline-events', JSON.stringify({
      sessionId, pipeline: 'animation', status: 'failed', error: err.message,
    }));
  }
});

console.log('[AnimWorker] Animation worker started, waiting for jobs...');
