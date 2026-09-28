const test = require('node:test');
const assert = require('node:assert/strict');

const {
  answerQuery,
  buildRepeatGroups,
  buildTopicStats,
  detectIntent,
  tokenize,
} = require('./askPaperStackService');

function q(id, text, options = {}) {
  return {
    _id: id,
    questionLabel: `Q${id}`,
    questionText: text,
    subject: options.subject || 'Computer Graphics',
    subjectCode: options.subjectCode || 'CS502',
    examType: options.examType || 'Mid-Sem',
    year: options.year || 2026,
    marks: options.marks ?? 5,
    primaryTopic: options.primaryTopic || '',
    topics: options.topics || [],
    approvedSolutionCount: options.approvedSolutionCount || 0,
    sourceLocation: {},
    paperId: {
      _id: `paper-${id}`,
      title: 'Paper',
      filePath: '/demo.pdf',
    },
  };
}

test('tokenize removes stop words and keeps important tokens', () => {
  const tokens = tokenize('Show me repeated questions in computer graphics');

  assert.ok(tokens.includes('repeated'));
  assert.ok(tokens.includes('computer'));
  assert.ok(!tokens.includes('show'));
});

test('intent detection identifies topic intent', () => {
  assert.equal(
    detectIntent('What are the most important topics in CG?'),
    'topics'
  );
});

test('intent detection identifies repeated-question intent', () => {
  assert.equal(
    detectIntent('Show repeated PYQs'),
    'repeats'
  );
});

test('topic stats count topic frequency', () => {
  const stats = buildTopicStats([
    q('1', 'Explain midpoint circle', { primaryTopic: 'Midpoint Circle' }),
    q('2', 'Draw midpoint circle', { primaryTopic: 'Midpoint Circle' }),
    q('3', 'Explain perspective projection', { primaryTopic: 'Perspective Projection' }),
  ]);

  assert.equal(stats[0].topic, 'Midpoint Circle');
  assert.equal(stats[0].count, 2);
});

test('repeat groups detect repeated questions', () => {
  const repeats = buildRepeatGroups([
    q('1', 'Explain midpoint circle algorithm with example.'),
    q('2', 'Explain midpoint circle algorithm with example.', { year: 2025 }),
    q('3', 'Explain perspective projection.'),
  ]);

  assert.equal(repeats.length, 1);
  assert.equal(repeats[0].occurrenceCount, 2);
});

test('answerQuery returns topic-focused response', async () => {
  const result = await answerQuery(
    [
      q('1', 'Explain midpoint circle algorithm', { primaryTopic: 'Midpoint Circle' }),
      q('2', 'Explain midpoint circle with example', { primaryTopic: 'Midpoint Circle' }),
      q('3', 'Explain perspective projection', { primaryTopic: 'Perspective Projection' }),
    ],
    'What are the important topics?',
    { subjectLabel: 'Computer Graphics (CS502)' }
  );

  assert.equal(result.detectedIntent, 'topics');
  assert.ok(/strongest topic signals/i.test(result.answer));
  assert.ok(result.topicHits.length >= 1);
});

test('answerQuery reports solution-ready questions', async () => {
  const result = await answerQuery(
    [
      q('1', 'Explain midpoint circle algorithm', {
        primaryTopic: 'Midpoint Circle',
        approvedSolutionCount: 2,
      }),
      q('2', 'Explain perspective projection', {
        primaryTopic: 'Perspective Projection',
      }),
    ],
    'Which questions have solutions?',
    { subjectLabel: 'Computer Graphics (CS502)' }
  );

  assert.equal(result.detectedIntent, 'solutions');
  assert.ok(/approved student solutions/i.test(result.answer) || /approved solution/i.test(result.answer));
});

test('answerQuery falls back cleanly when no match is found', async () => {
  const result = await answerQuery(
    [
      q('1', 'Explain midpoint circle algorithm', { primaryTopic: 'Midpoint Circle' }),
    ],
    'Hydrology questions',
    { subjectLabel: 'Computer Graphics (CS502)' }
  );

  assert.equal(result.mode, 'local');
  assert.ok(/could not find enough direct evidence/i.test(result.answer));
});
