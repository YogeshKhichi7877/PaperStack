const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateRatingChange, expectedScore, tierForRating } = require('./ratingService');

test('equal rating correct answer gains sixteen for a new student', () => {
  const result = calculateRatingChange(1000, 1000, 1, 0);
  assert.equal(expectedScore(1000, 1000), 0.5);
  assert.equal(result.delta, 16);
  assert.equal(result.newRating, 1016);
});

test('beating a much harder question gains substantially more', () => {
  const easy = calculateRatingChange(1500, 900, 1, 0);
  const hard = calculateRatingChange(1000, 1400, 1, 0);
  assert.ok(easy.delta <= 2);
  assert.ok(hard.delta >= 28);
});

test('tiers follow PaperStack thresholds', () => {
  assert.equal(tierForRating(1542), 'Expert');
  assert.equal(tierForRating(1000), 'Learner');
});
