const express = require('express');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { recordAnswerFeedback } = require('../services/semanticAiAnswerService');

function createAiFeedbackRoutes({ authenticate }) {
  const router = express.Router();
  const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });

  router.post('/', authenticate, limiter, async (req, res) => {
    try {
      const answerId = String(req.body?.answerId || '');
      const value = String(req.body?.value || '');
      const reason = String(req.body?.reason || '');
      if (!mongoose.Types.ObjectId.isValid(answerId)) return res.status(400).json({ error: 'Invalid answer id' });
      if (!['helpful', 'not_helpful'].includes(value)) return res.status(400).json({ error: 'Invalid feedback value' });
      if (!['', 'incorrect', 'unclear', 'incomplete', 'not_relevant', 'other'].includes(reason)) return res.status(400).json({ error: 'Invalid feedback reason' });
      const result = await recordAnswerFeedback({ userId: req.user._id || req.user.id, answerId, value, reason });
      return res.json({ success: true, feedback: result });
    } catch (error) {
      return res.status(Number(error.statusCode || 500)).json({ error: error.statusCode ? error.message : 'Failed to save AI feedback' });
    }
  });

  return router;
}

module.exports = { createAiFeedbackRoutes };
