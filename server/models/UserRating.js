const mongoose = require('mongoose');

const subjectRatingSchema = new mongoose.Schema({
  subjectCode: { type: String, required: true },
  rating: { type: Number, default: 1000 },
  ratedCount: { type: Number, default: 0 },
  weeklyDelta: { type: Number, default: 0 },
}, { _id: false });

const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
  globalRating: { type: Number, default: 1000, index: true },
  ratedCount: { type: Number, default: 0 },
  weeklyDelta: { type: Number, default: 0, index: true },
  subjectRatings: { type: [subjectRatingSchema], default: [] },
  provisional: { type: Boolean, default: true, index: true },
  lastRatedAt: { type: Date, default: null, index: true },
  public: { type: Boolean, default: false, index: true },
}, { timestamps: true });

schema.index({ public: 1, provisional: 1, globalRating: -1 });
schema.index({ 'subjectRatings.subjectCode': 1, 'subjectRatings.rating': -1 });

module.exports = mongoose.model('UserRating', schema);
