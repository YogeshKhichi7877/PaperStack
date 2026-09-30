const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');
const { rateLimitConfig } = require('../config/rateLimits');
const { recordAiMetric } = require('../services/aiMetricsService');

function actorKey(req) {
  const actor = req.user?._id || req.user?.id || req.admin?._id || req.admin?.id;
  return actor ? `actor:${String(actor)}` : `ip:${ipKeyGenerator(req.ip || '')}`;
}

function retryAfterSeconds(req, fallbackMs) {
  const reset = req.rateLimit?.resetTime;
  if (reset instanceof Date) return Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 1000));
  return Math.max(1, Math.ceil(fallbackMs / 1000));
}

function limitedHandler({ code, message, windowMs, metric }) {
  return (req, res) => {
    const retryAfter = retryAfterSeconds(req, windowMs);
    res.set('Retry-After', String(retryAfter));
    recordAiMetric(metric, {
      route: req.originalUrl,
      actorType: req.user || req.admin ? 'authenticated' : 'anonymous',
    });
    res.status(429).json({
      success: false,
      code,
      retryAfterSeconds: retryAfter,
      message,
      error: message,
    });
  };
}

function buildLimiter(settings, details, options = {}) {
  return rateLimit({
    windowMs: settings.windowMs,
    limit: settings.max,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || actorKey,
    skip: options.skip,
    handler: limitedHandler({ ...details, windowMs: settings.windowMs }),
  });
}

function createRateLimiters(env = process.env) {
  const config = rateLimitConfig(env);
  return {
    config,
    generalApiLimiter: buildLimiter(config.generalApi, {
      code: 'API_RATE_LIMITED',
      message: 'PaperStack is receiving too many requests. Please try again shortly.',
      metric: 'APP_RATE_LIMIT',
    }, { keyGenerator: (req) => `ip:${ipKeyGenerator(req.ip || '')}` }),
    studentAiBurstLimiter: buildLimiter(config.studentBurst, {
      code: 'AI_RATE_LIMITED',
      message: "You're sending requests too quickly. Please wait a few seconds and try again.",
      metric: 'STUDENT_AI_BURST_LIMIT',
    }),
    studentAiQuotaLimiter: buildLimiter(config.studentQuota, {
      code: 'AI_RATE_LIMITED',
      message: 'AI assistance has reached its current usage limit. Please try again later.',
      metric: 'STUDENT_AI_QUOTA_LIMIT',
    }),
    questionExtractionLimiter: buildLimiter(config.questionExtraction, {
      code: 'QUESTION_EXTRACTION_RATE_LIMITED',
      message: 'Question extraction is receiving too many new jobs. Please try again shortly.',
      metric: 'QUESTION_EXTRACTION_LIMIT',
    }, { skip: (req) => Boolean(req.existingExtractionJob) }),
  };
}

module.exports = { actorKey, createRateLimiters, retryAfterSeconds };
