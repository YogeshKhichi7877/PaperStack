const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true, immutable: true },
  subjectCode: { type: String, required: true, immutable: true, index: true },
  questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true, immutable: true },
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PracticeSession', required: true, immutable: true },
  attemptId: { type: mongoose.Schema.Types.ObjectId, ref: 'QuestionAttempt', required: true, immutable: true },
  oldRating: { type: Number, required: true, immutable: true },
  questionRating: { type: Number, required: true, immutable: true },
  expectedScore: { type: Number, required: true, immutable: true },
  actualScore: { type: Number, required: true, immutable: true },
  delta: { type: Number, required: true, immutable: true },
  newRating: { type: Number, required: true, immutable: true },
}, { timestamps: true });

schema.index({ userId: 1, questionId: 1 }, { unique: true });
schema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('RatingEvent', schema);
