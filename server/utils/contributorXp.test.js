const test = require('node:test');
const assert = require('node:assert/strict');
const {
  XP_RULES,
  calculateContributorXp,
  getContributorBadges,
  compareContributorProfiles,
  getNextXpMilestone,
} = require('./contributorXp');

test('XP rules reward papers, solutions, and fulfilled requests', () => {
  assert.equal(XP_RULES.APPROVED_PAPER, 100);
  assert.equal(XP_RULES.APPROVED_SOLUTION, 150);
  assert.equal(XP_RULES.FULFILLED_REQUEST, 200);
  assert.equal(calculateContributorXp({ approvedPapers: 2, approvedSolutions: 1, fulfilledRequests: 1 }), 550);
});

test('verified uploader and archive badges are derived from contribution counts', () => {
  const badges = getContributorBadges({ approvedPapers: 5, approvedSolutions: 1, fulfilledRequests: 0 });
  assert.ok(badges.includes('Verified Uploader'));
  assert.ok(badges.includes('Archive Builder'));
  assert.ok(badges.includes('Paper Hunter'));
  assert.ok(badges.includes('Solution Contributor'));
});

test('request fulfilment creates bounty hunter badge', () => {
  assert.ok(getContributorBadges({ fulfilledRequests: 1 }).includes('Bounty Hunter'));
});

test('1000 impact interactions creates community hero badge', () => {
  assert.ok(getContributorBadges({ impactViews: 900, impactDownloads: 100 }).includes('Community Hero'));
});

test('leaderboard comparison prioritizes XP before impact', () => {
  const highXp = { name: 'A', xp: 500, impactViews: 10, impactDownloads: 0, approvedPapers: 1 };
  const highImpact = { name: 'B', xp: 400, impactViews: 5000, impactDownloads: 100, approvedPapers: 4 };
  assert.ok(compareContributorProfiles(highXp, highImpact) < 0);
});

test('next XP milestone advances beyond current XP', () => {
  assert.equal(getNextXpMilestone(550), 1000);
  assert.equal(getNextXpMilestone(10000), null);
});
