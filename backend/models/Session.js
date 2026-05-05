const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rawQuestion:    { type: String, required: true },
  promptHash:     { type: String, required: true, index: true },
  status: {
    type: String,
    enum: ['processing', 'partial', 'complete', 'failed'],
    default: 'processing',
  },
  pipelines: {
    text:      { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending' },
    animation: { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending' },
    video:     { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending' },
  },
  cachedHit: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

sessionSchema.index({ userId: 1, createdAt: -1 });

sessionSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Session', sessionSchema);
