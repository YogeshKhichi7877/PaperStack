const express = require('express');
const {
  SUBJECT_CATALOG,
  EXPECTED_YEARS,
  EXPECTED_EXAM_TYPES,
} = require('../data/subjectCatalog');
const { FLAT_SUBJECT_CATALOG, normalizeSubjectCode, resolveSubject } = require('../services/subjectService');

const router = express.Router();

router.get('/subjects', (req, res) => {
  res.json({
    branches: SUBJECT_CATALOG,
    expectedYears: EXPECTED_YEARS,
    expectedExamTypes: EXPECTED_EXAM_TYPES,
  });
});

router.get('/subjects/canonical', (req, res) => {
  const semester = Number(req.query.semester) || null;
  const branch = String(req.query.branch || '').trim().toUpperCase();
  const subjects = FLAT_SUBJECT_CATALOG.map((subject) => ({
    ...subject,
    current: Boolean((!semester || subject.semesters.includes(semester)) && (!branch || subject.branches.includes(branch))),
  })).sort((a, b) => Number(b.current) - Number(a.current) || a.code.localeCompare(b.code));
  res.json({ subjects });
});

router.get('/subjects/resolve', (req, res) => {
  const subject = resolveSubject({ subjectCode: req.query.code, subjectName: req.query.name, branch: req.query.branch, semester: req.query.semester });
  res.json({ subject, normalizedCode: normalizeSubjectCode(req.query.code) });
});

module.exports = router;
