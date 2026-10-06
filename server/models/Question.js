const mongoose = require('mongoose');

const QUESTION_SOURCES = ['manual', 'rule', 'ai', 'imported'];
const QUESTION_STATUSES = ['extracted', 'reviewed', 'verified', 'rejected'];
const QUESTION_DIFFICULTIES = ['unknown', 'easy', 'medium', 'hard'];

const sourceLocationSchema = new mongoose.Schema({
  pageStart: {
    type: Number,
    min: 1,
    default: null,
  },
  pageEnd: {
    type: Number,
    min: 1,
    default: null,
  },
  charStart: {
    type: Number,
    min: 0,
    default: null,
  },
  charEnd: {
    type: Number,
    min: 0,
    default: null,
  },
}, { _id: false });

const extractionSchema = new mongoose.Schema({
  source: {
    type: String,
    enum: QUESTION_SOURCES,
    default: 'manual',
  },
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: null,
  },
  provider: {
    type: String,
    default: '',
  },
  model: {
    type: String,
    default: '',
  },
  version: {
    type: String,
    default: 'question-v1',
  },
}, { _id: false });

const questionSchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true,
    index: true,
  },

  // Stable identity within one paper. Examples: q1, q2-a, section-b-q3.
  questionKey: {
    type: String,
    required: true,
    trim: true,
  },

  questionNumber: {
    type: String,
    required: true,
    trim: true,
  },
  questionLabel: {
    type: String,
    required: true,
    trim: true,
  },
  part: {
    type: String,
    default: '',
    trim: true,
  },
  parentQuestionKey: {
    type: String,
    default: '',
    trim: true,
  },
  parentQuestionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    default: null,
  },
  sequence: {
    type: Number,
    required: true,
    min: 1,
    index: true,
  },
  section: {
    type: String,
    default: '',
    trim: true,
  },

  questionText: {
    type: String,
    required: true,
    trim: true,
  },
  normalizedText: {
    type: String,
    required: true,
  },
  textHash: {
    type: String,
    required: true,
    index: true,
  },
  rawText: {
    type: String,
    default: '',
  },

  marks: {
    type: Number,
    min: 0,
    default: null,
  },
  questionType: {
    type: String,
    default: 'unknown',
    trim: true,
  },
  difficulty: {
    type: String,
    enum: QUESTION_DIFFICULTIES,
    default: 'unknown',
  },

  unit: {
    type: Number,
    min: 1,
    max: 20,
    default: null,
  },
  primaryTopic: {
    type: String,
    default: '',
    trim: true,
  },
  topics: {
    type: [String],
    default: [],
  },

  sourceLocation: {
    type: sourceLocationSchema,
    default: () => ({}),
  },

  // Authoritative metadata copied from the approved parent Paper.
  subjectKey: {
    type: String,
    default: '',
    index: true,
  },
  subject: {
    type: String,
    default: '',
    index: true,
  },
  subjectCode: {
    type: String,
    default: '',
    index: true,
  },
  shortCode: {
    type: String,
    default: '',
  },
  branch: {
    type: String,
    default: '',
    index: true,
  },
  semester: {
    type: Number,
    default: null,
    index: true,
  },
  examType: {
    type: String,
    default: '',
    index: true,
  },
  year: {
    type: Number,
    default: null,
    index: true,
  },

  extraction: {
    type: extractionSchema,
    default: () => ({}),
  },
  status: {
    type: String,
    enum: QUESTION_STATUSES,
    default: 'extracted',
    index: true,
  },
  needsReview: {
    type: Boolean,
    default: false,
    index: true,
  },
  duplicateReview: {
    classification: { type: String, enum: ['', 'exact', 'probable', 'possible'], default: '' },
    matchedQuestionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null },
    confidence: { type: Number, min: 0, max: 1, default: null },
    reason: { type: String, default: '' },
  },
  choiceGroup: { type: String, default: '' },
  choiceInstructions: { type: String, default: '' },
  hasVisualContext: { type: Boolean, default: false },
  repeatClusterId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question', default: null, index: true },
}, {
  timestamps: true,
});

questionSchema.index({ subjectCode: 1, status: 1, year: -1, sequence: 1 });
questionSchema.index({ subjectKey: 1, status: 1, year: -1, sequence: 1 });
questionSchema.index({ branch: 1, semester: 1, examType: 1, status: 1, year: -1 });

questionSchema.index({ paperId: 1, questionKey: 1 }, { unique: true });
questionSchema.index({ paperId: 1, sequence: 1 });
questionSchema.index({ subjectKey: 1, year: -1, examType: 1 });
questionSchema.index({ subjectCode: 1, year: -1, examType: 1 });
questionSchema.index({ branch: 1, semester: 1, year: -1 });
questionSchema.index({ topics: 1 });
questionSchema.index({ textHash: 1, subjectCode: 1 });
questionSchema.index({ 'duplicateReview.classification': 1, needsReview: 1 });
questionSchema.index(
  {
    questionText: 'text',
    normalizedText: 'text',
    topics: 'text',
    primaryTopic: 'text',
  },
  {
    weights: {
      questionText: 10,
      primaryTopic: 5,
      topics: 4,
      normalizedText: 2,
    },
    name: 'question_search_text',
  }
);

questionSchema.statics.QUESTION_SOURCES = QUESTION_SOURCES;
questionSchema.statics.QUESTION_STATUSES = QUESTION_STATUSES;
questionSchema.statics.QUESTION_DIFFICULTIES = QUESTION_DIFFICULTIES;

module.exports = mongoose.model('Question', questionSchema);
