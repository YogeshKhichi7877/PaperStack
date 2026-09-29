const test = require('node:test');
const assert = require('node:assert/strict');
const { createAiResult, normalizeConfidence } = require('./aiResultService');

test('AI results expose provider-neutral status and verification metadata', () => {
  const result = createAiResult({
    task: 'NUMERICAL_REASONING',
    text: '42',
    verification: { status: 'verified', details: ['expression matched'] },
    confidence: 92,
    status: 'verified',
  });
  assert.equal(result.status, 'verified');
  assert.equal(result.confidence, 'high');
  assert.equal(result.verification.status, 'verified');
  assert.equal('provider' in result, false);
});

test('confidence normalization is bounded to public labels', () => {
  assert.equal(normalizeConfidence(70), 'medium');
  assert.equal(normalizeConfidence('unexpected'), 'low');
});
