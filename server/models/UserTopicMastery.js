const mongoose = require('mongoose');

const historySchema = new mongoose.Schema({
  score: { type: Number, min: 0, max: 1, required: true },
  difficulty: { type: String, enum: ['unknown', 'easy', 'medium', 'hard'], default: 'unknown' },
  at: { type: Date, required: true },
}, { _id: false });

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subjectCode: { type: String, required: true, uppercase: true, trim: true },
  subjectName: { type: String, default: '' },
  topicKey: { type: String, required: true },
  topicName: { type: String, required: true },
  masteryScore: { type: Number, min: 0, max: 100, default: 50 },
  masteryConfidence: { type: Number, min: 0, max: 1, default: 0 },
  evidenceWeight: { type: Number, min: 0, default: 0 },
  weightedScore: { type: Number, min: 0, default: 0 },
  totalAttempts: { type: Number, min: 0, default: 0 },
  correctEquivalent: { type: Number, min: 0, default: 0 },
  firstAttemptCount: { type: Number, min: 0, default: 0 },
  status: { type: String, enum: ['STRONG', 'GOOD', 'IMPROVING', 'WEAK', 'NOT_PRACTICED'], default: 'NOT_PRACTICED' },
  lastPracticedAt: { type: Date, default: null },
  lastReviewedAt: { type: Date, default: null },
  nextReviewAt: { type: Date, default: null, index: true },
  intervalDays: { type: Number, min: 0, default: 0 },
  reviewStage: { type: Number, min: 0, default: 0 },
  performanceHistory: { type: [historySchema], default: [] },
}, { timestamps: true });

schema.index({ userId: 1, topicKey: 1 }, { unique: true });
schema.index({ userId: 1, subjectCode: 1, masteryScore: 1 });
schema.index({ userId: 1, nextReviewAt: 1 });

module.exports = mongoose.model('UserTopicMastery', schema);
