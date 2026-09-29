const test = require('node:test');
const assert = require('node:assert/strict');
const { enqueueJob, getJob } = require('./backgroundJobService');

async function waitForJob(id) {
  for (let index = 0; index < 50; index += 1) {
    const job = getJob(id);
    if (['complete', 'partial', 'failed'].includes(job?.status)) return job;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  return getJob(id);
}

test('background jobs return immediately and preserve a completed result', async () => {
  const queued = enqueueJob('test', async () => ({ value: 7 }));
  assert.equal(queued.status, 'queued');
  const complete = await waitForJob(queued.id);
  assert.equal(complete.status, 'complete');
  assert.equal(complete.result.value, 7);
});

test('background jobs sanitize unexpected failures', async () => {
  const queued = enqueueJob('test', async () => { throw new Error('secret provider detail'); });
  const failed = await waitForJob(queued.id);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.error, 'The background operation could not be completed.');
});
