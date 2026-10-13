const test = require('node:test');
const assert = require('node:assert/strict');
const { combineSubparts } = require('./questionGroupingService');

const item = (part, text, marks = 2) => ({ questionNumber: '2', part,
  questionKey: `q2${part ? `-${part}` : ''}`, questionText: text, marks,
  confidence: 96, section: 'Section A' });

test('common stems appear once while all nested subpart statements survive', () => {
  const questions = combineSubparts([
    item('a-i', 'Given x² + y² = 4.\nUse the following matrix.\nFind x.'),
    item('a-ii', 'Given x² + y² = 4.\nUse the following matrix.\nFind y.'),
    item('b', 'Given x² + y² = 4.\nExplain the result.'),
  ]);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].questionText.match(/Given x²/g).length, 1);
  assert.match(questions[0].questionText, /\(a\).*Use the following matrix/s);
  assert.match(questions[0].questionText, /\(i\) Find x/);
  assert.match(questions[0].questionText, /\(ii\) Find y/);
  assert.match(questions[0].questionText, /\(b\) Explain the result/);
  assert.equal(questions[0].marks, 6);
});

test('repeated part labels are retained as alternatives rather than silently discarded', () => {
  const questions = combineSubparts([
    item('a', 'Explain the first alternative.'),
    item('a', 'Explain the second alternative.'),
  ]);
  assert.equal(questions.length, 2);
  assert.match(questions[1].questionText, /second alternative/);
});

test('parent total marks take precedence and conflicting subpart marks require review', () => {
  const questions = combineSubparts([
    item('', 'Answer the following.', 5),
    item('i', 'Explain the first result.', 2),
    item('ii', 'Explain the second result.', 2),
  ]);
  assert.equal(questions[0].marks, 5);
  assert.equal(questions[0].needsReview, true);
});
