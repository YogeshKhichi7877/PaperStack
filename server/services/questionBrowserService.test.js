const test = require('node:test');
const assert = require('node:assert/strict');

const {
  browserQuestion,
  buildQuestionFilter,
  buildQuestionSort,
  normalizeBrowserQuery,
} = require('./questionBrowserService');

test('normalizes browser filters safely', () => {
  const query = normalizeBrowserQuery({
    subjectCode: 'cs502',
    semester: '5',
    year: '2026',
    marks: '5',
    unit: '2',
  });

  assert.equal(query.subjectCode, 'CS502');
  assert.equal(query.semester, 5);
  assert.equal(query.year, 2026);
  assert.equal(query.marks, 5);
  assert.equal(query.unit, 2);
});

test('builds text search and subject filters', () => {
  const filter = buildQuestionFilter({
    q: 'midpoint circle',
    subjectCode: 'cs502',
    examType: 'Mid-Sem',
  });

  assert.deepEqual(filter.$text, { $search: 'midpoint circle' });
  assert.equal(filter.subjectCode, 'CS502');
  assert.equal(filter.examType, 'Mid-Sem');
});

test('topic filter is escaped and matches primary/topic arrays', () => {
  const filter = buildQuestionFilter({ topic: 'A+B?' });
  assert.equal(Array.isArray(filter.$or), true);
  assert.equal(filter.$or.length, 2);
  assert.equal(filter.$or[0].primaryTopic instanceof RegExp, true);
});

test('invalid numeric filters are ignored', () => {
  const filter = buildQuestionFilter({
    semester: '99',
    year: 'abc',
    unit: '-1',
  });

  assert.equal(Object.hasOwn(filter, 'semester'), false);
  assert.equal(Object.hasOwn(filter, 'year'), false);
  assert.equal(Object.hasOwn(filter, 'unit'), false);
});

test('sort modes return deterministic Mongo sort objects', () => {
  assert.deepEqual(buildQuestionSort('marks-high'), {
    marks: -1,
    year: -1,
    sequence: 1,
  });

  assert.deepEqual(buildQuestionSort('latest'), {
    year: -1,
    createdAt: -1,
    sequence: 1,
  });
});

test('browser serialization keeps source paper data separate', () => {
  const result = browserQuestion({
    _id: 'question-1',
    paperId: {
      _id: 'paper-1',
      title: 'Computer Graphics Mid-Sem',
      filePath: 'https://example.com/cg.pdf',
      solutionPath: '',
      questionExtractionStatus: 'complete',
    },
    questionKey: 'q1',
    questionNumber: '1',
    questionLabel: 'Q1',
    sequence: 1,
    questionText: 'Explain midpoint circle algorithm.',
    normalizedText: 'explain midpoint circle algorithm.',
    textHash: 'hash',
    subject: 'Computer Graphics',
    subjectCode: 'CS502',
    branch: 'CSE',
    semester: 5,
    year: 2026,
    examType: 'Mid-Sem',
    topics: [],
    extraction: { source: 'rule', confidence: 90 },
    status: 'extracted',
  });

  assert.equal(result.paperId, 'paper-1');
  assert.equal(result.paper.title, 'Computer Graphics Mid-Sem');
  assert.equal(result.paper.filePath, 'https://example.com/cg.pdf');
});
