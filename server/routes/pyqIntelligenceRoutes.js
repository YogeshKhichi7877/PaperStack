const express = require('express');

const Question = require('../models/Question');
const {
  buildSubjectIntelligence,
  normalizeThreshold,
} = require('../services/pyqIntelligenceService');

const router = express.Router();

const CACHE_TTL_MS = 5 * 60 * 1000;
const subjectCache = new Map();

function cacheKey(subjectCode, threshold) {
  return `${String(subjectCode || '').toUpperCase()}|${threshold}`;
}

function getCached(key) {
  const item = subjectCache.get(key);
  if (!item) return null;

  if (Date.now() - item.createdAt > CACHE_TTL_MS) {
    subjectCache.delete(key);
    return null;
  }

  return item.value;
}

function setCached(key, value) {
  subjectCache.set(key, {
    createdAt: Date.now(),
    value,
  });
}

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
            shortCode: '$shortCode',
            semester: '$semester',
          },
          totalQuestions: { $sum: 1 },
          years: { $addToSet: '$year' },
          examTypes: { $addToSet: '$examType' },
        },
      },
      {
        $sort: {
          '_id.subject': 1,
        },
      },
    ]);

    res.json({
      subjects: rows.map((row) => ({
        subjectCode: row._id.subjectCode || '',
        subject: row._id.subject || '',
        subjectKey: row._id.subjectKey || '',
        shortCode: row._id.shortCode || '',
        semester: row._id.semester ?? null,
        totalQuestions: row.totalQuestions,
        yearsCovered: row.years.filter(Boolean).length,
        examTypesCovered: row.examTypes.filter(Boolean).length,
      })),
    });
  } catch (error) {
    console.error('PYQ intelligence subjects failed:', error);
    res.status(500).json({ error: 'Failed to load PYQ intelligence subjects' });
  }
});

router.get('/subject/:subjectCode', async (req, res) => {
  try {
    const subjectCode = String(req.params.subjectCode || '').trim().toUpperCase();
    const threshold = normalizeThreshold(req.query.threshold || 0.72);

    if (!subjectCode) {
      return res.status(400).json({ error: 'Subject code is required' });
    }

    const key = cacheKey(subjectCode, threshold);
    const cached = getCached(key);

    if (cached) {
      return res.json({
        ...cached,
        cached: true,
      });
    }

    const questions = await Question.find({
      subjectCode,
      status: { $ne: 'rejected' },
    })
      .sort({ year: -1, sequence: 1 })
      .limit(1000)
      .populate('paperId', '_id title filePath')
      .lean();

    const intelligence = buildSubjectIntelligence(questions, { threshold });

    const subject = questions[0]
      ? {
          subjectCode,
          subject: questions[0].subject || '',
          subjectKey: questions[0].subjectKey || '',
          shortCode: questions[0].shortCode || '',
          branch: questions[0].branch || '',
          semester: questions[0].semester ?? null,
        }
      : {
          subjectCode,
          subject: '',
          subjectKey: '',
          shortCode: '',
          branch: '',
          semester: null,
        };

    const payload = {
      subject,
      ...intelligence,
      questionLimitApplied: questions.length >= 1000,
      generatedAt: new Date().toISOString(),
      cached: false,
    };

    setCached(key, payload);
    res.json(payload);
  } catch (error) {
    console.error('PYQ subject intelligence failed:', error);
    res.status(500).json({ error: 'Failed to calculate PYQ intelligence' });
  }
});

router.post('/cache/clear', (req, res) => {
  subjectCache.clear();
  res.json({ message: 'PYQ intelligence cache cleared' });
});

module.exports = router;
