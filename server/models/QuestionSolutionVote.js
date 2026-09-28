const mongoose = require('mongoose');

const questionSolutionVoteSchema = new mongoose.Schema({
  solutionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'QuestionSolution',
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
}, {
  timestamps: true,
});

questionSolutionVoteSchema.index(
  { solutionId: 1, userId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  'QuestionSolutionVote',
  questionSolutionVoteSchema
);
