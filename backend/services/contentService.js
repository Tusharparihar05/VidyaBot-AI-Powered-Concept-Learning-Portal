const crypto = require('crypto');
const redis = require('../config/redis');
const Content = require('../models/Content');

const CACHE_TTL = 60 * 60 * 24; // 24 hours
const CACHE_PREFIX = 'content:';

function hashPrompt(text) {
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

function buildCacheKey(hash) {
  return `${CACHE_PREFIX}${hash}`;
}

/**
 * Check Redis cache for a previously generated response.
 * Returns parsed object or null.
 */
async function checkRedisCache(promptHash) {
  try {
    const cached = await redis.get(buildCacheKey(promptHash));
    if (cached) {
      console.log('[Cache] Redis HIT for', promptHash.slice(0, 12));
      return JSON.parse(cached);
    }
  } catch (err) {
    console.warn('[Cache] Redis read error:', err.message);
  }
  return null;
}

/**
 * Check MongoDB content collection for a previously stored response.
 * Returns document or null. Also backfills Redis cache on hit.
 */
async function checkMongoContent(promptHash) {
  try {
    const doc = await Content.findOne({ promptHash }).lean();
    if (doc) {
      console.log('[Cache] Mongo HIT for', promptHash.slice(0, 12));

      await Content.updateOne({ promptHash }, { $inc: { usageCount: 1 } });

      const payload = {
        explanation: doc.explanation,
        keyPoints: doc.keyPoints,
        chartData: doc.chartData,
        animationScript: doc.animationScript,
        videoScript: doc.videoScript,
        subjectTag: doc.subjectTag,
        difficultyLevel: doc.difficultyLevel,
        questionCategory: doc.questionCategory,
        whiteboardScript: doc.whiteboardScript,
      };

      try {
        await redis.setex(buildCacheKey(promptHash), CACHE_TTL, JSON.stringify(payload));
      } catch (err) {
        console.warn('[Cache] Redis backfill error:', err.message);
      }

      return payload;
    }
  } catch (err) {
    console.warn('[Cache] Mongo read error:', err.message);
  }
  return null;
}

/**
 * Save generated content to both MongoDB and Redis.
 * One cache entry (Mongo + Redis key via buildCacheKey) holds explanation, chartData,
 * whiteboardScript, etc., so the whiteboard player can draw the same bar chart as the chat card.
 */
async function saveContent(promptHash, refinedPrompt, parsed) {
  try {
    await Content.create({
      promptHash,
      refinedPrompt,
      explanation: parsed.explanation,
      keyPoints: parsed.keyPoints,
      chartData: parsed.chartData,
      animationScript: parsed.animationScript,
      videoScript: parsed.videoScript,
      subjectTag: parsed.subjectTag,
      difficultyLevel: parsed.difficultyLevel,
      questionCategory: parsed.questionCategory,
      whiteboardScript: parsed.whiteboardScript,
    });
    console.log('[Store] Saved to Mongo content collection');
  } catch (err) {
    if (err.code === 11000) {
      console.log('[Store] Duplicate — already exists in Mongo');
    } else {
      console.error('[Store] Mongo save error:', err.message);
    }
  }

  try {
    const payload = {
      explanation: parsed.explanation,
      keyPoints: parsed.keyPoints,
      chartData: parsed.chartData,
      animationScript: parsed.animationScript,
      videoScript: parsed.videoScript,
      subjectTag: parsed.subjectTag,
      difficultyLevel: parsed.difficultyLevel,
      questionCategory: parsed.questionCategory,
      whiteboardScript: parsed.whiteboardScript,
    };
    await redis.setex(buildCacheKey(promptHash), CACHE_TTL, JSON.stringify(payload));
    console.log('[Store] Cached in Redis (TTL 24h)');
  } catch (err) {
    console.warn('[Store] Redis cache error:', err.message);
  }
}

module.exports = {
  hashPrompt,
  checkRedisCache,
  checkMongoContent,
  saveContent,
};
