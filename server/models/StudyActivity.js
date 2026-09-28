const mongoose = require('mongoose');

const STUDY_CATEGORIES = [
  'archive',
  'questions',
  'revision',
  'war_room',
  'ask',
  'mock',
];

const studyActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  dayKey: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true,
  },
  categories: {
    type: [{
      type: String,
      enum: STUDY_CATEGORIES,
    }],
    default: [],
  },
  lastRoute: {
    type: String,
    default: '',
    maxlength: 180,
  },
  eventCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  firstSeenAt: {
    type: Date,
    default: Date.now,
  },
  lastSeenAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

studyActivitySchema.index(
  {
    userId: 1,
    dayKey: 1,
  },
  {
    unique: true,
  }
);

studyActivitySchema.statics.STUDY_CATEGORIES =
  STUDY_CATEGORIES;

module.exports = mongoose.model(
  'StudyActivity',
  studyActivitySchema
);
