const test = require('node:test');
const assert = require('node:assert/strict');
const { arithmetic, combineMock, estimateDifficulty, similarity, validateNovelQuestion } = require('./mockNovelService');
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
