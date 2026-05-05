const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'assistant'],
    required: true,
  },
  content: { type: String, required: true },

  // Assistant-only fields
  keyPoints: { type: [String], default: undefined },
  chartData: {
    type: {
      type: String,
      default: 'bar',
    },
    title: String,
    labels: [String],
    values: [Number],
  },
  animationScript: [{
    slide: Number,
    title: String,
    bullets: [String],
  }],
  videoScript: { type: String, default: undefined },
  subjectTag: { type: String, default: undefined },
  difficultyLevel: { type: String, default: undefined },
  cached: { type: Boolean, default: undefined },
  promptHash: { type: String, default: undefined },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    default: undefined,
  },

  createdAt: { type: Date, default: Date.now },
});

messageSchema.index({ chatId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
