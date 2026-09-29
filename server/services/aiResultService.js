const RESULT_STATUSES = Object.freeze([
  'verified',
  'high_confidence',
  'partial',
  'local_only',
  'ai_unavailable',
  'failed',
]);

const VERIFICATION_STATUSES = Object.freeze([
  'verified',
  'unverified',
  'not_applicable',
]);

function normalizeConfidence(value) {
  if (['high', 'medium', 'low'].includes(value)) return value;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 'low';
  if (numeric >= 80) return 'high';
  if (numeric >= 55) return 'medium';
  return 'low';
}

function createAiResult({
  success = true,
  task = 'GENERAL_ACADEMIC',
  text = '',
  structuredData = null,
  verification = {},
  confidence = 'low',
  degraded = false,
  status,
  internal = null,
} = {}) {
  const verificationStatus = VERIFICATION_STATUSES.includes(verification.status)
    ? verification.status
    : 'not_applicable';
  const normalizedStatus = RESULT_STATUSES.includes(status)
    ? status
    : success
      ? (degraded ? 'partial' : 'high_confidence')
      : 'failed';

  return {
    success: Boolean(success),
    task: String(task || 'GENERAL_ACADEMIC'),
    text: String(text || ''),
    structuredData: structuredData ?? null,
    verification: {
      status: verificationStatus,
      details: Array.isArray(verification.details)
        ? verification.details.map(String).slice(0, 20)
        : [],
    },
    confidence: normalizeConfidence(confidence),
    degraded: Boolean(degraded),
    status: normalizedStatus,
    ...(internal ? { internal } : {}),
  };
}

module.exports = {
  RESULT_STATUSES,
  VERIFICATION_STATUSES,
  createAiResult,
  normalizeConfidence,
};
