const express = require('express');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const { analyzeContributionFile } = require('../services/smartContributionService');
const { getFreeAiStatus } = require('../services/freeAiMetadataService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || /\.pdf$/i.test(file.originalname || '');
    if (!isPdf) return cb(new Error('Only PDF files can be analyzed'));
    cb(null, true);
  },
});

const analyzeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many paper analyses. Please wait a few minutes and try again.' },
});

module.exports = function createSmartContributionRouter({ authenticate }) {
  if (typeof authenticate !== 'function') {
    throw new Error('Smart Contribution router requires authenticate middleware');
  }

  const router = express.Router();

  router.get('/analyze/status', authenticate, (req, res) => {
    res.json({
      ruleEngine: true,
      ai: getFreeAiStatus(),
    });
  });

  router.post('/analyze', authenticate, analyzeLimiter, (req, res, next) => {
    upload.single('file')(req, res, (error) => {
      if (error) return res.status(400).json({ error: error.message });
      next();
    });
  }, async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'Paper PDF is required' });
      const analysis = await analyzeContributionFile(req.file);
      return res.json({ success: true, analysis });
    } catch (error) {
      console.error('Smart contribution analysis failed:', error.message);
      return res.status(500).json({
        success: false,
        error: 'Paper analysis failed. You can still fill the contribution form manually.',
      });
    }
  });

  return router;
};
