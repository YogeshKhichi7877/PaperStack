const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password: { type: String },
  currentSemester: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  role: {
    type: String,
    default: 'student'
  },
  googleId: {
    type: String,
    unique: true,
    sparse: true
  },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'linked'],
    default: 'local'
  },
  avatar: String,
  emailVerified: {
    type: Boolean,
    default: false
  },

  // Keep the old field for existing PaperStack UI and saved preferences.
  semester: {
    type: Number,
    default: null,
    index: true
  },

  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Paper' }]
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

module.exports = User;
