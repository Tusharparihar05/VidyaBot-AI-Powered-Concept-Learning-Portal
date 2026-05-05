const express = require('express');
const router = express.Router();
const protect = require('../middleware/authMiddleware');
const History = require('../models/History');
const Chat = require('../models/Chat');

// GET /api/analytics/heatmap — daily question counts for last 7 weeks
router.get('/heatmap', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const weeksBack = 7;
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - weeksBack * 7);

    const dailyCounts = await History.aggregate([
      {
        $match: {
          userId: require('mongoose').Types.ObjectId.createFromHexString(userId),
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
    ]);

    const countMap = {};
    dailyCounts.forEach(d => { countMap[d._id] = d.count; });

    const heatmap = [];
    for (let w = 0; w < weeksBack; w++) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() + w * 7 + d);
        const key = date.toISOString().split('T')[0];
        const count = countMap[key] || 0;
        const intensity = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : 3;
        week.push({ date: key, count, intensity });
      }
      heatmap.push(week);
    }

    res.json(heatmap);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/analytics/stats — user stats
router.get('/stats', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const totalQuestions = await History.countDocuments({ userId });
    const totalChats = await Chat.countDocuments({ userId, isArchived: false });
    const subjects = await History.distinct('subjectTag', { userId });

    const subjectCounts = await History.aggregate([
      { $match: { userId: require('mongoose').Types.ObjectId.createFromHexString(userId) } },
      { $group: { _id: '$subjectTag', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const total = subjectCounts.reduce((a, b) => a + b.count, 0) || 1;
    const subjectBreakdown = subjectCounts.map(s => ({
      subject: s._id || 'general',
      count: s.count,
      percent: Math.round((s.count / total) * 100),
    }));

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const weeklyQuestions = await History.countDocuments({
      userId,
      createdAt: { $gte: sevenDaysAgo },
    });

    const weeklyByDay = await History.aggregate([
      {
        $match: {
          userId: require('mongoose').Types.ObjectId.createFromHexString(userId),
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$createdAt' },
          count: { $sum: 1 },
        },
      },
    ]);

    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const weeklyData = dayNames.map((label, i) => {
      const entry = weeklyByDay.find(d => d._id === i + 1);
      return { label, count: entry ? entry.count : 0 };
    });

    res.json({
      totalQuestions,
      totalChats,
      totalSubjects: subjects.length,
      weeklyQuestions,
      subjectBreakdown,
      weeklyData,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
