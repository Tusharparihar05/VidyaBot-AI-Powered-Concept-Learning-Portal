const crypto = require('crypto');
const redis = require('../config/redis');
const Content = require('../models/Content');
const { getStructuredAnswer } = require('./nvidiaService');
const { parseStructuredResponse } = require('./responseParser');

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
    };
    await redis.setex(buildCacheKey(promptHash), CACHE_TTL, JSON.stringify(payload));
    console.log('[Store] Cached in Redis (TTL 24h)');
  } catch (err) {
    console.warn('[Store] Redis cache error:', err.message);
  }
}

/**
 * Generate content for a cache miss.
 * Cache checks are done in questionRoutes BEFORE calling this.
 * @param {string} refinedPrompt - The LLM-refined prompt (for quality)
 * @param {string} grade - Student grade level
 * @param {string} promptHash - Hash of the RAW question (for dedup keying)
 * @param {Array} conversationHistory - Optional multi-turn message history
 */
async function getOrGenerateContent(refinedPrompt, grade, promptHash, conversationHistory = []) {
  console.log('[LLM] Cache MISS — calling NVIDIA NIM...');
  const rawResponse = await getStructuredAnswer(refinedPrompt, grade, conversationHistory);
  const parsed = parseStructuredResponse(
    typeof rawResponse === 'string' ? rawResponse : JSON.stringify(rawResponse),
  );

  if (parsed.parseError) {
    console.warn('[LLM] First response had parse error, retrying...');
    try {
      const retryRaw = await getStructuredAnswer(
        refinedPrompt + '\n\nIMPORTANT: Your previous response was not valid JSON. Reply with ONLY a valid JSON object.',
        grade,
        conversationHistory,
      );
      const retryParsed = parseStructuredResponse(
        typeof retryRaw === 'string' ? retryRaw : JSON.stringify(retryRaw),
      );
      if (!retryParsed.parseError) {
        if (conversationHistory.length === 0) {
          await saveContent(promptHash, refinedPrompt, retryParsed);
        }
        return { data: retryParsed, cached: false, promptHash };
      }
    } catch (retryErr) {
      console.error('[LLM] Retry also failed:', retryErr.message);
    }
  }

  if (!parsed.parseError) {
    if (conversationHistory.length === 0) {
      await saveContent(promptHash, refinedPrompt, parsed);
    }
  }

  return { data: parsed, cached: false, promptHash };
}

module.exports = {
  hashPrompt,
  getOrGenerateContent,
  checkRedisCache,
  checkMongoContent,
  saveContent,
};
