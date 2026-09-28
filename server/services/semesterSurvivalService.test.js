const test = require('node:test');
const assert = require('node:assert/strict');

const {
  archiveSupportScore,
  buildSemesterSurvivalPack,
  normalizeBranch,
  normalizeExamType,
  supportBand,
} = require('./semesterSurvivalService');

const CATALOG = [
  {
    branch: 'CSE',
    semester: 5,
    subjects: [
      {
        code: 'CS501',
        shortCode: 'DS',
        name: 'Data Science',
        aliases: ['DS'],
      },
      {
        code: 'CS502',
        shortCode: 'CG',
        name: 'Computer Graphics',
        aliases: ['CG'],
      },
    ],
  },
];

function question(id, subjectCode, topic) {
  return {
    _id: id,
    paperId: `p-${id}`,
    questionKey: `q-${id}`,
    questionNumber: id,
    questionLabel: `Q${id}`,
    sequence: Number(id),
    questionText: `Explain ${topic} with suitable example.`,
    normalizedText: `explain ${topic}`,
    textHash: `hash-${id}`,
    marks: 5,
    subjectCode,
    subject:
      subjectCode === 'CS501'
        ? 'Data Science'
        : 'Computer Graphics',
    branch: 'CSE',
    semester: 5,
    examType: 'Mid-Sem',
    year: 2026,
    primaryTopic: topic,
    topics: [topic],
    status: 'extracted',
    sourceLocation: {},
  };
}

test('normalizers keep supported values predictable', () => {
  assert.equal(normalizeBranch('ece'), 'ECE');
  assert.equal(normalizeBranch('other'), 'CSE');
  assert.equal(normalizeExamType('mid semester'), 'Mid-Sem');
});

test('support score is bounded from 0 to 100', () => {
  assert.equal(
    archiveSupportScore({
      completionPct: 100,
      questionCount: 20,
      solutionReadyCount: 20,
      resourceKinds: 10,
    }),
    100
  );
  assert.equal(archiveSupportScore({}), 0);
});

test('support bands are stable', () => {
  assert.equal(supportBand(80), 'strong');
  assert.equal(supportBand(55), 'usable');
  assert.equal(supportBand(30), 'limited');
  assert.equal(supportBand(10), 'sparse');
});

test('survival pack contains every catalog subject', () => {
  const result = buildSemesterSurvivalPack({
    branch: 'CSE',
    semester: 5,
    papers: [],
    resources: [],
    questions: [],
    solutionCounts: {},
    subjectCatalog: CATALOG,
    expectedYears: [2026],
    expectedExamTypes: ['Mid-Sem'],
  });

  assert.equal(result.subjects.length, 2);
  assert.equal(result.summary.subjects, 2);
});

test('survival pack aggregates questions and solutions', () => {
  const questions = [
    question('1', 'CS501', 'Regression'),
    question('2', 'CS502', 'Projection'),
  ];

  const result = buildSemesterSurvivalPack({
    branch: 'CSE',
    semester: 5,
    examType: 'Mid-Sem',
    papers: [],
    resources: [],
    questions,
    solutionCounts: { 1: 1 },
    subjectCatalog: CATALOG,
    expectedYears: [2026],
    expectedExamTypes: ['Mid-Sem'],
  });

  assert.equal(result.summary.extractedQuestions, 2);
  assert.equal(result.summary.questionsWithSolutions, 1);
});

test('survival pack exposes subject quick links', () => {
  const result = buildSemesterSurvivalPack({
    branch: 'CSE',
    semester: 5,
    papers: [],
    resources: [],
    questions: [],
    solutionCounts: {},
    subjectCatalog: CATALOG,
    expectedYears: [2026],
    expectedExamTypes: ['Mid-Sem'],
  });

  const cg = result.subjects.find((item) => item.subjectCode === 'CS502');

  assert.match(cg.links.subjectHub, /CS502/);
  assert.match(cg.links.mocks, /mock-exams/);
  assert.match(cg.links.contribute, /contribute/);
});

test('mission order surfaces weaker support first', () => {
  const result = buildSemesterSurvivalPack({
    branch: 'CSE',
    semester: 5,
    papers: [],
    resources: [
      { kind: 'question_paper', subjectCode: 'CS501' },
      { kind: 'solution', subjectCode: 'CS501' },
    ],
    questions: [
      question('1', 'CS501', 'Regression'),
      question('2', 'CS501', 'MLE'),
    ],
    solutionCounts: { 1: 1, 2: 1 },
    subjectCatalog: CATALOG,
    expectedYears: [2026],
    expectedExamTypes: ['Mid-Sem'],
  });

  assert.equal(result.missionOrder[0].subjectCode, 'CS502');
});
