const test = require('node:test');
const assert = require('node:assert/strict');
const { addUniquePaperRequester } = require('./paperRequestVoteService');

test('a student adds only one request, including simultaneous clicks', async () => {
  const request = { _id: 'paper-1', requestCount: 0, requestedUsers: [], status: 'open' };
  const Model = {
    async findOneAndUpdate(filter, update) {
      if (request.requestedUsers.some((entry) => entry.userId === filter['requestedUsers.userId'].$ne || entry.email === filter['requestedUsers.email'].$ne)) return null;
      request.requestedUsers.push(update.$push.requestedUsers);
      request.requestCount += update.$inc.requestCount;
      request.status = update.$set.status;
      return { ...request };
    },
    async findById() { return { ...request }; }
  };

  const [first, repeated] = await Promise.all([
    addUniquePaperRequester(Model, request, 'student-1', 'student@example.com'),
    addUniquePaperRequester(Model, request, 'student-1', 'student@example.com')
  ]);
  assert.deepEqual([first.alreadyRequested, repeated.alreadyRequested].sort(), [false, true]);
  assert.equal(request.requestCount, 1);
  assert.equal(request.requestedUsers.length, 1);

  const secondStudent = await addUniquePaperRequester(Model, request, 'student-2', 'another@example.com');
  assert.equal(secondStudent.alreadyRequested, false);
  assert.equal(request.requestCount, 2);
});
