const test = require('node:test');
const assert = require('node:assert/strict');
const { buildContentVersion, questionContentVersion } = require('./contentVersionService');

test('content versions are stable across object key order', () => {
  assert.equal(buildContentVersion({ b: 2, a: 1 }), buildContentVersion({ a: 1, b: 2 }));
});

test('question content versions change when approved knowledge changes', () => {
  const question = { _id: 'q1', questionText: 'Find x', subjectCode: 'M1', marks: 4 };
  const first = questionContentVersion(question, [{ _id: 's1', answerText: 'x=2' }]);
  const second = questionContentVersion(question, [{ _id: 's1', answerText: 'x=3' }]);
  assert.notEqual(first, second);
});
