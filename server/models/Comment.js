const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  paperId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Paper', 
    required: true,
    index: true 
  },
  username: { type: String, required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});


commentSchema.index({ paperId: 1, createdAt: -1 });

module.exports = mongoose.model('Comment', commentSchema);