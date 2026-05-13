const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const redis = require('../config/redis');
const { getDailyQuestionLimit } = require('../config/dailyQuestionLimit');

// GET /api/profile/rate-limit — remaining questions today (same Redis key as rateLimiter)
router.get('/rate-limit', protect, async (req, res) => {
  try {
    const limit = getDailyQuestionLimit();
    const today = new Date().toISOString().split('T')[0];
    const key = `ratelimit:${req.user.id}:${today}`;
    const raw = await redis.get(key);
    const used = Math.max(0, parseInt(raw, 10) || 0);
    const remaining = Math.max(0, limit - used);
    const resetAt = new Date(`${today}T23:59:59.999Z`).toISOString();
    res.json({ limit, used, remaining, resetAt });
  } catch {
    const limit = getDailyQuestionLimit();
    res.json({ limit, used: 0, remaining: limit, resetAt: null });
  }
});

// GET /api/profile — get current user profile
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password').lean();
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/profile — update profile fields
router.patch('/', protect, async (req, res) => {
  try {
    const allowed = ['name', 'institutionType', 'institutionName', 'gradeYear'];
    const updates = {};
    allowed.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true })
      .select('-password')
      .lean();

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /api/profile/password — change password
router.patch('/password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Both current and new password required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
