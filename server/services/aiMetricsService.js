const counters = new Map();

function recordAiMetric(name, fields = {}) {
  const key = String(name || 'unknown');
  counters.set(key, (counters.get(key) || 0) + 1);
  console.info('PaperStack AI metric', {
    name: key,
    count: counters.get(key),
    ...fields,
  });
}

function aiMetricSnapshot() {
  return Object.fromEntries(counters);
}

function resetAiMetrics() {
  counters.clear();
}

module.exports = { aiMetricSnapshot, recordAiMetric, resetAiMetrics };
