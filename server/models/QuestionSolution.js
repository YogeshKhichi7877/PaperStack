const mongoose = require('mongoose');

const SOLUTION_STATUSES = ['pending', 'approved', 'rejected'];

const questionSolutionSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true,
    index: true,
  },
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true,
    index: true,
  },
  authorUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  authorName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  answerText: {
    type: String,
    required: true,
    trim: true,
    minlength: 20,
    maxlength: 12000,
  },
  status: {
    type: String,
    enum: SOLUTION_STATUSES,
    default: 'pending',
    index: true,
  },
  moderationNote: {
    type: String,
    default: '',
    maxlength: 500,
  },
  helpfulCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  approvedAt: {
    type: Date,
    default: null,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

questionSolutionSchema.index(
  { questionId: 1, authorUserId: 1 },
  { unique: true }
);

questionSolutionSchema.index({
  questionId: 1,
  status: 1,
  helpfulCount: -1,
  createdAt: 1,
});

questionSolutionSchema.statics.SOLUTION_STATUSES = SOLUTION_STATUSES;

module.exports = mongoose.model(
  'QuestionSolution',
  questionSolutionSchema
);
