const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    index: true
  },
  paperTitle: {
    type: String
  },
  reporterUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  reporterName: {
    type: String
  },
  reporterEmail: {
    type: String
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
    ]
  },
  message: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['open', 'reviewed', 'investigating', 'resolved', 'dismissed'],
    default: 'open',
    index: true
  },
  adminNote: {
    type: String,
    default: ''
  },
  category: { type: String, maxlength: 50, default: '' },
  title: { type: String, maxlength: 120, default: '' },
  page: { type: String, maxlength: 120, default: '' },
  url: { type: String, maxlength: 300, default: '' },
  relatedId: { type: String, maxlength: 80, default: '' }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);
