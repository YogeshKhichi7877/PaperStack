const express = require('express');

const Question = require('../models/Question');
const { OFFICIAL_BRANCHES, normalizeBranchList } = require('../utils/branches');
const {
  browserQuestion,
  buildQuestionFilter,
  buildQuestionSort,
  normalizeBrowserQuery,
} = require('../services/questionBrowserService');

const router = express.Router();

async function buildFacets() {
  const baseMatch = {
    status: { $ne: 'rejected' },
  };

  const [
    totalQuestions,
    subjects,
    branches,
    semesters,
    years,
    examTypes,
    marks,
    units,
    questionTypes,
    difficulties,
    topics,
  ] = await Promise.all([
    Question.countDocuments(baseMatch),

    Question.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: {
            subjectKey: '$subjectKey',
            subject: '$subject',
            subjectCode: '$subjectCode',
            shortCode: '$shortCode',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.subject': 1 } },
    ]),

    Question.aggregate([
      { $match: { ...baseMatch, branch: { $ne: '' } } },
      { $group: { _id: '$branch', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Question.aggregate([
      { $match: { ...baseMatch, semester: { $ne: null } } },
      { $group: { _id: '$semester', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Question.aggregate([
      { $match: { ...baseMatch, year: { $ne: null } } },
      { $group: { _id: '$year', count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
    ]),

    Question.aggregate([
      { $match: { ...baseMatch, examType: { $ne: '' } } },
      { $group: { _id: '$examType', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),

    Question.aggregate([
      { $match: { ...baseMatch, marks: { $ne: null } } },
      { $group: { _id: '$marks', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Question.aggregate([
      { $match: { ...baseMatch, unit: { $ne: null } } },
      { $group: { _id: '$unit', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),

    Question.aggregate([
      { $match: { ...baseMatch, questionType: { $nin: ['', null] } } },
      { $group: { _id: '$questionType', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),

    Question.aggregate([
      { $match: { ...baseMatch, difficulty: { $nin: ['', null] } } },
      { $group: { _id: '$difficulty', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]),

    Question.aggregate([
      { $match: baseMatch },
      { $unwind: '$topics' },
      { $match: { topics: { $nin: ['', null] } } },
      { $group: { _id: '$topics', count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 60 },
    ]),
  ]);

  return {
    totalQuestions,
    subjects: subjects.map((item) => ({
      subjectKey: item._id.subjectKey || '',
      subject: item._id.subject || '',
      subjectCode: item._id.subjectCode || '',
      shortCode: item._id.shortCode || '',
      count: item.count,
    })),
    branches: OFFICIAL_BRANCHES.map((value) => ({
      value,
      count: branches.reduce((total, item) => total + (normalizeBranchList(item._id).includes(value) ? item.count : 0), 0),
    })),
    semesters: semesters.map((item) => ({ value: item._id, count: item.count })),
    years: years.map((item) => ({ value: item._id, count: item.count })),
    examTypes: examTypes.map((item) => ({ value: item._id, count: item.count })),
    marks: marks.map((item) => ({ value: item._id, count: item.count })),
    units: units.map((item) => ({ value: item._id, count: item.count })),
    questionTypes: questionTypes.map((item) => ({ value: item._id, count: item.count })),
    difficulties: difficulties.map((item) => ({ value: item._id, count: item.count })),
    topics: topics.map((item) => ({ value: item._id, count: item.count })),
  };
}

router.get('/facets', async (req, res) => {
  try {
    const facets = await buildFacets();
    res.json({
      schemaVersion: 'question-browser-v1',
      ...facets,
    });
  } catch (error) {
    console.error('Question browser facets failed:', error);
    res.status(500).json({ error: 'Failed to load question filters' });
  }
});

router.get('/random', async (req, res) => {
  try {
    const normalized = normalizeBrowserQuery(req.query);
    const filter = buildQuestionFilter(normalized);
    const total = await Question.countDocuments(filter);

    if (!total) {
      return res.json({
        schemaVersion: 'question-browser-v1',
        total: 0,
        question: null,
      });
    }

    const skip = Math.floor(Math.random() * total);

    const question = await Question.findOne(filter)
      .sort(buildQuestionSort('latest'))
      .skip(skip)
      .populate(
        'paperId',
        '_id title filePath solutionPath questionExtractionStatus'
      )
      .lean();

    res.json({
      schemaVersion: 'question-browser-v1',
      total,
      question: question ? browserQuestion(question) : null,
    });
  } catch (error) {
    console.error('Random question failed:', error);
    res.status(500).json({ error: 'Failed to pick a practice question' });
  }
});

router.get('/', async (req, res) => {
  try {
    const normalized = normalizeBrowserQuery(req.query);
    const filter = buildQuestionFilter(normalized);
    const skip = (normalized.page - 1) * normalized.limit;

    const [questions, total] = await Promise.all([
      Question.find(filter)
        .sort(buildQuestionSort(normalized.sort))
        .skip(skip)
        .limit(normalized.limit)
        .populate(
          'paperId',
          '_id title filePath solutionPath questionExtractionStatus'
        )
        .lean(),
      Question.countDocuments(filter),
    ]);

    res.json({
      schemaVersion: 'question-browser-v1',
      page: normalized.page,
      limit: normalized.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / normalized.limit)),
      questions: questions.map(browserQuestion),
    });
  } catch (error) {
    console.error('Question browser failed:', error);
    res.status(500).json({ error: 'Failed to browse questions' });
  }
});

module.exports = router;
