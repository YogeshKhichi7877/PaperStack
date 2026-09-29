const test = require('node:test');
const assert = require('node:assert/strict');
const { arithmetic, combineMock, estimateDifficulty, generateNovelQuestions,
  parseCandidateRows, similarity, validateNovelQuestion } = require('./mockNovelService');
const { buildMockExam } = require('./mockExamService');

const template = {
  _id: '507f1f77bcf86cd799439011',
  questionText: 'Explain why platform as a service reduces infrastructure management.',
  marks: 5, questionType: 'theory', primaryTopic: 'Cloud service models',
  subject: 'Cloud Computing', subjectCode: 'CS504',
};

test('arithmetic verifier accepts simple valid expressions only', () => {
  assert.equal(arithmetic('(2+3)*4'), 20);
  assert.equal(arithmetic('process.exit()'), null);
  assert.equal(arithmetic('4/0'), null);
});

test('archive difficulty estimate follows marks and reasoning signals', () => {
  assert.equal(estimateDifficulty({ marks: 2, questionText: 'Define rasterization.' }), 'easy');
  assert.equal(estimateDifficulty({ marks: 5, questionText: 'Calculate transformed coordinates.' }), 'hard');
});

test('new questions need novelty, complete answer, and a marks-matched rubric', () => {
  const candidate = {
    sourceQuestionId: template._id,
    questionText: 'A startup needs to deploy its web application without managing its operating system. Choose the service model and justify the decision.',
    expectedAnswer: 'Platform as a service manages runtime and infrastructure while the startup deploys its application.',
    keyPoints: ['Platform as a service', 'Managed runtime'],
    markingScheme: [{ criterion: 'Model', marks: 2 }, { criterion: 'Reasoning', marks: 3 }],
  };
  assert.ok(validateNovelQuestion(candidate, template, [template.questionText], []));
  assert.equal(validateNovelQuestion({ ...candidate, questionText: template.questionText }, template, [template.questionText], []), null);
  assert.equal(validateNovelQuestion({ ...candidate, markingScheme: [{ criterion: 'Model', marks: 1 }] }, template, [], []), null);
  assert.ok(similarity(template.questionText, template.questionText) > 0.99);
});

test('generated numerical questions require a verified calculation', () => {
  const numericalTemplate = { ...template, questionType: 'numerical' };
  const candidate = {
    sourceQuestionId: template._id,
    questionText: 'A square has an area of 16 square metres. Calculate its side length and explain the square root used.',
    questionType: 'numerical', difficulty: 'moderate',
    expectedAnswer: 'The square root of 16 is 4, so the final side length is 4 metres.',
    keyPoints: ['Use square root', 'State the length with units'],
    markingScheme: [{ criterion: 'Method', marks: 2 }, { criterion: 'Value and units', marks: 3 }],
    numericCheck: { expression: 'sqrt(16)', result: 4 },
  };
  assert.ok(validateNovelQuestion(candidate, numericalTemplate, [], []));
  assert.equal(validateNovelQuestion({ ...candidate, numericCheck: { expression: 'sqrt(16)', result: 5 } },
    numericalTemplate, [], []), null);
  assert.equal(validateNovelQuestion({ ...candidate, numericCheck: { expression: 'process.exit()', result: 4 } },
    numericalTemplate, [], []), null);
});

test('public mock omits generated answer keys', () => {
  const base = buildMockExam([template], { subject: { subjectCode: 'CS504' }, totalMarks: 10 });
  const generated = validateNovelQuestion({
    sourceQuestionId: template._id,
    questionText: 'A startup needs to deploy its web application without managing its operating system. Choose the service model and justify the decision.',
    expectedAnswer: 'Platform as a service manages runtime and infrastructure while the startup deploys its application.',
    keyPoints: ['Platform as a service', 'Managed runtime'],
    markingScheme: [{ criterion: 'Model', marks: 2 }, { criterion: 'Reasoning', marks: 3 }],
  }, template, [template.questionText], []);
  const mock = combineMock(base, [generated], 'new');
  assert.equal(mock.questions[0].source, 'generated');
  assert.equal(mock.questions[0].expectedAnswer, undefined);
  assert.equal(mock.questions[0].markingScheme, undefined);
});

test('invalid generated rows do not discard valid questions in the same response', () => {
  const valid = {
    sourceQuestionId: template._id,
    questionText: 'A retailer wants to launch an online store without maintaining servers. Choose a suitable managed service and explain its responsibilities.',
    questionType: 'theory', difficulty: 'easy',
    expectedAnswer: 'A managed platform supplies the runtime and server maintenance while the retailer remains responsible for application code.',
    keyPoints: ['Managed runtime', 'Application code remains with the retailer'],
    markingScheme: [{ criterion: 'Service choice', marks: '2' }, { criterion: 'Reasoning', marks: '3' }],
  };
  const rows = parseCandidateRows(JSON.stringify({ questions: [valid, { ...valid, keyPoints: [] }] }));
  assert.equal(rows.length, 1);
  assert.equal(rows[0].markingScheme[0].marks, 2);
});

test('generation retries only a missing template and retains the valid first answer', async () => {
  const second = { ...template, _id: '507f1f77bcf86cd799439022',
    questionText: 'Describe how platform services simplify software deployment.' };
  const makeCandidate = (sourceQuestionId, questionText) => ({
    sourceQuestionId, questionText, questionType: 'theory', difficulty: 'easy',
    expectedAnswer: 'A managed platform supplies the runtime and server maintenance while the team remains responsible for application code.',
    keyPoints: ['Managed runtime', 'Application responsibility'],
    markingScheme: [{ criterion: 'Service choice', marks: 2 }, { criterion: 'Reasoning', marks: 3 }],
  });
  const first = makeCandidate(template._id,
    'A retailer wants to launch an online store without maintaining servers. Choose a suitable managed service and explain its responsibilities.');
  const later = makeCandidate(second._id,
    'A research lab needs to publish a data dashboard without maintaining servers. Recommend a hosting service and outline the provider duties.');
  const responses = [
    JSON.stringify({ questions: [first, { ...later, keyPoints: [] }] }),
    JSON.stringify({ questions: [later] }),
  ];
  let calls = 0;
  const generated = await generateNovelQuestions([template, second], [template, second], {
    difficulty: 'easy', env: { AI_ENABLED: 'true', GROQ_API_KEY: 'test' },
  }, async (_prompt, settings) => {
    const response = responses[calls++];
    settings.validateResponse(response);
    return response;
  });
  assert.equal(calls, 2);
  assert.deepEqual(generated.map((item) => item.sourceQuestionId), [template._id, second._id]);
  assert.ok(generated.every((item) => item.difficulty === 'easy'));
});
