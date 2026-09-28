const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildQuestionDocument,
  buildQuestionDocuments,
  clampConfidence,
  hashQuestionText,
  normalizeQuestionKey,
  normalizeQuestionText,
} = require('./questionService');

const paper = {
  _id: '507f1f77bcf86cd799439011',
  subject: 'Computer Graphics',
  subjectCode: 'CS502',
  branch: 'CSE',
  semester: 5,
  year: 2026,
  examType: 'Mid-Sem',
};

test('normalizes whitespace and case for question comparison', () => {
  assert.equal(
    normalizeQuestionText('  Explain   Boundary Fill Algorithm  '),
    'explain boundary fill algorithm'
  );
});

test('question hashes are stable across harmless whitespace differences', () => {
  assert.equal(
    hashQuestionText('Explain   midpoint circle'),
    hashQuestionText(' explain midpoint circle ')
  );
});

test('normalizes question labels into stable keys', () => {
  assert.equal(normalizeQuestionKey('Q2 (b)'), 'q2-b');
  assert.equal(normalizeQuestionKey('Question 5(a)'), 'q5-a');
});

test('buildQuestionDocument inherits authoritative metadata from parent paper', () => {
  const result = buildQuestionDocument({
    paper,
    sequence: 1,
    input: {
      questionNumber: '1',
      questionText: 'Explain composite transformation.',
      year: 1999,
      semester: 1,
      subjectCode: 'WRONG',
      marks: 5,
      pageNumber: 2,
    },
  });

  assert.equal(result.subjectCode, 'CS502');
  assert.equal(result.year, 2026);
  assert.equal(result.semester, 5);
  assert.equal(result.branch, 'CSE');
  assert.equal(result.examType, 'Mid-Sem');
  assert.equal(result.questionKey, 'q1');
  assert.equal(result.marks, 5);
  assert.equal(result.sourceLocation.pageStart, 2);
});

test('sub-question labels and keys remain stable', () => {
  const result = buildQuestionDocument({
    paper,
    sequence: 2,
    input: {
      questionNumber: '2',
      part: 'b',
      questionText: 'Apply the transformation matrix.',
    },
  });

  assert.equal(result.questionLabel, 'Q2(b)');
  assert.equal(result.questionKey, 'q2-b');
});

test('confidence is clamped to 0..100', () => {
  assert.equal(clampConfidence(120), 100);
  assert.equal(clampConfidence(-5), 0);
  assert.equal(clampConfidence(88.75), 88.75);
});

test('batch builder rejects duplicate keys before database writes', () => {
  assert.throws(
    () => buildQuestionDocuments({
      paper,
      questions: [
        { questionNumber: '1', questionText: 'First version' },
        { questionNumber: '1', questionText: 'Duplicate number' },
      ],
    }),
    /Duplicate question key/
  );
});

test('question text is mandatory', () => {
  assert.throws(
    () => buildQuestionDocument({
      paper,
      sequence: 1,
      input: { questionNumber: '1' },
    }),
    /Question text is required/
  );
});
