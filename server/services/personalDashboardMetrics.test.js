const test = require('node:test');
const assert = require('node:assert/strict');

const {
  countByStatus,
  dashboardLevel,
  impactSummary,
  sanitizeBookmark,
  sumStatusCounts,
} = require('./personalDashboardMetrics');

test('status rows become a predictable object', () => {
  const result = countByStatus([
    { _id: 'approved', count: 3 },
    { _id: 'pending', count: 2 },
  ]);

  assert.deepEqual(result, {
    approved: 3,
    pending: 2,
  });
});

test('status counts sum correctly', () => {
  assert.equal(
    sumStatusCounts({
      approved: 2,
      pending: 3,
    }),
    5
  );
});

test('dashboard levels follow XP milestones', () => {
  assert.equal(dashboardLevel(0), 'Explorer');
  assert.equal(dashboardLevel(100), 'Contributor');
  assert.equal(dashboardLevel(1300), 'Campus Builder');
  assert.equal(dashboardLevel(3000), 'Archive Legend');
});

test('impact summary merges contribution and community stats', () => {
  const result = impactSummary({
    contributionCounts: {
      approved: 2,
      pending: 1,
    },
    solutionCounts: {
      approved: 1,
    },
    bookmarkCount: 4,
    requestCount: 2,
    verificationCount: 7,
    contributorProfile: {
      xp: 450,
      rank: 8,
      impactViews: 100,
      impactDownloads: 25,
    },
  });

  assert.equal(result.contributionTotal, 3);
  assert.equal(result.approvedSolutions, 1);
  assert.equal(result.bookmarkCount, 4);
  assert.equal(result.verificationCount, 7);
  assert.equal(result.level, 'Contributor');
});

test('bookmark sanitizer never exposes user data', () => {
  const result = sanitizeBookmark({
    _id: 'paper-1',
    title: 'CG',
    subjectCode: 'CS502',
    contributorUserId: 'secret-user',
  });

  assert.equal(result._id, 'paper-1');
  assert.ok(
    !Object.prototype.hasOwnProperty.call(
      result,
      'contributorUserId'
    )
  );
});
