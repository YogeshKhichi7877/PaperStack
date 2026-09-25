const express = require('express');
const {
  SUBJECT_CATALOG,
  EXPECTED_YEARS,
  EXPECTED_EXAM_TYPES,
} = require('../data/subjectCatalog');

const router = express.Router();

router.get('/subjects', (req, res) => {
  res.json({
    branches: SUBJECT_CATALOG,
    expectedYears: EXPECTED_YEARS,
    expectedExamTypes: EXPECTED_EXAM_TYPES,
  });
});

module.exports = router;
