const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true,
    index: true
  },
  paperTitle: {
    type: String,
    required: true
  },
  reporterUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reporterName: {
    type: String,
    required: true
  },
  reporterEmail: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    enum: [
      'Wrong subject',
      'Wrong semester',
      'Wrong year',
      'Wrong exam type',
      'PDF not opening',
      'Duplicate paper',
      'Solution missing',
      'Other'
    ],
    required: true
  },
  message: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['open', 'reviewed', 'resolved'],
    default: 'open',
    index: true
  },
  adminNote: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
