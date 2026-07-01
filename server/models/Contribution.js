const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
  contributorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  contributorName: {
    type: String,
    required: true
  },
  contributorEmail: {
    type: String,
    required: true
  },
  branch: {
    type: String,
    default: 'CSE',
    index: true
  },
  semester: {
    type: Number,
    required: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    index: true
  },
  normalizedSubject: {
    type: String,
    index: true
  },
  subjectCode: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    required: true
  },
  year: {
    type: Number,
    required: true,
    index: true
  },
  examType: {
    type: String,
    required: true,
    index: true
  },
  paperUrl: {
    type: String,
    required: true
  },
  paperPublicId: {
    type: String,
    required: true
  },
  solutionUrl: {
    type: String,
    default: null
  },
  solutionPublicId: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  fileHash: {
    type: String,
    index: true
  },
  duplicateKey: {
    type: String,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'needs_correction', 'duplicate'],
    default: 'pending',
    index: true
  },
  adminNote: {
    type: String,
    default: ''
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  reviewedBy: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  reviewedAt: {
    type: Date,
    default: null
  },
  approvedPaperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    default: null
  },
  approvedAt: {
    type: Date,
    default: null
  },
  rejectedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Contribution', contributionSchema);
