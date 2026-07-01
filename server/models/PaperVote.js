const mongoose = require('mongoose');

const paperVoteSchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userEmail: {
    type: String,
    default: ''
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  useful: {
    type: Boolean,
    required: true
  }
}, { timestamps: true });

paperVoteSchema.index({ paperId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('PaperVote', paperVoteSchema);
