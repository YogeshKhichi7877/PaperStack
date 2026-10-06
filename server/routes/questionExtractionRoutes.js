const { queuePaperProcessing, getProcessingJob } = require('../services/paperProcessingQueue');
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
      recoveryBackend: 'mongodb-paper',
      selectiveOcr: true,
      stages: ['queued', 'extracting_text', 'ocr', 'extracting_metadata', 'extracting_questions', 'classifying', 'saving', 'needs_review', 'completed', 'failed'],
      queueConcurrency: config.extractionConcurrency,
    });
  });

  router.get('/jobs/:jobId', async (req, res) => {
    if (!/^[a-zA-Z0-9-]{1,80}$/.test(req.params.jobId)) return res.status(400).json({ error: 'Invalid job id' });
    let job;
    try { job = getJob(req.params.jobId) || await getProcessingJob(req.params.jobId);
      if (job?.type === 'question-extraction') job = await getProcessingJob(req.params.jobId);
    } catch { return res.status(503).json({ error: 'Processing status is temporarily unavailable.' }); }
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

      const job = await queuePaperProcessing(req.params.paperId, { force: Boolean(req.body?.force), allowAi: req.body?.allowAi !== false });
      return res.status(202).json({ success: true, queued: true, job });
    } catch (error) {
      const statusCode = error.statusCode || 500;
      if (statusCode >= 500) {
        console.error('Question extraction failed:', error);
      }
      return res.status(statusCode).json({
        success: false,
        error: statusCode < 500 ? error.message : 'Paper processing failed.',
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
          afterId: mongoose.Types.ObjectId.isValid(String(req.body?.afterId || '')) ? String(req.body.afterId) : '',
        }),
        {
          // The coordinator awaits child jobs; it must not consume their worker slot.
          queue: 'question-extraction-batch',
          concurrency: 1,
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
        error: 'Batch processing failed.',
      });
    }
  });

  return router;
};
