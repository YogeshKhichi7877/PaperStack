const test = require('node:test');
const assert = require('node:assert/strict');
const { planMock, generatePracticeMock } = require('./mockGenerationService');
const { questionFingerprint } = require('./mockExamService');

const archive = [
  { _id: '507f1f77bcf86cd799439011', questionText: 'Explain the role of membership functions in a fuzzy controller.',
    marks: 4, subjectCode: 'CS-514', subject: 'Fuzzy Logic', primaryTopic: 'Membership functions', topics: ['Membership functions'], difficulty: 'easy' },
  { _id: '507f1f77bcf86cd799439012', questionText: 'Calculate the max-min composition for two fuzzy relation matrices.',
    marks: 6, subjectCode: 'CS-514', subject: 'Fuzzy Logic', primaryTopic: 'Fuzzy relations', topics: ['Fuzzy relations'], difficulty: 'hard' },
];
const dependencies = {
  aiEnabled: () => true,
  generateNovelQuestions: async (templates) => templates.map((item, index) => ({
    ...item, _id: `generated-${index}`, generationSlotId: String(item._id),
    sourceQuestionId: String(item.archiveQuestionId || item._id), source: 'generated',
    questionText: `A fresh, self-contained ${item.primaryTopic} scenario ${index} with $x^2$ notation.`,
    expectedAnswer: 'Private worked answer', markingScheme: [{ criterion: 'Correct solution', marks: item.marks }],
    difficulty: 'hard', year: null,
  })),
};

test('a sparse even-mark archive can generate a 25-mark Fresh Only paper', async () => {
  const { mock, generated } = await generatePracticeMock(archive, { mockType: 'new', totalMarks: 25 }, dependencies);
  assert.equal(mock.generatedMarks, 25);
  assert.equal(mock.questions.length, 5);
  assert.ok(mock.questions.every((item) => item.source === 'generated' && item.aiGenerated));
  assert.equal(new Set(generated.map((item) => item.generationSlotId)).size, 5);
  assert.ok(generated.every((item) => archive.some((source) => String(source._id) === item.sourceQuestionId)));
  assert.ok(!JSON.stringify(mock).includes('Private worked answer'));
});

test('AI plans support every mark option, difficulty, duration, and strategy without archive capacity gates', async () => {
  for (const totalMarks of [10, 20, 25, 30, 50, 75, 100]) {
    for (const difficulty of ['easy', 'balanced', 'hard']) {
      for (const mockType of ['new', 'mixed']) {
        for (const strategy of ['balanced', 'repeat-focused', 'broad-coverage']) {
          const durationMinutes = [10, 20, 30, 60, 90, 120, 180][totalMarks % 7];
          const { mock } = await generatePracticeMock(archive, { mockType, totalMarks,
            durationMinutes, difficulty, strategy, subject: { subjectCode: 'CS-514' } }, dependencies);
          assert.equal(mock.generatedMarks, totalMarks);
          assert.equal(mock.durationMinutes, durationMinutes);
          assert.equal(mock.strategy, strategy);
          assert.equal(mock.requestedDifficulty, difficulty);
          assert.ok(mock.questions.length <= 30);
          assert.equal(new Set(mock.questions.map((item) => item._id)).size, mock.questions.length);
          assert.ok(mock.questions.every((item) => item.subjectCode === 'CS-514'));
        }
      }
    }
  }
});

test('PYQ Only returns available genuine questions when an exact mark total is impossible', async () => {
  const { mock } = await generatePracticeMock(archive, { mockType: 'pyq', totalMarks: 25 }, dependencies);
  assert.equal(mock.generatedMarks, 10);
  assert.equal(mock.exactMarks, false);
  assert.match(mock.warnings[0], /cannot supply exactly 25/);
  assert.ok(mock.questions.every((item) => item.source === 'pyq' && !item.aiGenerated));
});

test('incomplete AI generation cannot leak reference placeholders or claim Fresh Only', async () => {
  for (const mockType of ['mixed', 'new']) {
    await assert.rejects(generatePracticeMock(archive, { mockType, totalMarks: 25 }, {
      aiEnabled: () => true, generateNovelQuestions: async () => [],
    }), (error) => error.code === 'AI_INCOMPLETE');
  }
});

test('AI unavailability is explicit, and mixed fallback only uses real archived IDs', async () => {
  const offline = { aiEnabled: () => false };
  await assert.rejects(generatePracticeMock(archive, { mockType: 'new' }, offline), (error) => error.code === 'AI_UNAVAILABLE');
  const { mock } = await generatePracticeMock(archive, { mockType: 'mixed', totalMarks: 25 }, offline);
  assert.ok(mock.questions.every((item) => archive.some((source) => String(source._id) === item._id)));
  assert.equal(mock.generatedMarks, 10);
  assert.ok(mock.warnings.length);
});

test('mathematical givens and later subparts distinguish archive questions', () => {
  const intro = 'A controller uses the following data to determine its response under the specified conditions. Calculate the output for';
  assert.notEqual(questionFingerprint({ questionText: `${intro} x = 12 + 4.` }),
    questionFingerprint({ questionText: `${intro} x = 12 - 4.` }));
  assert.notEqual(questionFingerprint({ questionText: `${intro} x = 12.` }),
    questionFingerprint({ questionText: `${intro} x = 24.` }));
  const { base } = planMock(archive, { mockType: 'new', totalMarks: 100 });
  assert.equal(base.generatedMarks, 100);
});

test('low-mark archives never create papers exceeding the evaluation limit', async () => {
  const lowMarkArchive = Array.from({ length: 60 }, (_, index) => ({ ...archive[0],
    _id: `archive-${index}`, marks: .5, questionText: `Distinct archived problem with input ${index}.` }));
  for (const mockType of ['pyq', 'mixed', 'new']) {
    const { mock } = await generatePracticeMock(lowMarkArchive, { mockType, totalMarks: 100 }, dependencies);
    assert.ok(mock.questions.length <= 30);
    if (mockType !== 'pyq') assert.equal(mock.generatedMarks, 100);
  }
});

test('a PYQ mark total below the smallest archive question returns an explicitly labelled closest paper', async () => {
  const { mock } = await generatePracticeMock([{ ...archive[0], marks: 20 }], { mockType: 'pyq', totalMarks: 10 }, dependencies);
  assert.equal(mock.generatedMarks, 20);
  assert.equal(mock.targetMarks, 10);
  assert.equal(mock.exactMarks, false);
  assert.ok(mock.warnings.length);
});

test('fresh reference slots respect weak-topic priority and topic spread', () => {
  const prioritized = archive.map((item, index) => ({ ...item, topicScore: index === 1 ? 100 : 0 }));
  const { templates } = planMock(prioritized, { mockType: 'new', totalMarks: 10, strategy: 'broad-coverage' });
  assert.equal(templates[0].archiveQuestionId, archive[1]._id);
  assert.equal(new Set(templates.map((item) => item.primaryTopic)).size, 2);
});
