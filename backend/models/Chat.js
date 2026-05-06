const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: { type: String, default: 'New Chat' },
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatFolder',
    default: null,
  },
  subjectTag: { type: String, default: 'general' },
  messageCount: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: Date.now },
  isArchived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

chatSchema.index({ userId: 1, lastMessageAt: -1 });
chatSchema.index({ userId: 1, isArchived: 1 });

chatSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('Chat', chatSchema);
