const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildImportantTopics,
  deriveFallbackTopic,
  extractQuestionTopics,
  normalizeTopicKey,
  scoreBand,
} = require('./importantTopicsService');

function q(id, text, options = {}) {
  return {
    _id: id,
    paperId: `paper-${id}`,
    questionLabel: `Q${id}`,
    questionText: text,
    subject: 'Computer Graphics',
    subjectCode: 'CS502',
    status: 'extracted',
    year: options.year || 2026,
    examType: options.examType || 'Mid-Sem',
    marks: options.marks ?? 5,
    unit: options.unit ?? null,
    primaryTopic: options.primaryTopic || '',
    topics: options.topics || [],
    sourceLocation: {},
  };
}

test('normalizes topic keys consistently', () => {
  assert.equal(
    normalizeTopicKey('Midpoint Circle Algorithm'),
    'midpoint circle algorithm'
  );
});

test('uses explicit topic metadata before deriving a fallback', () => {
  const topics = extractQuestionTopics(
    q('1', 'Explain midpoint circle algorithm.', {
      primaryTopic: 'Raster Algorithms',
      topics: ['Raster Algorithms'],
    })
  );

  assert.equal(topics.length, 1);
  assert.equal(topics[0].label, 'Raster Algorithms');
  assert.equal(topics[0].source, 'metadata');
});

test('derives a useful fallback phrase when topic metadata is missing', () => {
  const topic = deriveFallbackTopic(
    'Explain the midpoint circle drawing algorithm with steps.'
  );

  assert.match(topic, /Midpoint/i);
  assert.match(topic, /Circle/i);
});

test('repeated questions strengthen the corresponding topic evidence', () => {
  const result = buildImportantTopics([
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

  const midpoint = result.topics.find(
    (item) => item.topic === 'Midpoint Circle'
  );

  assert.ok(midpoint);
  assert.equal(midpoint.occurrences, 2);
  assert.equal(midpoint.years.length, 2);
  assert.equal(midpoint.repeatedInstances, 2);
});

test('higher historical evidence produces a higher score', () => {
  const result = buildImportantTopics([
    q('1', 'Explain midpoint circle algorithm.', {
      year: 2026,
      marks: 5,
      primaryTopic: 'Midpoint Circle',
    }),
    q('2', 'Describe midpoint circle algorithm.', {
      year: 2025,
      marks: 5,
      primaryTopic: 'Midpoint Circle',
    }),
    q('3', 'Explain midpoint circle algorithm with steps.', {
      year: 2024,
      marks: 5,
      primaryTopic: 'Midpoint Circle',
    }),
    q('4', 'Define clipping.', {
      year: 2026,
      marks: 2,
      primaryTopic: 'Clipping',
    }),
  ]);

  const midpoint = result.topics.find(
    (item) => item.topic === 'Midpoint Circle'
  );
  const clipping = result.topics.find(
    (item) => item.topic === 'Clipping'
  );

  assert.ok(midpoint.score > clipping.score);
});

test('score breakdown is capped inside a 100 point model', () => {
  const result = buildImportantTopics([
    q('1', 'Explain midpoint circle algorithm.', {
      year: 2026,
      primaryTopic: 'Midpoint Circle',
    }),
    q('2', 'Explain midpoint circle algorithm.', {
      year: 2025,
      examType: 'End-Sem',
      primaryTopic: 'Midpoint Circle',
    }),
  ]);

  assert.ok(result.topics[0].score <= 100);
  assert.ok(result.topics[0].score >= 0);
});

test('signal bands are deterministic', () => {
  assert.equal(scoreBand(80), 'strong');
  assert.equal(scoreBand(60), 'moderate');
  assert.equal(scoreBand(35), 'developing');
  assert.equal(scoreBand(10), 'limited');
});

test('summary separates metadata-backed and derived-only topics', () => {
  const result = buildImportantTopics([
    q('1', 'Explain midpoint circle algorithm.', {
      primaryTopic: 'Midpoint Circle',
    }),
    q('2', 'Discuss perspective projection and vanishing points.', {
      primaryTopic: '',
      topics: [],
    }),
  ]);

  assert.equal(result.summary.metadataBackedTopics, 1);
  assert.equal(result.summary.derivedOnlyTopics, 1);
});
