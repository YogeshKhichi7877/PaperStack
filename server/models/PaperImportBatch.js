const mongoose = require('mongoose');

// Files are stored by the existing provider; no PDF bytes live in this record.
const schema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  totalFiles: { type: Number, required: true },
  ingestionComplete: { type: Boolean, default: false },
  results: [{
    _id: false, fileName: String, fileHash: String, paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper' },
    status: String, code: String, message: String,
  }],
  solutions: [{
    _id: false, fileName: String, fileHash: String, fileUrl: String, storageKey: String,
    paperId: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper' }, status: String, message: String,
  }],
}, { timestamps: true });
module.exports = mongoose.model('PaperImportBatch', schema);
