const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subjectCode: { type: String, required: true, uppercase: true, trim: true, index: true },
  subjectName: { type: String, default: '' },
  checkinId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyLearningCheckin', default: null },
  mode: { type: String, enum: ['DAILY', 'TOPIC', 'WEAK_TOPIC', 'REVIEW', 'EXAM', 'MOCK'], required: true, index: true },
  sourceKey: { type: String, default: '', trim: true },
  privateResourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrivateStudyResource', default: null, index: true },
  topicKeys: { type: [String], default: [] },
  questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
  startedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  ratingEligible: { type: Boolean, default: false },
  result: {
    attempted: { type: Number, default: 0 },
    correctEquivalent: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    ratingDelta: { type: Number, default: 0 },
  },
}, { timestamps: true });

schema.index({ userId: 1, completedAt: 1, updatedAt: -1 });
schema.index({ userId: 1, mode: 1, createdAt: -1 });
schema.index({ userId: 1, sourceKey: 1 }, { unique: true, partialFilterExpression: { sourceKey: { $type: 'string', $gt: '' } } });

module.exports = mongoose.model('PracticeSession', schema);
