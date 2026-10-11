const test = require('node:test');
const assert = require('node:assert/strict');
const { inferLearningLevel } = require('./studentLearningContextService');

test('learning level is deterministic from mastery evidence', () => {
  assert.equal(inferLearningLevel(null), 'BEGINNER');
  assert.equal(inferLearningLevel({ totalAttempts: 2, masteryScore: 58, masteryConfidence: 0.25 }), 'DEVELOPING');
  assert.equal(inferLearningLevel({ totalAttempts: 8, masteryScore: 74, masteryConfidence: 0.5 }), 'COMFORTABLE');
  assert.equal(inferLearningLevel({ totalAttempts: 12, masteryScore: 88, masteryConfidence: 0.7 }), 'STRONG');
});
