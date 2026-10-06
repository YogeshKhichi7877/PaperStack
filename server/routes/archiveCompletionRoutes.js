const express = require('express');
const Paper = require('../models/Paper');
const {
  SUBJECT_CATALOG,
  EXPECTED_YEARS,
  EXPECTED_EXAM_TYPES,
} = require('../data/subjectCatalog');
const { buildArchiveCompletion } = require('../services/archiveCompletionService');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const papers = await Paper.find({ reviewStatus: { $nin: ['processing', 'needs_review', 'failed'] } })
      .select('title subject normalizedSubject subjectCode shortCode branch semester sem year examType type')
      .lean();

    const result = buildArchiveCompletion({
      papers,
      subjectCatalog: SUBJECT_CATALOG,
      expectedYears: EXPECTED_YEARS,
      expectedExamTypes: EXPECTED_EXAM_TYPES,
    });

    res.json(result);
  } catch (error) {
    console.error('Archive completion API failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate archive completion',
    });
  }
});

module.exports = router;
