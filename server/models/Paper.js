const mongoose = require('mongoose');

const paperSchema = new mongoose.Schema({
    title: { type: String, required: true },
    
    subject: { type: String, index: true }, 
    normalizedSubject: { type: String, index: true },
    subjectCode: String,
    branch: { type: String, default: 'CSE', index: true },
    semester: { type: Number, index: true },
    examType: { type: String, index: true },
    
    year: Number,
    originalFileName: String,
    filePath: String,
    filePublicId: String,
    fileHash: { type: String, index: true, unique: true, sparse: true },
    duplicateKey: { type: String, index: true, unique: true, sparse: true },
    fileSize: Number,
    mimeType: String,
    solutionPath: String,
    solutionPublicId: String,
    extractedTextPreview: String,
    extractionConfidence: Number,
    extractionWarnings: [String],
    uploadedBy: String,
    uploadMode: { type: String, enum: ['legacy', 'normal', 'bulk', 'admin', 'contribution'], default: 'legacy' },
    topics: [String],
    units: [Number],
    reportedIssuesCount: { type: Number, default: 0 },
    contributedBy: String,
    contributedByName: String,
    contributorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    contributionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Contribution', default: null },
    approvedAt: Date,
    
    views: { type: Number, default: 0, index: -1 }, 
    downloads: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now, index: -1 },
    updatedAt: { type: Date, default: Date.now }
});

paperSchema.index({ semester: 1, subject: 1 });
paperSchema.index({ branch: 1, semester: 1, normalizedSubject: 1, year: 1, examType: 1 });

paperSchema.pre('save', function setUpdatedAt() {
    this.updatedAt = new Date();
});

module.exports = mongoose.model('Paper', paperSchema, 'paper');
