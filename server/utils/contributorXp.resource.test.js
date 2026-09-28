const test = require('node:test');
const assert = require('node:assert/strict');

const {
  calculateContributorXp,
  getContributorBadges,
} = require('./contributorXp');

test('approved resource XP is added to existing contributor XP', () => {
  const xp = calculateContributorXp({
    approvedPapers: 1,
    approvedSolutions: 0,
    fulfilledRequests: 0,
    resourceXp: 60,
  });

  assert.equal(xp, 160);
});

test('approved resources unlock resource contributor badges', () => {
  const badges = getContributorBadges({
    approvedResources: 5,
  });

  assert.ok(
    badges.includes('Resource Contributor')
  );

  assert.ok(
    badges.includes('Knowledge Builder')
  );
});
