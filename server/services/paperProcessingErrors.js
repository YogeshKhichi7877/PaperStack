function isTransientError(error = {}) {
  const status = error.response?.status || error.status;
  return Boolean(error.retryable || ['AI_TIMEOUT', 'ETIMEDOUT', 'ECONNRESET', 'ECONNABORTED', 'EAI_AGAIN', 'ENOTFOUND'].includes(error.code)
    || status === 429 || status >= 500 || error.failures?.some((failure) =>
      /^(?:timeout|network|circuit_cooldown|HTTP (?:429|5\d\d))$/.test(failure.category)));
}
module.exports = { isTransientError };
