const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  userId:         { type: String, required: true, index: true },
  rawQuestion:    { type: String, required: true },
  refinedPrompt:  { type: String },
  textAnswer:     { type: String },
  animationUrl:   { type: String },
  avatarVideoUrl: { type: String },
  subjectTag:     { type: String, index: true },
  createdAt:      { type: Date, default: Date.now, index: true }
});
HistorySchema.index({ userId: 1, createdAt: -1 });
module.exports = mongoose.model('History', HistorySchema);