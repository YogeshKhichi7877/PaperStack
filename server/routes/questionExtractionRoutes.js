const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const Paper = require('../models/Paper');
const { enqueueJob, getJob } = require('../services/backgroundJobService');

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
      backgroundJobs: true,
      queueBackend: 'process',
    });
  });

  router.get('/jobs/:jobId', (req, res) => {
    const job = getJob(req.params.jobId);
    if (!job) return res.status(404).json({ error: 'Extraction job not found or expired' });
    return res.json({ job });
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

      if (req.body?.background === true) {
        const exists = await Paper.exists({ _id: req.params.paperId });
        if (!exists) return res.status(404).json({ success: false, error: 'Paper not found' });
        await Paper.findByIdAndUpdate(req.params.paperId, {
          $set: { questionExtractionStatus: 'queued', questionsUpdatedAt: new Date() },
        });
        const job = enqueueJob('question-extraction', () => extractPaperQuestions({
          paperId: req.params.paperId,
          force: Boolean(req.body?.force),
          allowAi: req.body?.allowAi !== false,
        }));
        return res.status(202).json({ success: true, queued: true, job });
      }

      const result = await extractPaperQuestions({
        paperId: req.params.paperId,
        force: Boolean(req.body?.force),
        allowAi: req.body?.allowAi !== false,
      });

      if (result.extractionStatus === 'failed' && !result.skipped) {
        return res.status(422).json({
          success: false,
          error: result.failureReason || 'No questions were identified in this PDF.',
          result,
        });
      }

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
      if (req.body?.background === true) {
        const job = enqueueJob('question-extraction-batch', () => extractQuestionBatch({
          limit: req.body?.limit || 5,
          allowAi: Boolean(req.body?.allowAi),
          force: Boolean(req.body?.force),
        }));
        return res.status(202).json({ success: true, queued: true, job });
      }
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
