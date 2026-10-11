const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, index: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PracticeSession', required: true, index: true },
  clientAttemptId: { type: String, required: true, trim: true },
  subjectCode: { type: String, required: true, uppercase: true, trim: true, index: true },
  topicKeys: { type: [String], default: [] },
  answer: { type: String, required: true, maxlength: 12000 },
  score: { type: Number, min: 0, required: true },
  maxScore: { type: Number, min: 0.01, required: true },
  actualScore: { type: Number, min: 0, max: 1, required: true },
  correct: { type: Boolean, required: true },
  firstAttempt: { type: Boolean, required: true },
  difficulty: { type: String, enum: ['unknown', 'easy', 'medium', 'hard'], default: 'unknown' },
  timeSpentSeconds: { type: Number, min: 0, max: 7200, default: 0 },
  hintsUsed: { type: Number, min: 0, max: 20, default: 0 },
  evaluationMode: { type: String, enum: ['objective', 'ai', 'local'], required: true },
  evaluationConfidence: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
  ratingApplied: { type: Boolean, default: false },
  ratingDelta: { type: Number, default: 0 },
}, { timestamps: true });

schema.index({ userId: 1, clientAttemptId: 1 }, { unique: true });
schema.index({ userId: 1, questionId: 1, createdAt: 1 });
schema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('QuestionAttempt', schema);
