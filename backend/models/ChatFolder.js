const mongoose = require('mongoose');

const chatFolderSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

chatFolderSchema.index({ userId: 1, name: 1 }, { unique: true });

chatFolderSchema.pre('save', function () {
  this.updatedAt = new Date();
});

module.exports = mongoose.model('ChatFolder', chatFolderSchema);
