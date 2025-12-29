const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
    title: { type: String, required: true },
    
    subject: { type: String, index: true }, 
    semester: { type: Number, index: true },
    examType: { type: String, index: true },
    
    year: Number,
    filePath: String,
    filePublicId: String,
    solutionPath: String,
    solutionPublicId: String,
    
    views: { type: Number, default: 0, index: -1 }, 
    downloads: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, index: -1 }
});

paperSchema.index({ semester: 1, subject: 1 });

module.exports = mongoose.model('Paper', paperSchema);