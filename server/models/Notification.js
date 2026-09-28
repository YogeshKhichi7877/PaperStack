const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sourceKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  sourceType: {
    type: String,
    enum: [
      'contribution',
      'paper_request',
      'question_solution',
      'system',
    ],
    required: true,
    index: true,
  },
  sourceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true,
  },
  sourceState: {
    type: String,
    default: '',
  },
  title: {
    type: String,
    required: true,
    maxlength: 180,
  },
  message: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  severity: {
    type: String,
    enum: ['info', 'success', 'warning'],
    default: 'info',
  },
  actionUrl: {
    type: String,
    default: '',
    maxlength: 500,
  },
  eventAt: {
    type: Date,
    default: Date.now,
    index: -1,
  },
  readAt: {
    type: Date,
    default: null,
    index: true,
  },
}, {
  timestamps: true,
});

notificationSchema.index({
  userId: 1,
  readAt: 1,
  eventAt: -1,
});

module.exports = mongoose.model(
  'Notification',
  notificationSchema
);
