const express = require('express');
const mongoose = require('mongoose');

const Paper = require('../models/Paper');
const Question = require('../models/Question');
const { publicQuestion } = require('../services/questionService');

const router = express.Router();

function validObjectId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ''));
}

function positiveInt(value, fallback, max = 200) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
}

router.get('/meta', (req, res) => {
  res.json({
    schemaVersion: 'question-v1',
    sources: Question.QUESTION_SOURCES,
    statuses: Question.QUESTION_STATUSES,
    difficulties: Question.QUESTION_DIFFICULTIES,
    questionTypes: [
      'unknown',
      'theory',
      'numerical',
      'derivation',
      'coding',
      'diagram',
      'mcq',
      'short-answer',
      'long-answer',
    ],
  });
});

router.get('/stats', async (req, res) => {
  try {
    const [totalQuestions, papersWithQuestions, byExamType, byYear] = await Promise.all([
      Question.countDocuments({ status: { $ne: 'rejected' } }),
      Question.distinct('paperId', { status: { $ne: 'rejected' } }),
      Question.aggregate([
        { $match: { status: { $ne: 'rejected' }, examType: { $ne: '' } } },
        { $group: { _id: '$examType', count: { $sum: 1 } } },
        { $sort: { count: -1, _id: 1 } },
      ]),
      Question.aggregate([
        { $match: { status: { $ne: 'rejected' }, year: { $ne: null } } },
        { $group: { _id: '$year', count: { $sum: 1 } } },
        { $sort: { _id: -1 } },
      ]),
    ]);

    res.json({
      schemaVersion: 'question-v1',
      totalQuestions,
      papersWithQuestions: papersWithQuestions.length,
      byExamType: byExamType.map((item) => ({
        examType: item._id,
        count: item.count,
      })),
      byYear: byYear.map((item) => ({
        year: item._id,
        count: item.count,
      })),
    });
  } catch (error) {
    console.error('Question stats failed:', error);
    res.status(500).json({ error: 'Failed to load question statistics' });
  }
});

router.get('/paper/:paperId', async (req, res) => {
  try {
    if (!validObjectId(req.params.paperId)) {
      return res.status(400).json({ error: 'Invalid paper id' });
    }

    const paper = await Paper.findById(req.params.paperId)
      .select('_id title subject subjectCode branch semester year examType filePath questionCount questionExtractionStatus questionExtractionVersion')
      .lean();

    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    const questions = await Question.find({
      paperId: paper._id,
      status: { $ne: 'rejected' },
    })
      .sort({ sequence: 1, questionKey: 1 })
      .lean();

    res.json({
      schemaVersion: 'question-v1',
      paper,
      count: questions.length,
      extractionStatus: paper.questionExtractionStatus || 'not_started',
      questions: questions.map(publicQuestion),
    });
  } catch (error) {
    console.error('Paper questions failed:', error);
    res.status(500).json({ error: 'Failed to load paper questions' });
  }
});

router.get('/', async (req, res) => {
  try {
    const filter = {
      status: { $ne: 'rejected' },
    };

    if (req.query.paperId) {
      if (!validObjectId(req.query.paperId)) {
        return res.status(400).json({ error: 'Invalid paper id' });
      }
      filter.paperId = req.query.paperId;
    }

    if (req.query.subjectKey) filter.subjectKey = String(req.query.subjectKey);
    if (req.query.subjectCode) filter.subjectCode = String(req.query.subjectCode).toUpperCase();
    if (req.query.branch) filter.branch = String(req.query.branch);
    if (req.query.semester) filter.semester = Number(req.query.semester);
    if (req.query.year) filter.year = Number(req.query.year);
    if (req.query.examType) filter.examType = String(req.query.examType);
    if (req.query.topic) filter.topics = String(req.query.topic);
    if (req.query.unit) filter.unit = Number(req.query.unit);
    if (req.query.needsReview === 'true') filter.needsReview = true;

    if (req.query.q && String(req.query.q).trim()) {
      filter.$text = { $search: String(req.query.q).trim() };
    }

    const limit = positiveInt(req.query.limit, 50, 200);
    const page = positiveInt(req.query.page, 1, 100000);
    const skip = (page - 1) * limit;

    const [questions, total] = await Promise.all([
      Question.find(filter)
        .sort(req.query.q ? { score: { $meta: 'textScore' }, year: -1, sequence: 1 } : { year: -1, sequence: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Question.countDocuments(filter),
    ]);

    res.json({
      schemaVersion: 'question-v1',
      page,
      limit,
      total,
      questions: questions.map(publicQuestion),
    });
  } catch (error) {
    console.error('Question list failed:', error);
    res.status(500).json({ error: 'Failed to load questions' });
  }
});

router.get('/:questionId', async (req, res) => {
  try {
    if (!validObjectId(req.params.questionId)) {
      return res.status(400).json({ error: 'Invalid question id' });
    }

    const question = await Question.findById(req.params.questionId).lean();
    if (!question || question.status === 'rejected') {
      return res.status(404).json({ error: 'Question not found' });
    }

    const paper = await Paper.findById(question.paperId)
      .select('_id title filePath solutionPath')
      .lean();

    res.json({
      schemaVersion: 'question-v1',
      question: publicQuestion(question),
      paper,
    });
  } catch (error) {
    console.error('Question detail failed:', error);
    res.status(500).json({ error: 'Failed to load question' });
  }
});

module.exports = router;
