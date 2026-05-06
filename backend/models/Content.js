const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  promptHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  refinedPrompt: { type: String, required: true },
  explanation:   { type: String, required: true },
  keyPoints:     { type: [String], default: [] },
  chartData: {
    type: {
      type: String,
      default: 'bar',
    },
    title:  { type: String, default: '' },
    labels: { type: [String], default: [] },
    values: { type: [Number], default: [] },
  },
  animationScript: [{
    slide:   Number,
    title:   String,
    bullets: [String],
    code: {
      language: { type: String, default: undefined },
      source:   { type: String, default: undefined },
    },
    diagram: { type: String, default: undefined },
    formula: { type: String, default: undefined },
  }],
  videoScript:     { type: String, default: '' },
  subjectTag:      { type: String, default: 'general', index: true },
  difficultyLevel: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  usageCount:      { type: Number, default: 1 },
  createdAt:       { type: Date, default: Date.now },
});

module.exports = mongoose.model('Content', contentSchema);
