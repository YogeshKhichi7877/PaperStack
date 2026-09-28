const test = require('node:test');
const assert = require('node:assert/strict');

const {
  commandType,
  evaluateLocalAnswer,
  evaluateLocalBatch,
  summarizeEvaluations,
} = require('./mockEvaluationService');

function question(
  id,
  text,
  options = {}
) {
  return {
    _id: id,
    questionText: text,
    marks: options.marks ?? 5,
    primaryTopic: options.primaryTopic || '',
    topics: options.topics || [],
    questionType: options.questionType || '',
  };
}

test('detects numerical questions', () => {
  assert.equal(
    commandType('Calculate the final transformed coordinates.'),
    'numerical'
  );
});

test('blank answer receives zero', () => {
  const result = evaluateLocalAnswer({
    question: question('1', 'Explain midpoint circle algorithm.'),
    answerText: '',
    approvedSolutions: [],
  });

  assert.equal(result.score, 0);
  assert.equal(result.estimatedAccuracy, 0);
});

test('relevant answer scores above irrelevant answer', () => {
  const q = question(
    '1',
    'Explain midpoint circle algorithm.',
    {
      primaryTopic: 'Midpoint Circle',
      marks: 5,
    }
  );

  const solution = [
    {
      answerText:
        'The midpoint circle algorithm uses a decision parameter and eight-way symmetry to rasterize a circle efficiently.',
    },
  ];

  const relevant = evaluateLocalAnswer({
    question: q,
    answerText:
      'Midpoint circle uses a decision parameter. We exploit eight-way symmetry and update x and y pixels step by step.',
    approvedSolutions: solution,
  });

  const irrelevant = evaluateLocalAnswer({
    question: q,
    answerText:
      'Cloud computing provides resources over the internet.',
    approvedSolutions: solution,
  });

  assert.ok(relevant.score > irrelevant.score);
});

test('local scoring never exceeds maximum marks', () => {
  const result = evaluateLocalAnswer({
    question: question(
      '1',
      'Explain perspective projection.',
      {
        marks: 2,
        primaryTopic: 'Perspective Projection',
      }
    ),
    answerText:
      'Perspective projection uses a center of projection and projects points onto a view plane. Distant objects appear smaller.',
    approvedSolutions: [
      {
        answerText:
          'Perspective projection maps 3D points to a view plane using a center of projection; distant objects appear smaller.',
      },
    ],
  });

  assert.ok(result.score <= 2);
});

test('approved solution improves reference confidence', () => {
  const result = evaluateLocalAnswer({
    question: question('1', 'Define clipping.', { marks: 2 }),
    answerText: 'Clipping removes portions outside a viewing region.',
    approvedSolutions: [
      {
        answerText:
          'Clipping discards parts of graphical objects outside the clipping window.',
      },
    ],
  });

  assert.equal(result.confidence, 'medium');
});

test('batch summary computes percentage', () => {
  const summary = summarizeEvaluations([
    {
      score: 4,
      maxMarks: 5,
      referenceBasis: 'x',
    },
    {
      score: 3,
      maxMarks: 5,
      referenceBasis: 'x',
    },
  ]);

  assert.equal(summary.totalScore, 7);
  assert.equal(summary.totalMarks, 10);
  assert.equal(summary.percentage, 70);
});

test('local batch produces one evaluation per question', () => {
  const result = evaluateLocalBatch([
    {
      question: question('1', 'Define raster scan.', { marks: 2 }),
      answerText: 'Raster scan refreshes pixels line by line.',
      approvedSolutions: [],
    },
    {
      question: question('2', 'Explain perspective projection.', { marks: 5 }),
      answerText: 'Perspective projection uses a center of projection.',
      approvedSolutions: [],
    },
  ]);

  assert.equal(result.items.length, 2);
  assert.equal(result.mode, 'local');
});
