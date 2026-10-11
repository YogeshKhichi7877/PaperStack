const test = require('node:test');
const assert = require('node:assert/strict');
const { calculateMastery, calculateReview, weakTopicScore } = require('./masteryService');

test('one easy correct answer does not create high-confidence mastery', () => {
  const result = calculateMastery({}, { actualScore: 1, difficulty: 'easy', firstAttempt: true, timeSpentSeconds: 30 });
  assert.ok(result.masteryScore < 70);
  assert.ok(result.masteryConfidence < 0.2);
  assert.equal(result.totalAttempts, 1);
});

test('many strong attempts create strong mastery with higher confidence', () => {
  let state = {};
  for (let index = 0; index < 20; index += 1) state = { ...state, ...calculateMastery(state, { actualScore: index < 18 ? 1 : 0, difficulty: 'medium', firstAttempt: true, timeSpentSeconds: 45 }) };
  assert.ok(state.masteryScore >= 80);
  assert.ok(state.masteryConfidence > 0.7);
});

test('poor performance schedules tomorrow and raises weak priority', () => {
  const now = new Date('2026-10-11T12:00:00Z');
  const review = calculateReview({ reviewStage: 4 }, 0.3, now);
  assert.equal(review.reviewStage, 0);
  assert.equal(review.intervalDays, 1);
  const weak = weakTopicScore({ masteryScore: 35, masteryConfidence: 0.3, nextReviewAt: new Date('2026-10-01'), performanceHistory: [{ score: 0.2 }, { score: 0.4 }] }, now);
  assert.ok(weak.priority > 60);
});
