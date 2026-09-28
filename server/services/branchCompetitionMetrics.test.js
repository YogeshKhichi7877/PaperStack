const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildBranchCompetition,
  normalizeBranchWeights,
  periodStart,
} = require('./branchCompetitionMetrics');

test('shared branch splits credit equally', () => {
  assert.deepEqual(
    normalizeBranchWeights('CSE & ECE'),
    { CSE: 0.5, ECE: 0.5 }
  );
});

test('30 day period begins before now', () => {
  const now = new Date('2026-09-26T00:00:00Z');
  assert.ok(periodStart('30d', now) < now);
});

test('competition uses documented point weights', () => {
  const result = buildBranchCompetition({
    period: 'all',
    contributions: [
      {
        status: 'approved',
        branch: 'CSE',
        contributorUserId: 'u1',
        contributorName: 'A',
      },
    ],
    solutions: [
      {
        status: 'approved',
        branch: 'CSE',
        authorUserId: 'u1',
        authorName: 'A',
      },
    ],
    verifications: [
      { branch: 'CSE' },
    ],
  });

  const cse = result.leaderboard.find((item) => item.branch === 'CSE');

  assert.equal(cse.points, 145);
});

test('shared paper does not double count full points', () => {
  const result = buildBranchCompetition({
    period: 'all',
    contributions: [
      {
        status: 'approved',
        branch: 'CSE & ECE',
      },
    ],
  });

  const cse = result.leaderboard.find((item) => item.branch === 'CSE');
  const ece = result.leaderboard.find((item) => item.branch === 'ECE');

  assert.equal(cse.points, 50);
  assert.equal(ece.points, 50);
});

test('old activity is excluded from seven day view', () => {
  const result = buildBranchCompetition({
    period: '7d',
    now: new Date('2026-09-26T00:00:00Z'),
    contributions: [
      {
        status: 'approved',
        branch: 'CSE',
        approvedAt: '2026-01-01T00:00:00Z',
      },
    ],
  });

  assert.equal(result.summary.approvedPapers, 0);
});
