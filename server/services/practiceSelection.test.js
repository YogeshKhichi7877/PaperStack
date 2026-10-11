const test = require('node:test');
const assert = require('node:assert/strict');
const { selectBalancedQuestions } = require('./practiceService');

test('practice selection mixes difficulty, covers topics and avoids recently repeated questions', () => {
  const candidates = [
    { _id: 'old-easy', difficulty: 'easy', topicKeys: ['os:a'], status: 'verified', sourceType: 'PYQ' },
    { _id: 'new-easy', difficulty: 'easy', topicKeys: ['os:a'], status: 'verified', sourceType: 'PYQ' },
    { _id: 'medium-a', difficulty: 'medium', topicKeys: ['os:a'], status: 'verified', sourceType: 'PYQ' },
    { _id: 'medium-b', difficulty: 'medium', topicKeys: ['os:b'], status: 'verified', sourceType: 'PYQ' },
    { _id: 'hard-c', difficulty: 'hard', topicKeys: ['os:c'], status: 'reviewed', sourceType: 'PAPERSTACK_GENERATED' },
  ];
  const attempts = [{ questionId: 'old-easy', actualScore: 1, createdAt: new Date() }];
  const selected = selectBalancedQuestions(candidates, attempts, 4, 'DAILY');
  assert.deepEqual(selected.map((item) => item.difficulty), ['easy', 'medium', 'medium', 'hard']);
  assert.equal(selected[0]._id, 'new-easy');
  assert.deepEqual(new Set(selected.flatMap((item) => item.topicKeys)), new Set(['os:a', 'os:b', 'os:c']));
});

test('practice selection adapts difficulty to current mastery', () => {
  const candidates = [
    { _id: 'e1', difficulty: 'easy', status: 'verified', sourceType: 'PYQ', topicKeys: ['CS301:a'] },
    { _id: 'e2', difficulty: 'easy', status: 'verified', sourceType: 'PYQ', topicKeys: ['CS301:a'] },
    { _id: 'm1', difficulty: 'medium', status: 'verified', sourceType: 'PYQ', topicKeys: ['CS301:a'] },
    { _id: 'm2', difficulty: 'medium', status: 'verified', sourceType: 'PYQ', topicKeys: ['CS301:a'] },
    { _id: 'h1', difficulty: 'hard', status: 'verified', sourceType: 'PYQ', topicKeys: ['CS301:a'] },
  ];
  assert.equal(selectBalancedQuestions(candidates, [], 3, 'TOPIC', 20)[0].difficulty, 'easy');
  assert.equal(selectBalancedQuestions(candidates, [], 3, 'TOPIC', 85)[0].difficulty, 'medium');
});

test('review mode brings prior mistakes back before correctly repeated questions', () => {
  const candidates = [
    { _id: 'wrong', difficulty: 'easy', topicKeys: ['os:a'], status: 'verified', sourceType: 'PYQ' },
    { _id: 'correct', difficulty: 'easy', topicKeys: ['os:a'], status: 'verified', sourceType: 'PYQ' },
  ];
  const attempts = [
    { questionId: 'wrong', actualScore: 0.2, createdAt: new Date('2026-01-01') },
    { questionId: 'correct', actualScore: 1, createdAt: new Date('2026-01-01') },
  ];
  assert.equal(selectBalancedQuestions(candidates, attempts, 1, 'REVIEW')[0]._id, 'wrong');
});
