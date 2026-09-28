const express = require('express');

const Question = require('../models/Question');
const QuestionSolution = require('../models/QuestionSolution');

const {
  answerQuery,
  isAiConfigured,
} = require('../services/askPaperStackService');

const router = express.Router();

router.get('/subjects', async (req, res) => {
  try {
    const rows = await Question.aggregate([
      {
        $match: {
          status: { $ne: 'rejected' },
          subjectCode: { $nin: ['', null] },
        },
      },
      {
        $group: {
          _id: {
            subjectCode: '$subjectCode',
            subject: '$subject',
            subjectKey: '$subjectKey',
            branch: '$branch',
            semester: '$semester',
          },
          totalQuestions: { $sum: 1 },
          examTypes: { $addToSet: '$examType' },
        },
      },
      {
        $sort: { '_id.subject': 1 },
      },
    ]);

    res.json({
      aiAvailable: isAiConfigured(),
      subjects: rows.map((row) => ({
        subjectCode: row._id.subjectCode || '',
        subject: row._id.subject || '',
        subjectKey: row._id.subjectKey || '',
        branch: row._id.branch || '',
        semester: row._id.semester ?? null,
        totalQuestions: row.totalQuestions,
        examTypes: row.examTypes.filter(Boolean).sort(),
      })),
    });
  } catch (error) {
    console.error('Ask PaperStack subjects failed:', error);

    res.status(500).json({
      error: 'Failed to load Ask PaperStack subjects',
    });
  }
});

router.post('/query', async (req, res) => {
  try {
    const query = String(req.body?.query || '').trim();
    const subjectCode = String(req.body?.subjectCode || '').trim().toUpperCase();
    const examType = String(req.body?.examType || '').trim();

    if (!query || query.length > 1200) {
      return res.status(400).json({
        error: 'Question must be between 1 and 1200 characters',
      });
    }
    if (subjectCode.length > 30 || examType.length > 30) return res.status(400).json({ error: 'Invalid subject or exam type' });

    const filter = {
      status: { $ne: 'rejected' },
    };

    if (subjectCode) {
      filter.subjectCode = subjectCode;
    }

    if (examType) {
      filter.examType = examType;
    }

    const questions = await Question.find(filter)
      .sort({ year: -1, sequence: 1 })
      .limit(600)
      .populate('paperId', '_id title filePath solutionPath')
      .lean();

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

    const enriched = questions.map((question) => ({
      ...question,
      approvedSolutionCount:
        solutionCounts[String(question._id)] || 0,
    }));

    const subjectLabel = subjectCode
      ? `${questions[0]?.subject || 'Selected subject'} (${subjectCode})`
      : 'the selected PaperStack archive';

    const result = await answerQuery(enriched, query, {
      subjectLabel,
      enableAi: true,
    });

    res.json({
      query,
      subjectCode,
      examType,
      aiAvailable: isAiConfigured(),
      ...result,
    });
  } catch (error) {
    console.error('Ask PaperStack query failed:', error);

    res.status(500).json({
      error: 'Failed to answer the PaperStack query',
    });
  }
});

module.exports = router;
