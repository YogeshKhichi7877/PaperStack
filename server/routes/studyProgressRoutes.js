const express = require('express');
const { listStudyProgress, recordStudyProgress } = require('../services/studyProgressService');

function createStudyProgressRoutes({ authenticate }) {
  const router = express.Router();
  router.get('/', authenticate, async (req, res) => {
    try { return res.json({ items: await listStudyProgress(req.user._id || req.user.id, { limit: req.query.limit }) }); }
    catch { return res.status(500).json({ error: 'Failed to load study progress' }); }
  });
  router.post('/', authenticate, async (req, res) => {
    try { return res.json({ item: await recordStudyProgress(req.user._id || req.user.id, req.body || {}) }); }
    catch (error) { return res.status(Number(error.statusCode || 500)).json({ error: error.statusCode ? error.message : 'Failed to record study progress' }); }
  });
  return router;
}

module.exports = { createStudyProgressRoutes };
