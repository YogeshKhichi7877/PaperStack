const test = require('node:test');
const assert = require('node:assert/strict');
const { boundedEditDistance, expandAliases, fuzzyTokenScore } = require('./searchNormalizationService');

test('bounded typo tolerance handles realistic academic typos', () => {
  assert.equal(boundedEditDistance('midpont', 'midpoint', 1), 1);
  assert.ok(fuzzyTokenScore('computr graphics', 'computer graphics') >= 0.9);
});

test('common academic aliases expand deterministically', () => {
  const aliases = expandAliases('FNN');
  assert.ok(aliases.includes('feedforward neural network'));
});
