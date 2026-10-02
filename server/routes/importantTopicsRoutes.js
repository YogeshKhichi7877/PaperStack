const express = require('express');

const Question = require('../models/Question');
const {
  buildImportantTopics,
} = require('../services/importantTopicsService');

const router = express.Router();

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function cacheKey(subjectCode, threshold, limit) {
  return [
    String(subjectCode || '').toUpperCase(),
    Number(threshold) || 72,
    Number(limit) || 30,
  ].join('|');
}

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;

  if (Date.now() - item.createdAt > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }

  return item.payload;
}

function setCached(key, payload) {
  cache.set(key, {
    createdAt: Date.now(),
    payload,
  });
}

router.get('/subjects', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
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
          },
          totalQuestions: { $sum: 1 },
          years: { $addToSet: '$year' },
          topicTaggedQuestions: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $ne: ['$primaryTopic', ''] },
                    { $gt: [{ $size: { $ifNull: ['$topics', []] } }, 0] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { '_id.subject': 1 } },
    ]);

    res.json({
      subjects: rows.map((row) => ({
        subjectCode: row._id.subjectCode || '',
        subject: row._id.subject || '',
        subjectKey: row._id.subjectKey || '',
        shortCode: row._id.shortCode || '',
        totalQuestions: row.totalQuestions,
        yearsCovered: row.years.filter(Boolean).length,
        topicTaggedQuestions: row.topicTaggedQuestions,
      })),
    });
  } catch (error) {
    console.error('Important topics subjects failed:', error);
    res.status(500).json({
      error: 'Failed to load subjects for Important Topics',
    });
  }
});

router.get('/subject/:subjectCode', async (req, res) => {
  try {
    const subjectCode = String(
      req.params.subjectCode || ''
    ).trim().toUpperCase();

    if (!subjectCode) {
      return res.status(400).json({
        error: 'Subject code is required',
      });
    }

    const threshold = Number(req.query.threshold || 72);
    const limit = Math.max(
      1,
      Math.min(Number(req.query.limit) || 30, 100)
    );

    const key = cacheKey(subjectCode, threshold, limit);
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
      .limit(1500)
      .select('_id paperId questionNumber questionLabel questionText marks questionType difficulty unit primaryTopic topics sourceLocation subjectKey subject subjectCode shortCode branch semester examType year extraction status')
      .populate(
        'paperId',
        '_id title filePath'
      )
      .lean();

    const analysis = buildImportantTopics(
      questions,
      {
        repeatThreshold: threshold,
        limit,
      }
    );

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
      ...analysis,
      generatedAt: new Date().toISOString(),
      questionLimitApplied: questions.length >= 1500,
      cached: false,
    };

    setCached(key, payload);
    res.json(payload);
  } catch (error) {
    console.error('Important topics analysis failed:', error);
    res.status(500).json({
      error: 'Failed to calculate Important Topics',
    });
  }
});

router.post('/cache/clear', (req, res) => {
  cache.clear();
  res.json({
    message: 'Important Topics cache cleared',
  });
});

module.exports = router;
