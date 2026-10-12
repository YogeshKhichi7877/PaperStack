const mongoose = require('mongoose');

const mappedTopicSchema = new mongoose.Schema({
  topicKey: { type: String, required: true },
  name: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 1, default: 1 },
  confirmed: { type: Boolean, default: true },
}, { _id: false });

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  dayKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  subjectCode: { type: String, required: true, uppercase: true, trim: true, index: true },
  subjectName: { type: String, required: true, trim: true },
  originalText: { type: String, required: true, trim: true, maxlength: 3000 },
  topics: { type: [mappedTopicSchema], default: [] },
  doubt: { type: String, default: '', maxlength: 2000 },
  doubtNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserNote', default: null },
  noteId: { type: mongoose.Schema.Types.ObjectId, ref: 'UserNote', default: null },
  resourceIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'PrivateStudyResource' }],
  practiceSessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'PracticeSession', default: null },
  completedPractice: { type: Boolean, default: false },
  understoodTopicKeys: { type: [String], default: [] },
  lastUnderstoodAt: { type: Date, default: null },
  lastTopicKey: { type: String, default: '' },
}, { timestamps: true });

schema.index({ userId: 1, dayKey: -1 });
schema.index({ userId: 1, subjectCode: 1, createdAt: -1 });

module.exports = mongoose.model('DailyLearningCheckin', schema);
