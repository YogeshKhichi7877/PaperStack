const mongoose = require('mongoose');

const ENTITY_TYPES = ['paper', 'question', 'resource', 'revision'];

const savedItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  entityType: { type: String, enum: ENTITY_TYPES, required: true, index: true },
  entityKey: { type: String, required: true, maxlength: 180 },
  entityId: { type: mongoose.Schema.Types.ObjectId, default: null, index: true },
  title: { type: String, default: '', maxlength: 240 },
  route: { type: String, default: '', maxlength: 240 },
  subjectCode: { type: String, default: '', maxlength: 40, index: true },
}, { timestamps: true });

savedItemSchema.index({ userId: 1, entityType: 1, entityKey: 1 }, { unique: true });
savedItemSchema.index({ userId: 1, updatedAt: -1 });
savedItemSchema.statics.ENTITY_TYPES = ENTITY_TYPES;

module.exports = mongoose.model('SavedItem', savedItemSchema);
