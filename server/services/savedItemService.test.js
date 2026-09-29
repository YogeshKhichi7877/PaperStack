const test = require('node:test');
const assert = require('node:assert/strict');
const { saveItem } = require('./savedItemService');

test('saved item ownership comes from the authenticated user argument', async () => {
  let observed;
  const Model = {
    findOneAndUpdate(filter, update) {
      observed = { filter, update };
      return { lean: async () => ({ ...filter, ...update.$set }) };
    },
  };
  const item = await saveItem('user-a', { entityType: 'question', entityId: '507f1f77bcf86cd799439011', title: 'Q1', route: '/questions/507f1f77bcf86cd799439011' }, {
    Model,
    verifyEntity: async () => ({ _id: '507f1f77bcf86cd799439011', questionText: 'Q1' }),
  });
  assert.equal(observed.filter.userId, 'user-a');
  assert.equal(item.entityType, 'question');
});

test('saved items reject unknown entity types', async () => {
  await assert.rejects(() => saveItem('user-a', { entityType: 'admin', entityKey: 'x' }), /Invalid saved item/);
});
