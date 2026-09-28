const mongoose = require('mongoose');

const testimonialSchema = new mongoose.Schema({
  authorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  displayName: { type: String, required: true, maxlength: 60 },
  message: { type: String, required: true, maxlength: 600 },
  rating: { type: Number, min: 1, max: 5, default: null, validate: (value) => value == null || Number.isInteger(value) },
  branch: { type: String, default: null },
  semester: { type: Number, min: 1, max: 8, default: null },
}, { timestamps: true });

testimonialSchema.index({ authorUserId: 1, createdAt: -1 });
module.exports = mongoose.model('Testimonial', testimonialSchema);
