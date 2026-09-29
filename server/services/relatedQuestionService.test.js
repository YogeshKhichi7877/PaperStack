const test = require('node:test');
const assert = require('node:assert/strict');
const { buildMiniPracticeSet, rankRelatedQuestions } = require('./relatedQuestionService');

const base = { _id: '1', questionText: 'Explain midpoint line drawing algorithm', primaryTopic: 'Line drawing', topics: ['Computer graphics'], questionType: 'theory', marks: 5, year: 2025 };
const candidates = [
  { _id: '2', questionText: 'Explain the mid point line drawing algorithm', primaryTopic: 'Line drawing', topics: ['Computer graphics'], questionType: 'theory', marks: 5, year: 2024 },
  { _id: '3', questionText: 'Describe Cohen Sutherland clipping', primaryTopic: 'Clipping', topics: ['Computer graphics'], questionType: 'theory', marks: 5, year: 2023 },
  { _id: '4', questionText: 'Explain midpoint line drawing algorithm', primaryTopic: 'Line drawing', topics: ['Computer graphics'], year: 2022 },
];

test('related ranking excludes normalized duplicates and keeps strongest relation', () => {
  const result = rankRelatedQuestions(base, candidates, 6);
  assert.equal(result.some((item) => item._id === '4'), false);
  assert.equal(result[0]._id, '2');
  assert.ok(result[0].similarity > 80);
});

test('mini practice selection is deterministic', () => {
  assert.deepEqual(buildMiniPracticeSet(base, candidates, 3), buildMiniPracticeSet(base, candidates, 3));
});
