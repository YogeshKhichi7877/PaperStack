function integerEnv(value, fallback, { min = 1, max = Number.MAX_SAFE_INTEGER } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(parsed)));
}

function rateLimitConfig(env = process.env) {
  return {
    generalApi: {
      windowMs: integerEnv(env.GENERAL_API_RATE_LIMIT_WINDOW_MS, 2 * 60 * 1000, { min: 1000 }),
      max: integerEnv(env.GENERAL_API_RATE_LIMIT_MAX, 300),
    },
    studentBurst: {
      windowMs: integerEnv(env.STUDENT_AI_BURST_WINDOW_MS, 60 * 1000, { min: 1000 }),
      max: integerEnv(env.STUDENT_AI_BURST_MAX, 12),
    },
    studentQuota: {
      windowMs: integerEnv(env.STUDENT_AI_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000, { min: 1000 }),
      max: integerEnv(env.STUDENT_AI_RATE_LIMIT_MAX, 80),
    },
    questionExtraction: {
      windowMs: integerEnv(env.QUESTION_EXTRACTION_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000, { min: 1000 }),
      max: integerEnv(env.QUESTION_EXTRACTION_RATE_LIMIT_MAX, 20),
    },
    extractionConcurrency: integerEnv(env.QUESTION_EXTRACTION_AI_CONCURRENCY, 1, { min: 1, max: 4 }),
  };
}

module.exports = { integerEnv, rateLimitConfig };
