const mongoose = require('mongoose');

const outputsSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true,
    index: true,
  },
  animationUrl:    { type: String, default: null },
  videoUrl:        { type: String, default: null },
  animationStatus: { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending' },
  videoStatus:     { type: String, enum: ['pending', 'processing', 'done', 'failed'], default: 'pending' },
  animationJobId:  { type: String, default: null },
  videoJobId:      { type: String, default: null },
  errorLogs: [{
    pipeline:  String,
    message:   String,
    timestamp: { type: Date, default: Date.now },
  }],
  completedAt: { type: Date, default: null },
});

module.exports = mongoose.model('Outputs', outputsSchema);
