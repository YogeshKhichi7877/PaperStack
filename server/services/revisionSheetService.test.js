const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMustPracticeQuestions,
  buildRevisionSheet,
  topicMatchesQuestion,
} = require('./revisionSheetService');

function q(id, text, options = {}) {
  return {
    _id: id,
    paperId: `paper-${id}`,
    questionLabel: `Q${id}`,
    questionText: text,
    subject: 'Computer Graphics',
    subjectCode: 'CS502',
    subjectKey: 'CS502',
    branch: 'CSE',
    semester: 5,
    year: options.year || 2026,
    examType: options.examType || 'Mid-Sem',
    marks: options.marks ?? 5,
    questionType: options.questionType || 'theory',
    primaryTopic: options.primaryTopic || '',
    topics: options.topics || [],
    status: 'extracted',
    sourceLocation: {},
  };
}

test('topic matching prefers explicit topic metadata', () => {
  assert.equal(
    topicMatchesQuestion(
      'Midpoint Circle',
      q('1', 'Some unrelated wording', {
        primaryTopic: 'Midpoint Circle',
      })
    ),
    true
  );
});

test('topic matching can fall back to question text', () => {
  assert.equal(
    topicMatchesQuestion(
      'Perspective Projection',
      q('1', 'Explain perspective projection with vanishing points.')
    ),
    true
  );
});

test('must-practice ranking rewards repeated high-value questions', () => {
  const questions = [
    q('1', 'Explain midpoint circle algorithm.', {
      marks: 5,
      primaryTopic: 'Midpoint Circle',
    }),
    q('2', 'Define clipping.', {
      marks: 2,
      primaryTopic: 'Clipping',
    }),
  ];

  const result = buildMustPracticeQuestions({
    questions,
    importantTopics: [
      {
        topic: 'Midpoint Circle',
        score: 90,
      },
      {
        topic: 'Clipping',
        score: 30,
      },
    ],
    repeatClusters: [
      {
        questions: [{ _id: '1' }],
      },
    ],
    solutionCounts: {
      1: 1,
    },
  });

  assert.equal(result[0]._id, '1');
  assert.equal(result[0].repeatBacked, true);
  assert.equal(result[0].approvedSolutionCount, 1);
});

test('revision sheet includes priority topics and repeated PYQs', () => {
  const result = buildRevisionSheet([
    q('1', 'Explain midpoint circle drawing algorithm with steps.', {
      year: 2026,
      primaryTopic: 'Midpoint Circle',
    }),
    q('2', 'Describe the steps of midpoint circle algorithm.', {
      year: 2025,
      primaryTopic: 'Midpoint Circle',
    }),
    q('3', 'Explain perspective projection.', {
      year: 2024,
      primaryTopic: 'Perspective Projection',
    }),
  ]);

  assert.equal(result.summary.questionsAnalyzed, 3);
  assert.ok(result.priorityTopics.length >= 2);
  assert.equal(result.repeatedClusters.length, 1);
});

test('revision sheet respects an exam-type filtered input set', () => {
  const result = buildRevisionSheet(
    [
      q('1', 'Explain midpoint circle algorithm.', {
        examType: 'Mid-Sem',
        primaryTopic: 'Midpoint Circle',
      }),
    ],
    {
      examType: 'Mid-Sem',
    }
  );

  assert.equal(result.scope.examType, 'Mid-Sem');
  assert.deepEqual(result.scope.examTypes, ['Mid-Sem']);
});

test('revision sheet reports approved-solution coverage', () => {
  const result = buildRevisionSheet(
    [
      q('1', 'Explain midpoint circle algorithm.', {
        primaryTopic: 'Midpoint Circle',
      }),
      q('2', 'Explain perspective projection.', {
        primaryTopic: 'Perspective Projection',
      }),
    ],
    {
      solutionCounts: {
        1: 2,
      },
    }
  );

  assert.equal(
    result.summary.questionsWithApprovedSolutions,
    1
  );
});

test('checklist is derived from the highest-priority topics', () => {
  const result = buildRevisionSheet([
    q('1', 'Explain midpoint circle algorithm.', {
      primaryTopic: 'Midpoint Circle',
    }),
    q('2', 'Explain midpoint circle algorithm.', {
      year: 2025,
      primaryTopic: 'Midpoint Circle',
    }),
    q('3', 'Define clipping.', {
      primaryTopic: 'Clipping',
      marks: 2,
    }),
  ]);

  assert.equal(result.checklist[0].topic, 'Midpoint Circle');
});

test('revision sheet methodology explicitly avoids prediction claims', () => {
  const result = buildRevisionSheet([
    q('1', 'Explain midpoint circle algorithm.', {
      primaryTopic: 'Midpoint Circle',
    }),
  ]);

  assert.match(
    result.methodology.disclaimer,
    /not a prediction/i
  );
});
