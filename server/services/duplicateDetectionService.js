const { normalizeText, questionSimilarity } = require('./pyqIntelligenceService');

function classifyTextDuplicate(left, right, { exactHash = false } = {}) {
  if (exactHash) return { classification: 'exact', confidence: 1, reason: 'matching content hash' };
  const normalizedLeft = normalizeText(left);
  const normalizedRight = normalizeText(right);
  if (normalizedLeft && normalizedLeft === normalizedRight) return { classification: 'exact', confidence: 1, reason: 'matching normalized text' };
  const similarity = questionSimilarity({ questionText: left }, { questionText: right });
  if (similarity >= 0.82) return { classification: 'probable', confidence: similarity, reason: 'high text similarity' };
  if (similarity >= 0.68) return { classification: 'possible', confidence: similarity, reason: 'moderate text similarity' };
  return { classification: 'distinct', confidence: 1 - similarity, reason: 'low text similarity' };
}

function bestDuplicateCandidate(item, candidates = [], getText = (value) => value.questionText || value.title || '') {
  return candidates
    .map((candidate) => ({ candidate, ...classifyTextDuplicate(getText(item), getText(candidate)) }))
    .filter((entry) => entry.classification !== 'distinct')
    .sort((a, b) => b.confidence - a.confidence)[0] || null;
}

module.exports = { bestDuplicateCandidate, classifyTextDuplicate };
