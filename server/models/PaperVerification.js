const mongoose = require('mongoose');

const ISSUE_TYPES = [
  'wrong_subject',
  'wrong_branch',
  'wrong_semester',
  'wrong_year',
  'wrong_exam_type',
  'unreadable_pdf',
  'duplicate',
  'solution_issue',
  'other',
];

const paperVerificationSchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  metadataCorrect: {
    type: Boolean,
    default: null,
  },
  pdfReadable: {
    type: Boolean,
    default: null,
  },
  issueTypes: {
    type: [{
      type: String,
      enum: ISSUE_TYPES,
    }],
    default: [],
  },
  note: {
    type: String,
    default: '',
    maxlength: 500,
  },
}, {
  timestamps: true,
});

paperVerificationSchema.index({ paperId: 1, userId: 1 }, { unique: true });

paperVerificationSchema.statics.ISSUE_TYPES = ISSUE_TYPES;

module.exports = mongoose.model('PaperVerification', paperVerificationSchema);
