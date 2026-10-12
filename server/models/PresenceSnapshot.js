const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  bucket: { type: Date, required: true },
  sampledAt: { type: Date, required: true },
  activeUsers: Number,
  authenticatedUsers: Number,
  guests: Number,
  activeSessions: Number,
  pages: { type: Map, of: Number },
  subjects: { type: Map, of: Number },
}, { versionKey: false });
schema.index({ bucket: 1 }, { unique: true, expireAfterSeconds: 60 * 86400 });
module.exports = mongoose.model('PresenceSnapshot', schema);
