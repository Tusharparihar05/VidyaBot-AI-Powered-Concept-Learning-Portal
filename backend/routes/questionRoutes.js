const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const { refinePrompt } = require('../services/nvidiaService');
const { getOrGenerateContent, hashPrompt, checkRedisCache, checkMongoContent } = require('../services/contentService');
const { enqueueAnimationJob, enqueueVideoJob } = require('../queues/setup');
const Session = require('../models/Session');
const Outputs = require('../models/Outputs');
const History = require('../models/History');

function enqueuePipelines(sessionId, data) {
  const animScript = data.animationScript;
  const vidScript = data.videoScript;

  Outputs.create({ sessionId }).catch(() => {});

  if (animScript && animScript.length > 0) {
    enqueueAnimationJob(sessionId, animScript).catch(err =>
      console.error('[Queue] Animation enqueue failed:', err.message));
  }
  if (vidScript && vidScript.length > 0) {
    enqueueVideoJob(sessionId, vidScript).catch(err =>
      console.error('[Queue] Video enqueue failed:', err.message));
  }
}

router.post('/submit', protect, rateLimiter, async (req, res) => {
  const { question } = req.body;

  if (!question) {
    return res.status(400).json({ message: 'Question is required' });
  }

  const grade = req.user.grade || 'Class 10';
  const userId = req.user.id;
  const promptHash = hashPrompt(question);

  console.log(`\n── New Question ──`);
  console.log(`User: ${userId} | Grade: ${grade}`);
  console.log(`Question: ${question}`);
  console.log(`Hash: ${promptHash.slice(0, 12)}...`);

  try {
    // Step 1: Check cache BEFORE any LLM call (saves both refine + answer calls)
    const redisCached = await checkRedisCache(promptHash);
    if (redisCached) {
      const session = await Session.create({
        userId, rawQuestion: question, promptHash,
        status: 'partial', cachedHit: true,
        pipelines: { text: 'done', animation: 'pending', video: 'pending' },
      });

      try {
        await History.create({ userId, rawQuestion: question, refinedPrompt: '(cached)', textAnswer: redisCached.explanation, subjectTag: redisCached.subjectTag });
      } catch (e) { /* non-critical */ }

      console.log('CACHE HIT (Redis) — zero LLM cost');
      res.json({
        success: true, sessionId: session._id, cached: true,
        rawQuestion: question, grade, refinedPrompt: '(cached)',
        ...redisCached, animationUrl: null, avatarVideoUrl: null,
      });
      enqueuePipelines(session._id, redisCached);
      return;
    }

    const mongoCached = await checkMongoContent(promptHash);
    if (mongoCached) {
      const session = await Session.create({
        userId, rawQuestion: question, promptHash,
        status: 'partial', cachedHit: true,
        pipelines: { text: 'done', animation: 'pending', video: 'pending' },
      });

      try {
        await History.create({ userId, rawQuestion: question, refinedPrompt: '(cached)', textAnswer: mongoCached.explanation, subjectTag: mongoCached.subjectTag });
      } catch (e) { /* non-critical */ }

      console.log('CACHE HIT (Mongo) — zero LLM cost');
      res.json({
        success: true, sessionId: session._id, cached: true,
        rawQuestion: question, grade, refinedPrompt: '(cached)',
        ...mongoCached, animationUrl: null, avatarVideoUrl: null,
      });
      enqueuePipelines(session._id, mongoCached);
      return;
    }

    // Step 2: Cache miss — refine the question
    console.log('\nStep 1: Refining question...');
    let refined;
    try {
      refined = await refinePrompt(question, grade);
      console.log('Refined successfully');
    } catch (err) {
      console.error('Refine failed:', err.message);
      refined = `Explain "${question}" for a ${grade} student with definition, analogy, 4 key points, chart data, animation script, and video script.`;
    }

    // Step 3: Create session
    const session = await Session.create({
      userId, rawQuestion: question, promptHash,
      status: 'processing',
      pipelines: { text: 'processing', animation: 'pending', video: 'pending' },
    });
    console.log('Session created:', session._id);

    // Step 4: Generate content (uses refined prompt for quality, but keyed by raw question hash)
    console.log('\nStep 2: Getting structured answer...');
    let result;
    try {
      result = await getOrGenerateContent(refined, grade, promptHash);
      console.log('Generated fresh from LLM');
      console.log('Subject:', result.data.subjectTag);
    } catch (err) {
      console.error('Content generation failed:', err.message);

      result = {
        data: {
          explanation: `We couldn't generate a full answer for "${question}" right now. Please try again.`,
          keyPoints: ['Service is temporarily unavailable', 'Please try again shortly', 'Your question has been noted', 'Contact support if this persists'],
          chartData: null, animationScript: [], videoScript: '',
          subjectTag: 'general', difficultyLevel: 'medium',
        },
        cached: false,
      };

      await Session.findByIdAndUpdate(session._id, { status: 'failed', 'pipelines.text': 'failed' });
    }

    // Step 5: Update session
    await Session.findByIdAndUpdate(session._id, { status: 'partial', 'pipelines.text': 'done' });

    // Step 6: Save to history
    try {
      await History.create({ userId, rawQuestion: question, refinedPrompt: refined, textAnswer: result.data.explanation, subjectTag: result.data.subjectTag });
    } catch (err) {
      console.error('History save error:', err.message);
    }

    // Step 7: Return text immediately, enqueue async pipelines
    res.json({
      success: true, sessionId: session._id, cached: false,
      rawQuestion: question, grade, refinedPrompt: refined,
      explanation: result.data.explanation,
      keyPoints: result.data.keyPoints,
      chartData: result.data.chartData,
      animationScript: result.data.animationScript || [],
      videoScript: result.data.videoScript || '',
      subjectTag: result.data.subjectTag,
      difficultyLevel: result.data.difficultyLevel || 'medium',
      animationUrl: null, avatarVideoUrl: null,
    });

    // Enqueue animation + video jobs AFTER response (non-blocking)
    enqueuePipelines(session._id, result.data);

  } catch (err) {
    console.error('Pipeline error:', err.message);
    res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
  }
});

module.exports = router;
