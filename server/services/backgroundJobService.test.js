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

test('duplicate active jobs reuse one processor and one job id', async () => {
  let calls = 0;
  const processor = async () => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 15));
    return { value: 1 };
  };
  const first = enqueueJob('dedupe-test', processor, {
    dedupeKey: 'paper:dedupe-test', queue: 'dedupe-test', concurrency: 1,
  });
  const second = enqueueJob('dedupe-test', processor, {
    dedupeKey: 'paper:dedupe-test', queue: 'dedupe-test', concurrency: 1,
  });
  assert.equal(second.id, first.id);
  assert.equal(second.deduplicated, true);
  await waitForJob(first.id);
  assert.equal(calls, 1);
});

test('queue concurrency prevents overlapping heavy extraction work', async () => {
  let active = 0;
  let maximumActive = 0;
  const processor = async () => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, 15));
    active -= 1;
    return { ok: true };
  };
  const first = enqueueJob('queue-test', processor, {
    dedupeKey: 'queue-test:1', queue: 'limited-test', concurrency: 1,
  });
  const second = enqueueJob('queue-test', processor, {
    dedupeKey: 'queue-test:2', queue: 'limited-test', concurrency: 1,
  });
  await Promise.all([waitForJob(first.id), waitForJob(second.id)]);
  assert.equal(maximumActive, 1);
});

test('an extraction failure result becomes a failed background job', async () => {
  const queued = enqueueJob('failed-result-test', async () => ({
    extractionStatus: 'failed',
    failureReason: 'No readable questions were found.',
  }));
  const failed = await waitForJob(queued.id);
  assert.equal(failed.status, 'failed');
  assert.equal(failed.error, 'No readable questions were found.');
});
