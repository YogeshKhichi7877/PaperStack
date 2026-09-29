const mongoose = require('mongoose');

const aiAnswerCacheSchema = new mongoose.Schema({
  exactHash: { type: String, required: true, index: true },
  normalizedRequest: { type: String, required: true, maxlength: 1400 },
  task: { type: String, required: true, index: true },
  mode: { type: String, required: true, index: true },
  subjectCode: { type: String, default: '', index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null, index: true },
  topics: { type: [String], default: [] },
  contentVersion: { type: String, required: true, index: true },
  promptVersion: { type: String, required: true, default: 'question-tutor-v3' },
  answer: { type: String, required: true, maxlength: 50000 },
  answerHash: { type: String, required: true },
  provider: { type: String, default: '' },
  model: { type: String, default: '' },
  status: {
    type: String,
    enum: ['generated', 'helpful', 'verified', 'needs_review', 'stale'],
    default: 'generated',
    index: true,
  },
  exactHits: { type: Number, default: 0, min: 0 },
  semanticHits: { type: Number, default: 0, min: 0 },
  helpfulCount: { type: Number, default: 0, min: 0 },
  negativeCount: { type: Number, default: 0, min: 0 },
  lastUsedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

aiAnswerCacheSchema.index(
  { exactHash: 1, contentVersion: 1, promptVersion: 1 },
  { unique: true }
);
aiAnswerCacheSchema.index({ subjectCode: 1, mode: 1, status: 1, lastUsedAt: -1 });
aiAnswerCacheSchema.index({ questionId: 1, status: 1, updatedAt: -1 });

module.exports = mongoose.model('AiAnswerCache', aiAnswerCacheSchema);
