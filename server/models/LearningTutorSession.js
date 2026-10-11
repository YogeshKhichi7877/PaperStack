const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['student', 'tutor'], required: true },
  mode: { type: String, default: 'SIMPLE' },
  content: { type: String, required: true, maxlength: 16000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: false });

const sourceSchema = new mongoose.Schema({
  sourceType: { type: String, required: true },
  resourceId: { type: String, default: '' },
  title: { type: String, required: true },
  locatorType: { type: String, default: '' },
  locatorNumber: { type: Number, default: null },
}, { _id: false });

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  checkinId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyLearningCheckin', default: null },
  subjectCode: { type: String, required: true, uppercase: true, trim: true, index: true },
  subjectName: { type: String, required: true, trim: true },
  topicKey: { type: String, required: true, index: true },
  topicName: { type: String, required: true, trim: true },
  learningLevel: { type: String, enum: ['BEGINNER', 'DEVELOPING', 'COMFORTABLE', 'STRONG'], required: true },
  lastMode: { type: String, default: 'SIMPLE' },
  messages: { type: [messageSchema], default: [] },
  sources: { type: [sourceSchema], default: [] },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

schema.index({ userId: 1, topicKey: 1, updatedAt: -1 });

module.exports = mongoose.model('LearningTutorSession', schema);
