const test = require('node:test');
const assert = require('node:assert/strict');
const {
  answerReusable,
  exactRequestHash,
  normalizeAcademicRequest,
  reusableAcademicRequest,
  semanticScore,
} = require('./semanticAiAnswerService');

test('academic request normalization makes harmless wording stable', () => {
  assert.equal(normalizeAcademicRequest('Please, explain the Mid-Point formula!'), 'explain the midpoint formula');
  assert.equal(
    exactRequestHash({ task: 'QUESTION_TUTOR', mode: 'explain', subjectCode: 'CS502', request: 'Please explain perspective projection' }),
    exactRequestHash({ task: 'question_tutor', mode: 'EXPLAIN', subjectCode: 'cs502', request: 'explain perspective projection' })
  );
});

test('personalized tasks are excluded from reusable cache', () => {
  assert.equal(reusableAcademicRequest({ task: 'MOCK_EVALUATION', mode: 'solution' }), false);
  assert.equal(reusableAcademicRequest({ task: 'QUESTION_TUTOR', mode: 'solution', personalized: true }), false);
  assert.equal(reusableAcademicRequest({ task: 'QUESTION_TUTOR', mode: 'solution' }), true);
});

test('semantic reuse requires quality status and very high similarity', () => {
  assert.ok(semanticScore('explain midpoint line algorithm', 'Explain the mid point line algorithm') >= 0.88);
  assert.equal(answerReusable({ status: 'generated', negativeCount: 0 }, { semantic: true }), false);
  assert.equal(answerReusable({ status: 'helpful', helpfulCount: 3, negativeCount: 0 }, { semantic: true }), true);
  assert.equal(answerReusable({ status: 'needs_review' }), false);
});
