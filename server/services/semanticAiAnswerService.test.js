const test = require('node:test');
const assert = require('node:assert/strict');
const {
  answerReusable,
  extractGeneratedAnswerText,
  exactRequestHash,
  findReusableAnswer,
  isValidGeneratedAnswer,
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
  const answer = 'Perspective projection maps three-dimensional points onto a two-dimensional view plane by joining each point to the centre of projection. The projected point is where that ray intersects the view plane.';
  assert.ok(semanticScore('explain midpoint line algorithm', 'Explain the mid point line algorithm') >= 0.88);
  assert.equal(answerReusable({ status: 'generated', mode: 'explain', answer, negativeCount: 0 }, { semantic: true }), false);
  assert.equal(answerReusable({ status: 'helpful', mode: 'explain', answer, helpfulCount: 3, negativeCount: 0 }, { semantic: true }), true);
  assert.equal(answerReusable({ status: 'needs_review' }), false);
});

test('generated answer validation rejects empty and metadata-only cache records', () => {
  assert.equal(isValidGeneratedAnswer(''), false);
  assert.equal(isValidGeneratedAnswer('AI-generated practice answer, not an approved solution.'), false);
  assert.equal(isValidGeneratedAnswer('Automatic numerical verification could not validate this calculation. Check the given values and method against the question before using a final answer.'), false);
  assert.equal(answerReusable({
    mode: 'solution',
    status: 'generated',
    answer: 'Automatic numerical verification could not validate this calculation.',
    negativeCount: 0,
  }), false);
});

test('generated answer validation accepts a meaningful worked solution and consistent aliases', () => {
  const solution = [
    'Start with the original relation $R$.',
    'Because $(1,2)$ and $(2,3)$ are present, transitivity adds $(1,3)$.',
    'Continuing the same reasoning adds $(2,4)$ and $(1,4)$.',
    'Therefore the transitive closure contains all six ordered pairs.',
  ].join('\n\n');
  assert.equal(isValidGeneratedAnswer(solution, { minimumLength: 80 }), true);
  assert.equal(extractGeneratedAnswerText({ generatedAnswer: solution }), solution);
  assert.equal(answerReusable({
    mode: 'solution',
    status: 'generated',
    answer: solution,
    negativeCount: 0,
  }), true);
});

test('invalid exact cache entries are marked stale and regenerated instead of reused', async () => {
  const updates = [];
  const exact = {
    _id: 'bad-cache',
    mode: 'solution',
    status: 'generated',
    answer: 'Automatic numerical verification could not validate this calculation.',
  };
  const Model = {
    findOne: () => ({ lean: async () => exact }),
    updateOne: async (...args) => { updates.push(args); },
    find: () => ({
      sort: () => ({
        limit: () => ({ lean: async () => [] }),
      }),
    }),
  };

  const result = await findReusableAnswer({
    task: 'QUESTION_TUTOR',
    mode: 'solution',
    request: 'Solve the relation question',
    subjectCode: 'CS201',
    contentVersion: 'content-v1',
    promptVersion: 'question-tutor-v5',
  }, { Model });

  assert.equal(result, null);
  assert.deepEqual(updates[0], [
    { _id: 'bad-cache' },
    { $set: { status: 'stale' } },
  ]);
});
