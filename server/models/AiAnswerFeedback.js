const mongoose = require('mongoose');

const aiAnswerFeedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  answerId: { type: mongoose.Schema.Types.ObjectId, ref: 'AiAnswerCache', required: true, index: true },
  value: { type: String, enum: ['helpful', 'not_helpful'], required: true },
  reason: {
    type: String,
    enum: ['', 'incorrect', 'unclear', 'incomplete', 'not_relevant', 'other'],
    default: '',
  },
}, { timestamps: true });

aiAnswerFeedbackSchema.index({ userId: 1, answerId: 1 }, { unique: true });

module.exports = mongoose.model('AiAnswerFeedback', aiAnswerFeedbackSchema);
