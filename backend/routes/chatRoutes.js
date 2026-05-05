const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const rateLimiter = require('../middleware/rateLimiter');
const Chat = require('../models/Chat');
const Message = require('../models/Message');
const Session = require('../models/Session');
const History = require('../models/History');
const redis = require('../config/redis');
const { streamExplanation, getMetadata } = require('../services/nvidiaService');
const { hashPrompt, checkRedisCache, checkMongoContent, saveContent } = require('../services/contentService');
const { parseStructuredResponse } = require('../services/responseParser');
const { enqueueAnimationJob, enqueueVideoJob } = require('../queues/setup');
const Outputs = require('../models/Outputs');

const CONV_CACHE_PREFIX = 'conv:';
const CONV_CACHE_TTL = 60 * 60 * 2;
const MAX_CONTEXT_MESSAGES = 10;

async function getConversationContext(chatId) {
  const cacheKey = `${CONV_CACHE_PREFIX}${chatId}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  const messages = await Message.find({ chatId })
    .sort({ createdAt: -1 })
    .limit(MAX_CONTEXT_MESSAGES)
    .lean();

  const context = messages.reverse().map(m => ({
    role: m.role,
    content: m.role === 'user' ? m.content : m.content.slice(0, 500),
  }));

  try {
    await redis.setex(cacheKey, CONV_CACHE_TTL, JSON.stringify(context));
  } catch {}

  return context;
}

async function updateConversationCache(chatId, newMessages) {
  const cacheKey = `${CONV_CACHE_PREFIX}${chatId}`;
  try {
    let context = [];
    const cached = await redis.get(cacheKey);
    if (cached) context = JSON.parse(cached);

    context.push(...newMessages);
    if (context.length > MAX_CONTEXT_MESSAGES) {
      context = context.slice(-MAX_CONTEXT_MESSAGES);
    }

    await redis.setex(cacheKey, CONV_CACHE_TTL, JSON.stringify(context));
  } catch {}
}

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function enqueuePipelines(sessionId, _data) {
  Outputs.create({ sessionId }).catch(() => {});
  // Animation slides are rendered client-side as an interactive deck — no Creatomate needed.
  // HeyGen video pipeline is disabled for now.
  // To re-enable: uncomment the enqueueAnimationJob / enqueueVideoJob calls below.
  //
  // const animScript = _data.animationScript;
  // const vidScript = _data.videoScript;
  // if (animScript && animScript.length > 0) {
  //   enqueueAnimationJob(sessionId, animScript).catch(err =>
  //     console.error('[Queue] Animation enqueue failed:', err.message));
  // }
  // if (vidScript && vidScript.length > 0) {
  //   enqueueVideoJob(sessionId, vidScript).catch(err =>
  //     console.error('[Queue] Video enqueue failed:', err.message));
  // }
}

// GET /api/chats — list user's chats
router.get('/', protect, async (req, res) => {
  try {
    const chats = await Chat.find({
      userId: req.user.id,
      isArchived: false,
    })
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();
    res.json(chats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/chats — create a new chat
router.post('/', protect, async (req, res) => {
  try {
    const chat = await Chat.create({ userId: req.user.id });
    res.status(201).json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/chats/:chatId/messages — get messages for a chat
router.get('/:chatId/messages', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId).lean();
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const messages = await Message.find({ chatId: req.params.chatId })
      .sort({ createdAt: 1 })
      .lean();
    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/chats/:chatId/messages — SSE streaming endpoint
router.post('/:chatId/messages', protect, rateLimiter, async (req, res) => {
  const { question } = req.body;
  if (!question) return res.status(400).json({ message: 'Question is required' });

  const userId = req.user.id;
  const grade = req.user.grade || 'Class 10';
  const chatId = req.params.chatId;

  try {
    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Set up SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    let aborted = false;
    req.on('close', () => { aborted = true; });

    // Save user message
    const userMsg = await Message.create({
      chatId,
      role: 'user',
      content: question,
    });
    sendSSE(res, { type: 'user_saved', message: userMsg.toObject() });

    const promptHash = hashPrompt(question);
    console.log(`\n── Chat Stream ──`);
    console.log(`Chat: ${chatId} | User: ${userId}`);
    console.log(`Question: ${question}`);

    // Check cache (only for first messages with no conversation context)
    const conversationContext = await getConversationContext(chatId);
    const hasContext = conversationContext.length > 0;

    let explanation = '';
    let metadata = null;
    let cached = false;

    if (!hasContext) {
      const redisCached = await checkRedisCache(promptHash);
      if (redisCached) {
        explanation = redisCached.explanation;
        metadata = redisCached;
        cached = true;
        console.log('CACHE HIT (Redis)');
      }
      if (!explanation) {
        const mongoCached = await checkMongoContent(promptHash);
        if (mongoCached) {
          explanation = mongoCached.explanation;
          metadata = mongoCached;
          cached = true;
          console.log('CACHE HIT (Mongo)');
        }
      }
    }

    if (cached && explanation) {
      // Stream cached explanation token-by-token (fast replay)
      const words = explanation.split(/(\s+)/);
      for (const word of words) {
        if (aborted) break;
        sendSSE(res, { type: 'token', content: word });
      }
      sendSSE(res, { type: 'metadata', ...metadata });
    } else {
      // Parallel: stream explanation + fetch metadata
      const llmHistory = conversationContext.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const metadataPromise = getMetadata(question, grade).catch(err => {
        console.error('[Metadata] Failed:', err.message);
        return null;
      });

      const chunks = [];
      try {
        for await (const token of streamExplanation(question, grade, llmHistory)) {
          if (aborted) break;
          chunks.push(token);
          sendSSE(res, { type: 'token', content: token });
        }
      } catch (err) {
        console.error('[Stream] Explanation failed:', err.message);
        sendSSE(res, { type: 'error', message: 'Failed to generate explanation. Please try again.' });
        res.end();
        return;
      }

      explanation = chunks.join('');

      // Parse metadata
      const rawMeta = await metadataPromise;
      if (rawMeta) {
        try {
          const parsed = parseStructuredResponse(
            typeof rawMeta === 'string' ? rawMeta : JSON.stringify(rawMeta)
          );
          metadata = {
            keyPoints: parsed.keyPoints,
            chartData: parsed.chartData,
            animationScript: parsed.animationScript,
            videoScript: parsed.videoScript,
            subjectTag: parsed.subjectTag,
            difficultyLevel: parsed.difficultyLevel,
          };
        } catch {
          metadata = { keyPoints: [], chartData: null, animationScript: [], videoScript: '', subjectTag: 'general', difficultyLevel: 'medium' };
        }
      } else {
        metadata = { keyPoints: [], chartData: null, animationScript: [], videoScript: '', subjectTag: 'general', difficultyLevel: 'medium' };
      }

      sendSSE(res, { type: 'metadata', ...metadata });

      // Cache standalone questions for future reuse
      if (!hasContext && explanation.length > 50) {
        const cachePayload = { explanation, ...metadata };
        saveContent(promptHash, question, cachePayload).catch(() => {});
      }

      console.log('Streamed from LLM | Subject:', metadata.subjectTag);
    }

    if (aborted) { res.end(); return; }

    // Save session + assistant message
    const session = await Session.create({
      userId, rawQuestion: question, promptHash,
      status: 'partial', cachedHit: cached,
      pipelines: { text: 'done', animation: 'pending', video: 'pending' },
    });

    const assistantMsg = await Message.create({
      chatId,
      role: 'assistant',
      content: explanation,
      keyPoints: metadata.keyPoints,
      chartData: metadata.chartData,
      animationScript: metadata.animationScript,
      videoScript: metadata.videoScript,
      subjectTag: metadata.subjectTag,
      difficultyLevel: metadata.difficultyLevel,
      cached,
      promptHash,
      sessionId: session._id,
    });

    await updateConversationCache(chatId, [
      { role: 'user', content: question },
      { role: 'assistant', content: explanation.slice(0, 500) },
    ]);

    const isFirstMessage = chat.messageCount === 0;
    await Chat.findByIdAndUpdate(chatId, {
      $inc: { messageCount: 2 },
      lastMessageAt: new Date(),
      ...(isFirstMessage ? {
        title: question.slice(0, 60),
        subjectTag: metadata.subjectTag,
      } : {}),
    });

    try {
      await History.create({
        userId, rawQuestion: question,
        refinedPrompt: cached ? '(cached)' : '(streamed)',
        textAnswer: explanation,
        subjectTag: metadata.subjectTag,
      });
    } catch {}

    sendSSE(res, {
      type: 'done',
      message: assistantMsg.toObject(),
      sessionId: session._id,
      cached,
    });

    res.end();

    enqueuePipelines(session._id, metadata);

  } catch (err) {
    console.error('Chat stream error:', err.message);
    try {
      sendSSE(res, { type: 'error', message: 'Something went wrong. Please try again.' });
      res.end();
    } catch {}
  }
});

// DELETE /api/chats/:chatId — archive a chat
router.delete('/:chatId', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Chat.findByIdAndUpdate(req.params.chatId, { isArchived: true });
    try {
      await redis.del(`${CONV_CACHE_PREFIX}${req.params.chatId}`);
    } catch {}

    res.json({ message: 'Chat archived' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/chats/:chatId — rename a chat
router.patch('/:chatId', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ message: 'Chat not found' });
    if (chat.userId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (req.body.title) chat.title = req.body.title;
    await chat.save();
    res.json(chat);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
