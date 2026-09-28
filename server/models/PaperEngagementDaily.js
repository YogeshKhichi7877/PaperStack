const mongoose = require('mongoose');

const paperEngagementDailySchema = new mongoose.Schema({
  paperId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Paper',
    required: true,
    index: true,
  },
  dayKey: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true,
  },
  views: {
    type: Number,
    default: 0,
    min: 0,
  },
  downloads: {
    type: Number,
    default: 0,
    min: 0,
  },
}, {
  timestamps: true,
});

paperEngagementDailySchema.index(
  {
    paperId: 1,
    dayKey: 1,
  },
  {
    unique: true,
  }
);

paperEngagementDailySchema.index({
  dayKey: 1,
  views: -1,
  downloads: -1,
});

module.exports = mongoose.model(
  'PaperEngagementDaily',
  paperEngagementDailySchema
);
