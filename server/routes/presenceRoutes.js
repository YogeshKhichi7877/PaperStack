const express = require('express');
const rateLimit = require('express-rate-limit');
const { getBearerToken } = require('../middleware/auth');

function createPresenceRouter({ authenticate, authenticateAdmin, service }) {
  const router = express.Router();
  const heartbeatLimit = rateLimit({ windowMs: 60000, limit: 600, standardHeaders: 'draft-8', legacyHeaders: false });
  router.use('/admin/analytics', rateLimit({ windowMs: 60000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false }));
  router.post('/presence/heartbeat', heartbeatLimit, (req, res, next) => {
    // Reuse the existing JWT verification, without a Mongo lookup.
    if (!getBearerToken(req)) return next();
    if (req.header('X-Presence-Admin') === '1') return authenticateAdmin(req, res, next);
    return authenticate(req, res, next);
  }, async (req, res) => {
    const body = req.body || {};
    const validId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{16,80}$/.test(value);
    if (!validId(body.sessionId) || !validId(body.anonymousId) || typeof body.route !== 'string' || body.route.length > 200 || (body.subjectCode != null && (typeof body.subjectCode !== 'string' || body.subjectCode.length > 20))) {
      return res.status(400).json({ error: 'Invalid presence payload' });
    }
    try { await service.heartbeat(body, { userId: req.user?._id, admin: Boolean(req.admin) }); } catch { /* Optional presence must not affect studying. */ }
    res.status(204).end();
  });
  router.get('/admin/analytics/live', authenticateAdmin, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { res.json(await service.live()); } catch { res.status(503).json({ error: 'Live usage is temporarily unavailable.' }); }
  });
  router.get('/admin/analytics/presence/history', authenticateAdmin, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    try { res.json(await service.history()); } catch { res.status(503).json({ error: 'Usage history is temporarily unavailable.' }); }
  });
  return router;
}
module.exports = { createPresenceRouter };
