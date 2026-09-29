const test = require('node:test');
const assert = require('node:assert/strict');
const { assessNumericalAnswer, applyNumericalScoreCap } = require('./numericalEvaluationService');

const question = { questionType: 'numerical', verifiedNumericResult: 8,
  expectedAnswer: 'Final answer = 8 m' };

test('equivalent final value is accepted', () => {
  assert.equal(assessNumericalAnswer({ question, answerText: 'Final answer = 8.0000 m' }).correct, true);
});

test('wrong value or unit caps practice marks while allowing method credit', () => {
  const entry = { question, answerText: 'Formula x=2*3\nFinal answer = 6 m' };
  const scored = applyNumericalScoreCap({ score: 5, maxMarks: 5, feedback: 'Good' }, entry,
    (value) => Math.round(value * 2) / 2);
  assert.equal(scored.score, 2.5);
  assert.equal(assessNumericalAnswer({ question, answerText: 'Final answer = 8 s' }).unitMismatch, true);
  assert.equal(assessNumericalAnswer({ question, answerText: 'Final answer = 8' }).unitMismatch, true);
});
