const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSubjectIntelligence,
  clusterQuestions,
  normalizeText,
  questionSimilarity,
  tokensFor,
} = require('./pyqIntelligenceService');

function q(id, text, year = 2026, examType = 'Mid-Sem') {
  return {
    _id: id,
    paperId: `paper-${id}`,
    questionLabel: `Q${id}`,
    questionText: text,
    subjectCode: 'CS502',
    subject: 'Computer Graphics',
    year,
    examType,
    status: 'extracted',
    topics: [],
    extraction: { source: 'rule', confidence: 90 },
  };
}

test('normalization removes question numbering and marks noise', () => {
  assert.equal(
    normalizeText('Q2(a): Explain the Midpoint Circle Algorithm. [5 Marks]'),
    'explain the midpoint circle algorithm'
  );
});

test('tokenization drops common instruction stop words', () => {
  assert.deepEqual(
    tokensFor('Explain the midpoint circle algorithm'),
    ['midpoint', 'circle', 'algorithm']
  );
});

test('identical questions score 1.0 similarity', () => {
  assert.equal(
    questionSimilarity(
      q('1', 'Explain midpoint circle algorithm.'),
      q('2', 'Explain midpoint circle algorithm.')
    ),
    1
  );
});

test('paraphrased questions are similar enough to group', () => {
  const score = questionSimilarity(
    q('1', 'Explain midpoint circle drawing algorithm with steps.'),
    q('2', 'Describe the steps of midpoint circle algorithm.')
  );

  assert.ok(score >= 0.72, `Expected >= 0.72, received ${score}`);
});

test('unrelated questions stay below repeat threshold', () => {
  const score = questionSimilarity(
    q('1', 'Explain midpoint circle algorithm.'),
    q('2', 'Describe perspective projection and vanishing points.')
  );

  assert.ok(score < 0.72, `Expected < 0.72, received ${score}`);
});

test('clusters repeated questions across different years', () => {
  const clusters = clusterQuestions([
    q('1', 'Explain midpoint circle drawing algorithm with steps.', 2026),
    q('2', 'Describe the steps of midpoint circle algorithm.', 2025),
    q('3', 'Explain perspective projection.', 2024),
  ]);

  assert.equal(clusters.length, 1);
  assert.equal(clusters[0].occurrenceCount, 2);
  assert.deepEqual(clusters[0].years, [2026, 2025]);
});

test('short generic questions use stricter matching', () => {
  const clusters = clusterQuestions([
    q('1', 'Define clipping window.', 2026),
    q('2', 'Define viewing window.', 2025),
  ]);

  assert.equal(clusters.length, 0);
});

test('subject intelligence calculates repeat rate and clusters', () => {
  const result = buildSubjectIntelligence([
    q('1', 'Explain midpoint circle drawing algorithm with steps.', 2026),
    q('2', 'Describe the steps of midpoint circle algorithm.', 2025),
    q('3', 'Explain perspective projection.', 2024),
  ]);

  assert.equal(result.summary.totalQuestions, 3);
  assert.equal(result.summary.repeatedClusters, 1);
  assert.equal(result.summary.repeatedQuestionInstances, 2);
  assert.equal(result.summary.repeatRate, 66.7);
});

test('topic signals only use extracted topic metadata', () => {
  const questions = [
    { ...q('1', 'Question one'), primaryTopic: 'Clipping', topics: ['Clipping', 'Cohen Sutherland'] },
    { ...q('2', 'Question two'), primaryTopic: 'Clipping', topics: ['Clipping'] },
  ];

  const result = buildSubjectIntelligence(questions);
  assert.equal(result.topicSignals[0].topic, 'Clipping');
  assert.equal(result.topicSignals[0].count, 2);
});
