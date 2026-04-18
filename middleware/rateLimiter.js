const redis = require('../config/redis');

const rateLimiter = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.ip;
    const today = new Date().toISOString().split('T')[0];
    const key = `ratelimit:${userId}:${today}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, 86400);
    }
    if (count > 10) {
      return res.status(429).json({
        error: 'Daily limit reached. Max 10 requests per day.'
      });
    }
    next();
  } catch (err) {
    // Redis offline — allow request to pass through
    next();
  }
};

module.exports = rateLimiter;