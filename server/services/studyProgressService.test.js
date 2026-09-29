const test = require('node:test');
const assert = require('node:assert/strict');
const { recordStudyProgress } = require('./studyProgressService');

test('study progress writes are scoped to the authenticated user', async () => {
  let observed;
  const Model = {
    findOneAndUpdate(filter, update) {
      observed = { filter, update };
      return { lean: async () => ({ ...filter, ...update.$set }) };
    },
  };
  await recordStudyProgress('user-a', { entityType: 'question', entityKey: 'question-1', title: 'Q1', route: '/questions/question-1', progress: 25 }, { Model });
  assert.equal(observed.filter.userId, 'user-a');
  assert.equal(observed.update.$set.progress, 25);
});

test('study progress rejects non-local resume routes', async () => {
  await assert.rejects(
    () => recordStudyProgress('user-a', { entityType: 'revision', entityKey: 'x', title: 'X', route: 'https://evil.example' }, { Model: {} }),
    /Invalid study progress/
  );
});
