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
    trim: true 
  },
  password: { type: String, required: true },
  
  semester: { 
    type: Number, 
    default: null, 
    index: true 
  },
  
  bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Paper' }]
});

const User = mongoose.model('User', userSchema);

module.exports = User;