const test = require('node:test');
const assert = require('node:assert/strict');
const { buildDifficultyStats, findHardestSubject } = require('./analytics');

test('difficulty uses student votes instead of views/downloads', () => {
  const papers = [
    { _id: 'p1', subject: 'Computer Graphics', views: 5000 },
    { _id: 'p2', subject: 'Data Science', views: 10 },
  ];
  const votes = [
    { paperId: 'p1', difficulty: 'Easy' },
    { paperId: 'p1', difficulty: 'Medium' },
    { paperId: 'p2', difficulty: 'Hard' },
    { paperId: 'p2', difficulty: 'Hard' },
  ];

  assert.equal(findHardestSubject(papers, votes), 'Data Science');
  assert.deepEqual(buildDifficultyStats(papers, votes)[0], {
    subject: 'Data Science',
    voteCount: 2,
    averageDifficulty: 3,
  });
});

test('difficulty returns empty when there are no votes', () => {
  assert.equal(findHardestSubject([{ _id: 'p1', subject: 'CG' }], []), '');
});
