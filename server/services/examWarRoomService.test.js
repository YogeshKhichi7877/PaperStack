const test = require('node:test');
const assert = require('node:assert/strict');

const {
  allocateSessionMinutes,
  buildExamWarRoom,
  clampMinutes,
} = require('./examWarRoomService');

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
    examType:
      options.examType || 'Mid-Sem',
    marks: options.marks ?? 5,
    questionType:
      options.questionType || 'theory',
    primaryTopic:
      options.primaryTopic || '',
    topics: options.topics || [],
    status: 'extracted',
    sourceLocation: {},
  };
}

test('session minutes are clamped to a sensible range', () => {
  assert.equal(clampMinutes(10), 20);
  assert.equal(clampMinutes(240), 180);
  assert.equal(clampMinutes('60'), 60);
});

test('focus-plan phases add up to the requested session length', () => {
  const plan =
    allocateSessionMinutes(60);

  const total =
    plan.phases.reduce(
      (sum, phase) =>
        sum + phase.minutes,
      0
    );

  assert.equal(total, 60);
  assert.equal(
    plan.totalMinutes,
    60
  );
});

test('war room creates topic, repeat, and practice missions', () => {
  const room = buildExamWarRoom([
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

  assert.ok(
    room.missions.topics.length >= 2
  );

  assert.equal(
    room.missions.repeats.length,
    1
  );

  assert.ok(
    room.missions.practice.length >= 1
  );
});

test('war room tracks approved-solution availability', () => {
  const room = buildExamWarRoom(
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

  assert.ok(
    room.summary.solutionReadyQuestions >= 1
  );
});

test('war room respects exam-specific input', () => {
  const room = buildExamWarRoom(
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

  assert.equal(
    room.scope.examType,
    'Mid-Sem'
  );

  assert.deepEqual(
    room.scope.examTypes,
    ['Mid-Sem']
  );
});

test('mission ids are unique within one war room', () => {
  const room = buildExamWarRoom([
    q('1', 'Explain midpoint circle algorithm.', {
      year: 2026,
      primaryTopic: 'Midpoint Circle',
    }),
    q('2', 'Explain midpoint circle algorithm.', {
      year: 2025,
      primaryTopic: 'Midpoint Circle',
    }),
    q('3', 'Explain clipping window.', {
      primaryTopic: 'Clipping',
    }),
  ]);

  const ids =
    room.missions.allMissionIds;

  assert.equal(
    new Set(ids).size,
    ids.length
  );
});

test('shorter sessions still produce all four focus phases', () => {
  const plan =
    allocateSessionMinutes(20);

  assert.equal(
    plan.phases.length,
    4
  );

  assert.ok(
    plan.phases.every(
      (phase) => phase.minutes >= 1
    )
  );
});

test('methodology explicitly avoids prediction claims', () => {
  const room = buildExamWarRoom([
    q('1', 'Explain midpoint circle algorithm.', {
      primaryTopic: 'Midpoint Circle',
    }),
  ]);

  assert.match(
    room.methodology.disclaimer,
    /does not predict/i
  );
});
