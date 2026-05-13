const redis = require('../config/redis');
const { getDailyQuestionLimit } = require('../config/dailyQuestionLimit');

const rateLimiter = async (req, res, next) => {
  try {
    const limit = getDailyQuestionLimit();
    const userId = req.user?.id || req.ip;
    const today = new Date().toISOString().split('T')[0];
    const key = `ratelimit:${userId}:${today}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 86400);
    }    if (count > limit) {
      return res.status(429).json({
        error: `Daily question limit reached (${limit} per day). Try again tomorrow.`,
      });
    }
    next();
  } catch (err) {
    // Redis offline — allow request to pass through
    next();
  }
};

module.exports = rateLimiter;