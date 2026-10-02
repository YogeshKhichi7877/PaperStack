const express = require('express');

const Question = require('../models/Question');
const { OFFICIAL_BRANCHES, normalizeBranchList } = require('../utils/branches');
const {
  browserQuestion,
  buildQuestionFilter,
  buildQuestionSort,
  normalizeBrowserQuery,
} = require('../services/questionBrowserService');
const { buildMiniPracticeSet, findRelatedQuestions } = require('../services/relatedQuestionService');

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
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
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

router.get('/:questionId/related', async (req, res, next) => {
  if (req.params.questionId === 'facets' || req.params.questionId === 'random' || req.params.questionId === 'mini-practice') return next();
  try {
    const question = await Question.findOne({ _id: req.params.questionId, status: { $ne: 'rejected' } }).lean();
    if (!question) return res.status(404).json({ error: 'Question not found' });
    const questions = await findRelatedQuestions(question, { limit: req.query.limit });
    return res.json({ schemaVersion: 'question-browser-v2', questionId: String(question._id), questions });
  } catch (error) {
    if (error?.name === 'CastError') return res.status(400).json({ error: 'Invalid question id' });
    return res.status(500).json({ error: 'Failed to load related questions' });
  }
});

router.get('/mini-practice', async (req, res) => {
  try {
    const limit = Math.min(10, Math.max(3, Number(req.query.limit) || 5));
    let base = null;
    if (req.query.questionId) base = await Question.findOne({ _id: req.query.questionId, status: { $ne: 'rejected' } }).lean();
    if (!base) {
      const filter = buildQuestionFilter({ subjectCode: req.query.subjectCode, subjectKey: req.query.subjectKey, topic: req.query.topic });
      base = await Question.findOne(filter).sort({ year: -1, sequence: 1 }).lean();
    }
    if (!base) return res.json({ schemaVersion: 'question-browser-v2', questions: [] });
    const subjectFilter = base.subjectCode ? { subjectCode: base.subjectCode } : { subjectKey: base.subjectKey };
    const candidates = await Question.find({ ...subjectFilter, status: { $ne: 'rejected' } })
      .sort({ year: -1, sequence: 1 }).limit(220)
      .populate('paperId', '_id title filePath solutionPath questionExtractionStatus').lean();
    const questions = buildMiniPracticeSet(base, candidates, limit).map(browserQuestion);
    return res.json({ schemaVersion: 'question-browser-v2', baseQuestionId: String(base._id), questions });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to build mini practice set' });
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
