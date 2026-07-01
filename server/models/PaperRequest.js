const mongoose = require('mongoose');

const requestedUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  email: {
    type: String,
    default: ''
  },
  requestedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const paperRequestSchema = new mongoose.Schema({
  requestKey: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  subject: {
    type: String,
    required: true,
    index: true
  },
  subjectCode: {
    type: String,
    default: ''
  },
  shortCode: {
    type: String,
    default: ''
  },
  branch: {
    type: String,
    required: true,
    index: true
  },
  semester: {
    type: Number,
    required: true,
    index: true
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
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  requestedByEmail: {
    type: String,
    default: ''
  },
  requestCount: {
    type: Number,
    default: 1,
    min: 0
  },
  requestedUsers: {
    type: [requestedUserSchema],
    default: []
  },
  status: {
    type: String,
    enum: ['open', 'fulfilled', 'dismissed'],
    default: 'open',
    index: true
  }
}, { timestamps: true });

paperRequestSchema.index({ branch: 1, semester: 1, subject: 1, year: 1, examType: 1 });

module.exports = mongoose.model('PaperRequest', paperRequestSchema);
