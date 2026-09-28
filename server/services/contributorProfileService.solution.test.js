const test = require('node:test');
const assert = require('node:assert/strict');
const Contribution = require('../models/Contribution');
const ResourceContribution = require('../models/ResourceContribution');
const QuestionSolution = require('../models/QuestionSolution');
const User = require('../models/User');
const Paper = require('../models/Paper');
const { buildContributorProfiles } = require('./contributorProfileService');

const query = (rows) => ({ sort() { return this; }, select() { return this; }, async lean() { return rows; } });

test('an approved answer earns XP for a solution-only contributor', async () => {
  const originals = [Contribution, ResourceContribution, QuestionSolution, User, Paper].map((model) => model.find);
  Contribution.find = () => query([]);
  ResourceContribution.find = () => query([]);
  QuestionSolution.find = () => query([{ authorUserId: 'author-1', authorName: 'Student' }]);
  User.find = () => query([{ _id: 'author-1', username: 'Student' }]);
  Paper.find = () => query([]);
  try {
    const profiles = await buildContributorProfiles();
    assert.equal(profiles.length, 1);
    assert.equal(profiles[0].approvedSolutions, 1);
    assert.equal(profiles[0].xp, 150);
    assert.ok(profiles[0].badges.includes('Solution Contributor'));
  } finally {
    [Contribution, ResourceContribution, QuestionSolution, User, Paper].forEach((model, index) => { model.find = originals[index]; });
  }
});
