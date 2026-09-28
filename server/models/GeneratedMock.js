const mongoose = require('mongoose');

const generatedMockSchema = new mongoose.Schema({
  mockId: { type: String, required: true, unique: true, index: true },
  subjectCode: { type: String, required: true },
  questions: { type: [mongoose.Schema.Types.Mixed], default: [] },
  expiresAt: { type: Date, required: true, index: { expires: 0 } },
}, { timestamps: true });

module.exports = mongoose.models.GeneratedMock
  || mongoose.model('GeneratedMock', generatedMockSchema);
