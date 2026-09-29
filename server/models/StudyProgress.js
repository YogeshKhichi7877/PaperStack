const mongoose = require('mongoose');

const STUDY_ENTITY_TYPES = ['paper', 'question', 'resource', 'revision', 'war_room', 'mock', 'subject'];

const studyProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  entityType: { type: String, enum: STUDY_ENTITY_TYPES, required: true, index: true },
  entityKey: { type: String, required: true, maxlength: 180 },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  title: { type: String, required: true, maxlength: 240 },
  route: { type: String, required: true, maxlength: 240 },
  subjectCode: { type: String, default: '', maxlength: 40, index: true },
  status: { type: String, enum: ['opened', 'in_progress', 'completed'], default: 'opened' },
  progress: { type: Number, min: 0, max: 100, default: 0 },
  lastViewedAt: { type: Date, default: Date.now, index: true },
}, { timestamps: true });

studyProgressSchema.index({ userId: 1, entityType: 1, entityKey: 1 }, { unique: true });
studyProgressSchema.index({ userId: 1, lastViewedAt: -1 });
studyProgressSchema.statics.ENTITY_TYPES = STUDY_ENTITY_TYPES;

module.exports = mongoose.model('StudyProgress', studyProgressSchema);
