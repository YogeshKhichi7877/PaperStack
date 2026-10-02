const test = require('node:test');
const assert = require('node:assert/strict');

const {
  answerSelectedQuestion,
  buildQuestionTutorPrompt,
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

test('detects formula intent', () => {
  assert.equal(detectQuestionIntent('Show the formula and define its symbols'), 'formula');
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

test('hint response does not attach approved full solutions', async () => {
  const result = await answerSelectedQuestion({
    query: 'Give me a hint only',
    question: q('1', 'Calculate the transformed coordinates.', { marks: 5 }),
    approvedSolutions: [{ _id: 's1', answerText: 'Final answer is 42.' }],
    useAi: true,
  });
  assert.equal(result.mode, 'local');
  assert.deepEqual(result.approvedSolutions, []);
  assert.doesNotMatch(result.answer, /42/);
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

test('transitive closure bypasses numerical verification and keeps full question context', async () => {
  const question = q(
    'relation-1',
    'Given R = {(1,2), (2,3), (3,4)} on A = {1,2,3,4}. Compute the transitive closure of relation R.',
    {
      primaryTopic: 'Transitive Closure',
      marks: 5,
    }
  );
  question.subject = 'Discrete Mathematics';
  question.subjectCode = 'CS201';

  const result = await answerSelectedQuestion({
    query: 'Solve this question completely',
    question,
    approvedSolutions: [],
    candidateQuestions: [],
    useAi: false,
  });

  assert.equal(result.questionKind, 'relation');
  assert.equal(result.verification.status, 'not_applicable');
  assert.deepEqual(result.verification.details, []);

  const prompt = buildQuestionTutorPrompt({
    query: 'Solve this question completely',
    intent: 'solution',
    question,
  });
  assert.match(prompt, /answer this exact question/i);
  assert.match(prompt, /transitive closure of relation R/i);
  assert.match(prompt, /subject=Discrete Mathematics \(CS201\)/i);
  assert.match(prompt, /category=relation/i);
  assert.match(prompt, /Final Answer/i);
  assert.match(prompt, /do not force numerical calculation/i);
});
