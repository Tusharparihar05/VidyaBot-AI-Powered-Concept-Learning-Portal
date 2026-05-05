const { Queue } = require('bullmq');

const REDIS_OPTS = {
  connection: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
};

const animationQueue = new Queue('animation', REDIS_OPTS);
const videoQueue = new Queue('video', REDIS_OPTS);

async function enqueueAnimationJob(sessionId, animationScript) {
  const job = await animationQueue.add(
    'render',
    { sessionId: sessionId.toString(), animationScript },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      timeout: 180000,
    },
  );
  console.log(`[Queue] Animation job ${job.id} enqueued for session ${sessionId}`);
  return job;
}

async function enqueueVideoJob(sessionId, videoScript) {
  const job = await videoQueue.add(
    'generate',
    { sessionId: sessionId.toString(), videoScript },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 10000 },
      timeout: 180000,
    },
  );
  console.log(`[Queue] Video job ${job.id} enqueued for session ${sessionId}`);
  return job;
}

module.exports = {
  animationQueue,
  videoQueue,
  enqueueAnimationJob,
  enqueueVideoJob,
};
