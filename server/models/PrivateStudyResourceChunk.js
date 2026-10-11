const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  resourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'PrivateStudyResource', required: true, index: true },
  subjectCode: { type: String, required: true, uppercase: true, trim: true, index: true },
  chunkIndex: { type: Number, required: true },
  locatorType: { type: String, enum: ['PAGE', 'SLIDE', 'DOCUMENT'], required: true },
  locatorNumber: { type: Number, default: null },
  heading: { type: String, default: '', maxlength: 300 },
  text: { type: String, required: true, maxlength: 5000 },
  extractionMethod: { type: String, enum: ['NATIVE_TEXT', 'OCR'], default: 'NATIVE_TEXT' },
  topicKeys: { type: [String], default: [] },
  contentHash: { type: String, required: true },
}, { timestamps: true });

schema.index({ resourceId: 1, chunkIndex: 1 }, { unique: true });
schema.index({ userId: 1, subjectCode: 1, topicKeys: 1 });

module.exports = mongoose.model('PrivateStudyResourceChunk', schema);
