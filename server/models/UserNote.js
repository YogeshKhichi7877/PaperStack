const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  subjectCode: { type: String, required: true, uppercase: true, trim: true, index: true },
  topicKey: { type: String, default: '', index: true },
  topicName: { type: String, default: '' },
  dayKey: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
  type: { type: String, enum: ['CLASS_NOTE', 'IMPORTANT_POINT', 'FORMULA', 'DOUBT', 'REVISION_NOTE'], default: 'CLASS_NOTE' },
  status: { type: String, enum: ['OPEN', 'IMPROVING', 'RESOLVED', null], default: null, index: true },
  content: { type: String, required: true, trim: true, maxlength: 12000 },
  private: { type: Boolean, default: true, immutable: true },
}, { timestamps: true });

schema.index({ userId: 1, subjectCode: 1, dayKey: -1 });
schema.index({ userId: 1, type: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('UserNote', schema);
