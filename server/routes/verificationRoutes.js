const express = require('express');
const mongoose = require('mongoose');

const Paper = require('../models/Paper');
const PaperVerification = require('../models/PaperVerification');
const {
  ISSUE_LABELS,
  buildVerificationSummary,
  normalizeVerificationInput,
} = require('../services/verificationService');

function createVerificationRoutes({ authenticate }) {
  if (typeof authenticate !== 'function') {
    throw new Error('verificationRoutes requires authenticate middleware');
  }

  const router = express.Router();

function publicPaper(paper = {}) {
  return {
    _id: paper._id,
    title: paper.title,
    subject: paper.subject,
    subjectCode: paper.subjectCode || '',
    branch: paper.branch || '',
    semester: paper.semester || null,
    year: paper.year || null,
    examType: paper.examType || '',
    filePath: paper.filePath || '',
    solutionPath: paper.solutionPath || '',
    views: Number(paper.views || 0),
    downloads: Number(paper.downloads || 0),
    contributedByName: paper.contributedByName || paper.contributedBy || '',
  };
}

function validPaperId(value) {
  return mongoose.Types.ObjectId.isValid(String(value || ''));
}

router.get('/queue', async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 200);

    const papers = await Paper.find({})
      .sort({ year: -1, createdAt: -1 })
      .limit(limit)
      .lean();

    const paperIds = papers.map((paper) => paper._id);
    const verifications = paperIds.length
      ? await PaperVerification.find({ paperId: { $in: paperIds } }).lean()
      : [];

    const grouped = new Map();
    verifications.forEach((item) => {
      const key = String(item.paperId);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(item);
    });

    const statusPriority = {
      unverified: 0,
      collecting: 1,
      'needs-review': 2,
      verified: 3,
    };

    let items = papers.map((paper) => ({
      paper: publicPaper(paper),
      summary: buildVerificationSummary(grouped.get(String(paper._id)) || []),
    }));

    const requestedStatus = String(req.query.status || '').trim();
    if (requestedStatus) {
      items = items.filter((item) => item.summary.status === requestedStatus);
    }

    items.sort((a, b) => {
      const statusDiff =
        (statusPriority[a.summary.status] ?? 99) -
        (statusPriority[b.summary.status] ?? 99);

      if (statusDiff !== 0) return statusDiff;
      if (a.summary.totalResponses !== b.summary.totalResponses) {
        return a.summary.totalResponses - b.summary.totalResponses;
      }
      return Number(b.paper.year || 0) - Number(a.paper.year || 0);
    });

    const stats = items.reduce((acc, item) => {
      acc.total += 1;
      acc[item.summary.status] = (acc[item.summary.status] || 0) + 1;
      return acc;
    }, {
      total: 0,
      unverified: 0,
      collecting: 0,
      verified: 0,
      'needs-review': 0,
    });

    res.json({
      issueTypes: Object.entries(ISSUE_LABELS).map(([value, label]) => ({ value, label })),
      stats,
      items,
    });
  } catch (error) {
    console.error('Verification queue failed:', error);
    res.status(500).json({ error: 'Failed to load verification queue' });
  }
});

router.get('/papers/:paperId', async (req, res) => {
  try {
    if (!validPaperId(req.params.paperId)) {
      return res.status(400).json({ error: 'Invalid paper id' });
    }

    const paper = await Paper.findById(req.params.paperId).lean();
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    const verifications = await PaperVerification.find({
      paperId: req.params.paperId,
    }).lean();

    res.json({
      paper: publicPaper(paper),
      summary: buildVerificationSummary(verifications),
      issueTypes: Object.entries(ISSUE_LABELS).map(([value, label]) => ({ value, label })),
    });
  } catch (error) {
    console.error('Verification summary failed:', error);
    res.status(500).json({ error: 'Failed to load verification summary' });
  }
});

router.post('/papers/:paperId', authenticate, async (req, res) => {
  try {
    if (!validPaperId(req.params.paperId)) {
      return res.status(400).json({ error: 'Invalid paper id' });
    }

    const paper = await Paper.findById(req.params.paperId).lean();
    if (!paper) return res.status(404).json({ error: 'Paper not found' });

    const input = normalizeVerificationInput(req.body || {});
    const userId = req.user._id || req.user.id;

    if (!userId) return res.status(401).json({ error: 'User session is invalid' });

    await PaperVerification.findOneAndUpdate(
      {
        paperId: paper._id,
        userId,
      },
      {
        $set: input,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    const verifications = await PaperVerification.find({
      paperId: paper._id,
    }).lean();

    res.json({
      message: 'Verification saved successfully',
      summary: buildVerificationSummary(verifications),
    });
  } catch (error) {
    const status = error.statusCode || 500;
    if (status >= 500) console.error('Verification submit failed:', error);
    res.status(status).json({
      error: status >= 500 ? 'Failed to save verification' : error.message,
    });
  }
});

  return router;
}

module.exports = createVerificationRoutes;
