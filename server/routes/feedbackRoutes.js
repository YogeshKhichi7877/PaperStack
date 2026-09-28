const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Testimonial = require('../models/Testimonial');
const Report = require('../models/Report');
const { validateTestimonial, validateSiteReport } = require('../utils/feedbackValidation');

const submitLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false });

module.exports = function createFeedbackRoutes({ authenticate, authenticateAdmin }) {
  const router = express.Router();

  router.get('/testimonials', async (req, res) => {
    try {
      const paginated = req.query.page != null;
      const page = Number(req.query.page || 1);
      if (!Number.isSafeInteger(page) || page < 1 || page > 100000) return res.status(400).json({ error: 'Invalid review page.' });
      const limit = paginated ? 12 : 30;
      const items = await Testimonial.find().select('displayName message rating branch semester createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit + (paginated ? 1 : 0)).lean();
      res.json(paginated ? { items: items.slice(0, limit), hasMore: items.length > limit, page } : items);
    } catch (error) {
      res.status(500).json({ error: 'Failed to load student experiences.' });
    }
  });

  router.post('/testimonials', authenticate, submitLimit, async (req, res) => {
    const parsed = validateTestimonial(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const userId = req.user?._id || req.user?.id;
    if (!mongoose.isValidObjectId(userId)) return res.status(401).json({ error: 'Please sign in again.' });
    try {
      const recent = await Testimonial.findOne({ authorUserId: userId, createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
      if (recent) return res.status(429).json({ error: 'You can share one experience per day.' });
      const user = await User.findById(userId).select('displayName username').lean();
      if (!user) return res.status(401).json({ error: 'Account not found.' });
      const item = await Testimonial.create({ ...parsed.value, authorUserId: userId, displayName: user.displayName || user.username });
      return res.status(201).json({ _id: item._id, displayName: item.displayName, message: item.message, rating: item.rating, branch: item.branch, semester: item.semester, createdAt: item.createdAt });
    } catch (error) {
      return res.status(500).json({ error: 'Could not submit your experience.' });
    }
  });

  router.delete('/admin/testimonials/:id', authenticateAdmin, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid testimonial ID.' });
    try {
      const removed = await Testimonial.findByIdAndDelete(req.params.id);
      return removed ? res.json({ message: 'Testimonial deleted.' }) : res.status(404).json({ error: 'Testimonial not found.' });
    } catch (error) {
      return res.status(500).json({ error: 'Could not delete testimonial.' });
    }
  });

  router.post('/site-reports', authenticate, submitLimit, async (req, res) => {
    const parsed = validateSiteReport(req.body);
    if (parsed.error) return res.status(400).json({ error: parsed.error });
    const userId = req.user?._id || req.user?.id;
    if (!mongoose.isValidObjectId(userId)) return res.status(401).json({ error: 'Please sign in again.' });
    try {
      const recent = await Report.findOne({ reporterUserId: userId, title: parsed.value.title, createdAt: { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } });
      if (recent) return res.status(409).json({ error: 'You already submitted this report today.' });
      const user = await User.findById(userId).select('displayName username email').lean();
      if (!user) return res.status(401).json({ error: 'Account not found.' });
      const report = await Report.create({ ...parsed.value, reporterUserId: userId, reporterName: user.displayName || user.username, reporterEmail: user.email, reason: 'Other' });
      return res.status(201).json({ message: 'Report submitted. Thank you for helping us improve PaperStack.', id: report._id });
    } catch (error) {
      return res.status(500).json({ error: 'Could not submit the report.' });
    }
  });

  return router;
};
