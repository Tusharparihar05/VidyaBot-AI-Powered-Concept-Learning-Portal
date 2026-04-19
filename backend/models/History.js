const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rawQuestion:    { type: String, required: true },
  refinedPrompt:  { type: String, default: '' },
  textAnswer:     { type: String, default: '' },
  animationUrl:   { type: String, default: '' },
  avatarVideoUrl: { type: String, default: '' },
  subjectTag:     { type: String, default: 'general' },
  createdAt:      { type: Date, default: Date.now }
});

historySchema.index({ userId: 1, createdAt: -1 });
historySchema.index({ subjectTag: 1 });

module.exports = mongoose.model('History', historySchema);