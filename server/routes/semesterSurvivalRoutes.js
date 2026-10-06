const express = require('express');
const { OFFICIAL_BRANCHES } = require('../utils/branches');

const Paper = require('../models/Paper');
const Resource = require('../models/Resource');
const Question = require('../models/Question');
const QuestionSolution = require('../models/QuestionSolution');

const {
  SUBJECT_CATALOG,
  EXPECTED_YEARS,
  EXPECTED_EXAM_TYPES,
} = require('../data/subjectCatalog');

const {
  buildSemesterSurvivalPack,
  clampSemester,
  normalizeBranch,
  normalizeExamType,
} = require('../services/semesterSurvivalService');

const router = express.Router();

router.get('/options', (req, res) => {
  const branches = OFFICIAL_BRANCHES;

  const semesters = [
    ...new Set(
      SUBJECT_CATALOG.map((entry) => Number(entry.semester)).filter(Boolean)
    ),
  ].sort((a, b) => a - b);

  res.json({
    branches,
    semesters,
    examTypes: EXPECTED_EXAM_TYPES,
    years: EXPECTED_YEARS,
  });
});

router.get('/', async (req, res) => {
  try {
    const branch = normalizeBranch(req.query.branch);
    const semester = clampSemester(req.query.semester);
    const examType = normalizeExamType(req.query.examType);

    const catalogEntry = SUBJECT_CATALOG.find(
      (entry) =>
        String(entry.branch || '').trim().toUpperCase() === branch &&
        Number(entry.semester) === semester
    );

    if (!catalogEntry) {
      return res.status(404).json({
        error: 'No subject catalog exists for that branch/semester.',
      });
    }

    const subjectCodes = (catalogEntry.subjects || [])
      .map((subject) => String(subject.code || '').trim().toUpperCase())
      .filter(Boolean);

    const [papers, resources, questions] = await Promise.all([
      Paper.find({ semester, reviewStatus: { $nin: ['processing', 'needs_review', 'failed'] } })
        .select(
          'title subject normalizedSubject subjectCode branch semester examType year'
        )
        .lean(),

      Resource.find({
        status: 'active',
        subjectCode: { $in: subjectCodes },
      })
        .select(
          'title kind subjectKey subjectCode subjectName branches semesters examType year views downloads'
        )
        .lean(),

      Question.find({
        subjectCode: { $in: subjectCodes },
        semester,
        status: { $ne: 'rejected' }, needsReview: { $ne: true },
        ...(examType ? { examType } : {}),
      })
        .sort({ year: -1, sequence: 1 })
        .limit(2500)
        .populate('paperId', '_id title filePath solutionPath')
        .lean(),
    ]);

    const questionIds = questions.map((question) => question._id);

    const solutionRows = questionIds.length
      ? await QuestionSolution.aggregate([
          {
            $match: {
              questionId: { $in: questionIds },
              status: 'approved',
            },
          },
          {
            $group: {
              _id: '$questionId',
              count: { $sum: 1 },
            },
          },
        ])
      : [];

    const solutionCounts = Object.fromEntries(
      solutionRows.map((row) => [String(row._id), row.count])
    );

    const pack = buildSemesterSurvivalPack({
      branch,
      semester,
      examType,
      papers,
      resources,
      questions,
      solutionCounts,
      subjectCatalog: SUBJECT_CATALOG,
      expectedYears: EXPECTED_YEARS,
      expectedExamTypes: EXPECTED_EXAM_TYPES,
    });

    res.json({
      ...pack,
      limits: {
        questionLimitApplied: questions.length >= 2500,
      },
    });
  } catch (error) {
    console.error('Semester survival pack failed:', error);

    res.status(500).json({
      error: 'Failed to build semester survival pack',
    });
  }
});

module.exports = router;
