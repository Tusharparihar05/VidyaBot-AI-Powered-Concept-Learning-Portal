const path = require('path');
if (!process.env.PORT) {
  require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
}

const { Worker } = require('bullmq');
const mongoose = require('mongoose');
const redis = require('../config/redis');
const { submitVideoJob, checkVideoStatus } = require('../api/heygen');
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

const worker = new Worker('video', async (job) => {
  const { sessionId, videoScript } = job.data;
  console.log(`[VideoWorker] Processing job ${job.id} for session ${sessionId}`);

  // Update status to processing
  await Session.findByIdAndUpdate(sessionId, { 'pipelines.video': 'processing' });
  await Outputs.findOneAndUpdate(
    { sessionId },
    { videoStatus: 'processing' },
    { upsert: true },
  );

  // Submit to HeyGen
  const videoJob = await submitVideoJob(videoScript);
  console.log(`[VideoWorker] HeyGen job submitted: ${videoJob.id} (mock: ${videoJob.mock})`);

  // Store job ID for webhook routing
  await Outputs.findOneAndUpdate(
    { sessionId },
    { videoJobId: videoJob.id },
  );

  if (videoJob.mock) {
    const mockResult = await checkVideoStatus(videoJob.id);
    await markComplete(sessionId, mockResult.url);
    return { url: mockResult.url, mock: true };
  }

  // Store mapping: externalJobId → sessionId (for webhook lookup)
  await redis.setex(`videojob:${videoJob.id}`, 600, sessionId);

  // Defensive fallback: single poll after 90s if webhook hasn't arrived
  await new Promise(r => setTimeout(r, FALLBACK_POLL_DELAY));

  const output = await Outputs.findOne({ sessionId }).lean();
  if (output?.videoStatus === 'done') {
    console.log(`[VideoWorker] Already resolved by webhook for session ${sessionId}`);
    return { url: output.videoUrl, webhook: true };
  }

  // Webhook didn't fire — do one status check
  console.log(`[VideoWorker] No webhook after 90s, checking status...`);
  const status = await checkVideoStatus(videoJob.id);

  if ((status.status === 'completed' || status.status === 'success') && status.url) {
    await markComplete(sessionId, status.url);
    return { url: status.url, fallback: true };
  }

  throw new Error(`Video not ready: status=${status.status}`);
}, {
  ...REDIS_OPTS,
  concurrency: 2,
});

async function markComplete(sessionId, url) {
  await Outputs.findOneAndUpdate(
    { sessionId },
    { videoUrl: url, videoStatus: 'done' },
  );
  await Session.findByIdAndUpdate(sessionId, { 'pipelines.video': 'done' });
  await updateOverallStatus(sessionId);

  await redis.publish('pipeline-events', JSON.stringify({
    sessionId, pipeline: 'video', status: 'done', url,
  }));

  console.log(`[VideoWorker] Video DONE for session ${sessionId}`);
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
  console.log(`[VideoWorker] Job ${job.id} completed:`, result?.url?.slice(0, 60));
});

worker.on('failed', async (job, err) => {
  console.error(`[VideoWorker] Job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  if (job && job.attemptsMade >= 3) {
    const { sessionId } = job.data;
    await Outputs.findOneAndUpdate(
      { sessionId },
      {
        videoStatus: 'failed',
        $push: { errorLogs: { pipeline: 'video', message: err.message } },
      },
    );
    await Session.findByIdAndUpdate(sessionId, { 'pipelines.video': 'failed' });
    await redis.publish('pipeline-events', JSON.stringify({
      sessionId, pipeline: 'video', status: 'failed', error: err.message,
    }));
  }
});

console.log('[VideoWorker] Video worker started, waiting for jobs...');
