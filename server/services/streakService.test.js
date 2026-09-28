const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildBadges,
  buildRecentDays,
  buildStreakSnapshot,
  categoryDayCounts,
  computeStreaks,
  normalizeCategory,
  validDayKey,
} = require('./streakService');

function day(dayKey, categories = ['questions']) {
  return {
    dayKey,
    categories,
    eventCount: 1,
  };
}

test('validates real day keys', () => {
  assert.equal(validDayKey('2026-09-26'), true);
  assert.equal(validDayKey('2026-02-30'), false);
  assert.equal(validDayKey('bad'), false);
});

test('normalizes only supported study categories', () => {
  assert.equal(normalizeCategory('revision'), 'revision');
  assert.equal(normalizeCategory('ADMIN'), null);
});

test('computes current and longest streak', () => {
  const result = computeStreaks(
    [
      day('2026-09-22'),
      day('2026-09-23'),
      day('2026-09-25'),
      day('2026-09-26'),
    ],
    '2026-09-26'
  );

  assert.equal(result.currentStreak, 2);
  assert.equal(result.longestStreak, 2);
  assert.equal(result.activeDays, 4);
});

test('yesterday can still preserve current streak before studying today', () => {
  const result = computeStreaks(
    [
      day('2026-09-24'),
      day('2026-09-25'),
    ],
    '2026-09-26'
  );

  assert.equal(result.currentStreak, 2);
});

test('old activity does not count as a current streak', () => {
  const result = computeStreaks(
    [
      day('2026-09-20'),
      day('2026-09-21'),
    ],
    '2026-09-26'
  );

  assert.equal(result.currentStreak, 0);
  assert.equal(result.longestStreak, 2);
});

test('category day counts count days rather than page refreshes', () => {
  const result = categoryDayCounts([
    {
      dayKey: '2026-09-25',
      categories: ['revision', 'revision', 'questions'],
      eventCount: 20,
    },
    {
      dayKey: '2026-09-26',
      categories: ['revision'],
      eventCount: 2,
    },
  ]);

  assert.equal(result.revision, 2);
  assert.equal(result.questions, 1);
});

test('badges combine study and community progress', () => {
  const badges = buildBadges({
    streaks: {
      activeDays: 7,
      longestStreak: 7,
    },
    categoryCounts: {
      revision: 3,
      mock: 1,
      questions: 5,
      ask: 0,
    },
    community: {
      approvedContributions: 1,
      approvedSolutions: 0,
      verificationCount: 5,
    },
  });

  const byId = new Map(
    badges.map((badge) => [
      badge.id,
      badge,
    ])
  );

  assert.equal(byId.get('streak_7').earned, true);
  assert.equal(byId.get('revision_regular').earned, true);
  assert.equal(byId.get('archive_builder').earned, true);
  assert.equal(byId.get('solution_helper').earned, false);
});

test('recent day grid returns requested number of days', () => {
  const result = buildRecentDays(
    [
      day('2026-09-26'),
    ],
    '2026-09-26',
    14
  );

  assert.equal(result.length, 14);
  assert.equal(result[result.length - 1].active, true);
});

test('snapshot separates earned and locked badges', () => {
  const result = buildStreakSnapshot({
    activities: [
      day('2026-09-25'),
      day('2026-09-26'),
    ],
    todayKey: '2026-09-26',
    community: {},
  });

  assert.ok(result.earnedBadges.length >= 1);
  assert.ok(result.lockedBadges.length >= 1);
});
