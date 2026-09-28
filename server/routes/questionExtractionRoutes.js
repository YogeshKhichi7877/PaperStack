const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');

const {
  EXTRACTION_VERSION,
  extractPaperQuestions,
  extractQuestionBatch,
  extractionThreshold,
  listExtractionPapers,
} = require('../services/questionExtractionService');
const {
  getQuestionAiStatus,
} = require('../services/freeAiQuestionService');

module.exports = function createQuestionExtractionRouter({ authenticateAdmin }) {
  if (typeof authenticateAdmin !== 'function') {
    throw new Error('Question extraction router requires authenticateAdmin middleware');
  }

  const router = express.Router();

  const extractionLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: 'Too many question extraction requests. Wait a few minutes and try again.',
    },
  });

  router.use(authenticateAdmin);
  router.use(extractionLimiter);

  router.get('/status', (req, res) => {
    res.json({
      version: EXTRACTION_VERSION,
      localRules: true,
      minimumConfidence: extractionThreshold(),
      ai: getQuestionAiStatus(),
      batchLimit: 10,
    });
  });

  router.get('/papers', async (req, res) => {
    try {
      const papers = await listExtractionPapers({
        limit: req.query.limit,
        status: String(req.query.status || ''),
      });

      res.json({
        count: papers.length,
        papers,
      });
    } catch (error) {
      console.error('Question extraction paper list failed:', error);
      res.status(500).json({ error: 'Failed to load extraction paper list' });
    }
  });

  router.post('/paper/:paperId', async (req, res) => {
    try {
      if (!mongoose.Types.ObjectId.isValid(String(req.params.paperId || ''))) {
        return res.status(400).json({ error: 'Invalid paper id' });
      }

      const result = await extractPaperQuestions({
        paperId: req.params.paperId,
        force: Boolean(req.body?.force),
        allowAi: req.body?.allowAi !== false,
      });

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      if (statusCode >= 500) {
        console.error('Question extraction failed:', error);
      }
      res.status(statusCode).json({
        success: false,
        error: error.message || 'Question extraction failed',
      });
    }
  });

  router.post('/batch', async (req, res) => {
    try {
      const result = await extractQuestionBatch({
        limit: req.body?.limit || 5,
        allowAi: Boolean(req.body?.allowAi),
        force: Boolean(req.body?.force),
      });

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      console.error('Question batch extraction failed:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Batch extraction failed',
      });
    }
  });

  return router;
};
