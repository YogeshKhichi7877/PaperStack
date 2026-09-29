const mongoose = require('mongoose');
const { RESOURCE_TYPE_VALUES } = require('../data/resourceTypes');

const resourceSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, index: true },
  kind: { type: String, required: true, enum: RESOURCE_TYPE_VALUES, index: true },

  subjectKey: { type: String, required: true, index: true },
  subjectCode: { type: String, default: '', index: true },
  subjectShortCode: { type: String, default: '', index: true },
  subjectName: { type: String, required: true, index: true },

  branches: { type: [String], default: [], index: true },
  semesters: { type: [Number], default: [], index: true },
  examType: { type: String, default: '', index: true },
  year: { type: Number, default: null, index: true },

  fileUrl: { type: String, default: '' },
  filePublicId: { type: String, default: '' },
  originalFileName: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  fileSize: { type: Number, default: null },
  contentText: { type: String, default: '' },

  parentResourceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', default: null, index: true },
  legacyPaperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', default: null, index: true },
  legacySourceKey: { type: String, default: undefined, unique: true, sparse: true, index: true },

  sourceType: {
    type: String,
    enum: ['legacy_paper', 'legacy_solution', 'contribution', 'admin', 'generated'],
    default: 'admin',
    index: true,
  },
  status: {
    type: String,
    enum: ['active', 'pending', 'rejected', 'archived'],
    default: 'active',
    index: true,
  },
  visibility: {
    type: String,
    enum: ['public', 'campus'],
    default: 'public',
    index: true,
  },

  contributorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  contributorName: { type: String, default: '' },

  tags: { type: [String], default: [] },
  topics: { type: [String], default: [] },
  units: { type: [Number], default: [] },

  views: { type: Number, default: 0 },
  downloads: { type: Number, default: 0 },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

resourceSchema.index({ subjectKey: 1, kind: 1, year: -1, examType: 1 });
resourceSchema.index({ branches: 1, semesters: 1, kind: 1, year: -1 });
resourceSchema.index({ title: 'text', subjectName: 'text', subjectCode: 'text', subjectShortCode: 'text', tags: 'text' });
resourceSchema.index({ 'metadata.fileHash': 1, subjectKey: 1, kind: 1 }, { sparse: true });

module.exports = mongoose.model('Resource', resourceSchema);
