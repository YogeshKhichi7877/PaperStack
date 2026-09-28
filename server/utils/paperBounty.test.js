const test = require('node:test');
const assert = require('node:assert/strict');
const { getBountyPriority, getPaperBounty } = require('./paperBounty');

const NOW = new Date('2026-09-25T00:00:00Z');

test('current-year missing paper is high priority', () => {
  assert.equal(getBountyPriority(2026, NOW), 'High');
});

test('previous-year missing paper is medium priority', () => {
  assert.equal(getBountyPriority(2025, NOW), 'Medium');
});

test('older paper is low priority', () => {
  assert.equal(getBountyPriority(2024, NOW), 'Low');
});

test('base high-priority bounty rewards approved + fulfillment + priority XP', () => {
  const bounty = getPaperBounty({ requestCount: 0, priority: 'High' });
  assert.equal(bounty.rewardXp, 350);
  assert.equal(bounty.bountyBonusXp, 50);
});

test('requested bounty adds demand XP', () => {
  const bounty = getPaperBounty({ requestCount: 8, priority: 'Medium' });
  assert.equal(bounty.demandBonusXp, 50);
  assert.equal(bounty.priorityBonusXp, 25);
  assert.equal(bounty.rewardXp, 375);
});

test('hot bounty reaches highest demand tier', () => {
  const bounty = getPaperBounty({ requestCount: 35, priority: 'High' });
  assert.equal(bounty.demandLevel, 'hot');
  assert.equal(bounty.bountyBonusXp, 250);
  assert.equal(bounty.rewardXp, 550);
});
