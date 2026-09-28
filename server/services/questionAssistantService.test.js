const test = require('node:test');
const assert = require('node:assert/strict');

const {
  answerSelectedQuestion,
  detectQuestionIntent,
  expectedAnswerShape,
  localHint,
  rankSimilarQuestions,
  similarityScore,
} = require('./questionAssistantService');

function q(id, text, options = {}) {
  return {
    _id: id,
    questionLabel: options.questionLabel || `Q${id}`,
    questionText: text,
    subject: 'Computer Graphics',
    subjectCode: 'CS502',
    examType: options.examType || 'Mid-Sem',
    year: options.year || 2026,
    marks: options.marks ?? 5,
    primaryTopic: options.primaryTopic || '',
    topics: options.topics || [],
    sourceLocation: { pageStart: 2 },
    paperId: {
      _id: `p-${id}`,
      title: 'CG paper',
      filePath: '/cg.pdf',
    },
  };
}

test('detects hint intent', () => {
  assert.equal(
    detectQuestionIntent('Give me a hint but do not give the answer'),
    'hint'
  );
});

test('detects solution intent', () => {
  assert.equal(
    detectQuestionIntent('Solve this question completely'),
    'solution'
  );
});

test('answer structure adapts to numerical questions', () => {
  const result = expectedAnswerShape(
    q('1', 'Calculate the transformed coordinates.', { marks: 5 })
  );

  assert.match(result, /formula first/i);
  assert.match(result, /5-mark/i);
});

test('local hint does not expose a final numerical answer', () => {
  const result = localHint(
    q('1', 'Calculate the transformed coordinates using composite transformation.', {
      primaryTopic: 'Composite Transformation',
    })
  );

  assert.match(result, /core idea/i);
  assert.doesNotMatch(result, /final answer is/i);
});

test('similarity rewards shared topics and wording', () => {
  const base = q(
    '1',
    'Explain midpoint circle drawing algorithm.',
    { primaryTopic: 'Midpoint Circle' }
  );

  const similar = q(
    '2',
    'Describe midpoint circle algorithm with steps.',
    { primaryTopic: 'Midpoint Circle', year: 2025 }
  );

  const unrelated = q(
    '3',
    'Explain perspective projection.',
    { primaryTopic: 'Perspective Projection' }
  );

  assert.ok(
    similarityScore(base, similar) >
      similarityScore(base, unrelated)
  );
});

test('rankSimilarQuestions excludes the selected question', () => {
  const base = q(
    '1',
    'Explain midpoint circle drawing algorithm.',
    { primaryTopic: 'Midpoint Circle' }
  );

  const ranked = rankSimilarQuestions(
    base,
    [
      base,
      q('2', 'Describe midpoint circle algorithm.', {
        primaryTopic: 'Midpoint Circle',
        year: 2025,
      }),
    ]
  );

  assert.equal(ranked.length, 1);
  assert.equal(ranked[0]._id, '2');
});

test('solution request returns approved solution when available', async () => {
  const result = await answerSelectedQuestion({
    query: 'Show me the solution',
    question: q(
      '1',
      'Explain midpoint circle algorithm.',
      { primaryTopic: 'Midpoint Circle' }
    ),
    approvedSolutions: [
      {
        _id: 's1',
        authorName: 'Student',
        answerText: 'Start with p0 = 1 - r, then update the decision parameter.',
        helpfulCount: 5,
      },
    ],
    candidateQuestions: [],
    useAi: false,
  });

  assert.equal(result.intent, 'solution');
  assert.match(result.answer, /approved student solution/i);
  assert.match(result.answer, /p0 = 1 - r/i);
});

test('explanation request works without Gemini', async () => {
  const result = await answerSelectedQuestion({
    query: 'Explain what this question is asking',
    question: q(
      '1',
      'Explain perspective projection with a suitable diagram.',
      {
        primaryTopic: 'Perspective Projection',
        marks: 5,
      }
    ),
    approvedSolutions: [],
    candidateQuestions: [],
    useAi: false,
  });

  assert.equal(result.mode, 'local');
  assert.equal(result.intent, 'explain');
  assert.match(result.answer, /testing Perspective Projection/i);
});

test('similar request exposes related PYQs', async () => {
  const result = await answerSelectedQuestion({
    query: 'Show similar PYQs',
    question: q(
      '1',
      'Explain midpoint circle drawing algorithm.',
      { primaryTopic: 'Midpoint Circle' }
    ),
    approvedSolutions: [],
    candidateQuestions: [
      q(
        '2',
        'Describe midpoint circle algorithm with steps.',
        {
          primaryTopic: 'Midpoint Circle',
          year: 2025,
        }
      ),
    ],
    useAi: false,
  });

  assert.equal(result.intent, 'similar');
  assert.equal(result.similarQuestions.length, 1);
});

test('AI availability is optional and local result stays usable', async () => {
  const result = await answerSelectedQuestion({
    query: 'Give me a hint',
    question: q(
      '1',
      'Explain clipping algorithm.',
      { primaryTopic: 'Clipping' }
    ),
    approvedSolutions: [],
    candidateQuestions: [],
    useAi: false,
  });

  assert.equal(result.mode, 'local');
  assert.ok(result.answer.length > 20);
});
