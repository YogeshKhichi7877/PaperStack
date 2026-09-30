const express = require('express');
const mongoose = require('mongoose');
const Paper = require('../models/Paper');
const {
  enqueueJob,
  getActiveJobByKey,
  getJob,
} = require('../services/backgroundJobService');
const { createRateLimiters } = require('../middleware/aiRateLimiters');

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
  const { questionExtractionLimiter, config } = createRateLimiters(process.env);

  router.use(authenticateAdmin);

  router.get('/status', (req, res) => {
    res.json({
      version: EXTRACTION_VERSION,
      localRules: true,
      minimumConfidence: extractionThreshold(),
      ai: getQuestionAiStatus(),
      batchLimit: 10,
      backgroundJobs: true,
      queueBackend: 'process',
      queueConcurrency: config.extractionConcurrency,
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

  async function loadExtractionState(req, res, next) {
    try {
      if (!mongoose.Types.ObjectId.isValid(String(req.params.paperId || ''))) {
        return res.status(400).json({ error: 'Invalid paper id' });
      }

      const paper = await Paper.findById(req.params.paperId)
        .select('_id questionExtractionStatus')
        .lean();
      if (!paper) return res.status(404).json({ success: false, error: 'Paper not found' });
      const dedupeKey = `question-extraction:${String(paper._id)}`;
      req.extractionPaper = paper;
      req.extractionDedupeKey = dedupeKey;
      req.existingExtractionJob = getActiveJobByKey(dedupeKey);
      return next();
    } catch (error) {
      return next(error);
    }
  }

  router.post('/paper/:paperId', loadExtractionState, questionExtractionLimiter, async (req, res) => {
    try {
      if (req.existingExtractionJob) {
        return res.status(202).json({
          success: true,
          queued: true,
          deduplicated: true,
          job: req.existingExtractionJob,
        });
      }

      await Paper.findByIdAndUpdate(req.params.paperId, {
        $set: { questionExtractionStatus: 'queued', questionsUpdatedAt: new Date() },
      });
      const job = enqueueJob(
        'question-extraction',
        () => extractPaperQuestions({
          paperId: req.params.paperId,
          force: Boolean(req.body?.force),
          allowAi: req.body?.allowAi !== false,
        }),
        {
          queue: 'question-extraction',
          concurrency: config.extractionConcurrency,
          dedupeKey: req.extractionDedupeKey,
        }
      );
      return res.status(202).json({ success: true, queued: true, job });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      if (statusCode >= 500) {
        console.error('Question extraction failed:', error);
      }
      return res.status(statusCode).json({
        success: false,
        error: error.message || 'Question extraction failed',
      });
    }
  });

  router.post('/batch', questionExtractionLimiter, async (req, res) => {
    try {
      const job = enqueueJob(
        'question-extraction-batch',
        () => extractQuestionBatch({
          limit: req.body?.limit || 5,
          allowAi: Boolean(req.body?.allowAi),
          force: Boolean(req.body?.force),
        }),
        {
          queue: 'question-extraction',
          concurrency: config.extractionConcurrency,
          dedupeKey: 'question-extraction:batch',
        }
      );
      return res.status(202).json({
        success: true,
        queued: true,
        deduplicated: Boolean(job.deduplicated),
        job,
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
