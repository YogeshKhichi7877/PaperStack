const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
    title: String,
    subject: String,
    year: Number,
    semester: Number,
    examType: String,
    
    filePath: String,
    filePublicId: String, // ✅ ADD THIS (Stores the ID for deletion)
    
    solutionPath: String,
    solutionPublicId: String, // ✅ ADD THIS
    
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Paper', paperSchema);