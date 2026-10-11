const mongoose = require('mongoose');

const processingErrorSchema = new mongoose.Schema({
  stage: { type: String, default: '' },
  code: { type: String, default: '' },
  message: { type: String, default: '' },
  retryable: { type: Boolean, default: false },
}, { _id: false });

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subjectCode: { type: String, required: true, uppercase: true, trim: true, index: true },
  subjectName: { type: String, default: '', trim: true },
  linkedCheckinId: { type: mongoose.Schema.Types.ObjectId, ref: 'DailyLearningCheckin', default: null, index: true },
  title: { type: String, required: true, trim: true, maxlength: 180 },
  originalFileName: { type: String, required: true, trim: true, maxlength: 240 },
  mimeType: { type: String, required: true },
  extension: { type: String, required: true },
  resourceType: { type: String, enum: ['PDF', 'PPTX', 'PPT', 'TEXT'], required: true, index: true },
  fileSize: { type: Number, required: true, min: 1 },
  fileHash: { type: String, required: true },
  storagePublicId: { type: String, required: true },
  storageResourceType: { type: String, default: 'raw' },
  storageVersion: { type: Number, default: null },
  processingStatus: {
    type: String,
    enum: ['UPLOADED', 'QUEUED', 'EXTRACTING', 'OCR', 'MAPPING_TOPICS', 'READY', 'FAILED'],
    default: 'QUEUED',
    index: true,
  },
  extractionStatus: {
    type: String,
    enum: ['PENDING', 'NATIVE_TEXT', 'OCR', 'MIXED', 'UNSUPPORTED', 'FAILED'],
    default: 'PENDING',
  },
  linkedTopicIds: { type: [String], default: [] },
  linkedTopicNames: { type: [String], default: [] },
  pageCount: { type: Number, default: 0 },
  chunkCount: { type: Number, default: 0 },
  private: { type: Boolean, default: true, immutable: true },
  processing: {
    jobId: { type: String, default: '', index: true },
    attempts: { type: Number, default: 0 },
    stage: { type: String, default: 'queued' },
    startedAt: { type: Date, default: null },
    finishedAt: { type: Date, default: null },
    leaseUntil: { type: Date, default: null },
    retryAt: { type: Date, default: null },
    error: { type: processingErrorSchema, default: null },
  },
}, { timestamps: true });

schema.index({ userId: 1, createdAt: -1 });
schema.index({ userId: 1, subjectCode: 1, createdAt: -1 });
schema.index({ userId: 1, fileHash: 1 }, { unique: true });
schema.index({ processingStatus: 1, 'processing.retryAt': 1 });

module.exports = mongoose.model('PrivateStudyResource', schema);
