const crypto = require('node:crypto');

const jobs = new Map();
const activeDedupeKeys = new Map();
const queues = new Map();
const activeByQueue = new Map();
const RETENTION_MS = 24 * 60 * 60 * 1000;

function cleanJobs() {
  const cutoff = Date.now() - RETENTION_MS;
  for (const [id, job] of jobs) {
    if (job.updatedAt.getTime() < cutoff && ['complete', 'partial', 'failed'].includes(job.status)) {
      jobs.delete(id);
    }
  }
}

function publicJob(job) {
  if (!job) return null;
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    result: job.result,
    error: job.error,
    deduplicated: Boolean(job.deduplicated),
  };
}

function drainQueue(queueName) {
  const queue = queues.get(queueName) || [];
  const active = activeByQueue.get(queueName) || 0;
  if (!queue.length || active >= queue[0].concurrency) return;
  const entry = queue.shift();
  activeByQueue.set(queueName, active + 1);
  const { job, processor } = entry;
  job.status = 'processing';
  job.updatedAt = new Date();

  Promise.resolve()
    .then(processor)
    .then((result) => {
      job.result = result;
      if (result?.extractionStatus === 'failed') {
        job.status = 'failed';
        job.error = String(result.failureReason || 'Question extraction did not find usable questions.');
      } else {
        job.status = result?.extractionStatus === 'partial' ? 'partial' : 'complete';
      }
    })
    .catch((error) => {
      job.status = 'failed';
      job.error = error?.statusCode && error.statusCode < 500
        ? String(error.message || 'Job failed')
        : 'The background operation could not be completed.';
      console.error('PaperStack background job failed', {
        jobId: job.id,
        type: job.type,
        category: error?.code || error?.name || 'error',
      });
    })
    .finally(() => {
      job.updatedAt = new Date();
      if (job.dedupeKey) activeDedupeKeys.delete(job.dedupeKey);
      activeByQueue.set(queueName, Math.max(0, (activeByQueue.get(queueName) || 1) - 1));
      drainQueue(queueName);
    });
}

function enqueueJob(type, processor, options = {}) {
  if (typeof processor !== 'function') throw new TypeError('Background job requires a processor');
  cleanJobs();
  const dedupeKey = String(options.dedupeKey || '');
  if (dedupeKey) {
    const existingId = activeDedupeKeys.get(dedupeKey);
    const existing = existingId ? jobs.get(existingId) : null;
    if (existing && ['queued', 'processing'].includes(existing.status)) {
      return publicJob({ ...existing, deduplicated: true });
    }
  }
  const now = new Date();
  const job = {
    id: options.jobId || crypto.randomUUID(),
    type: String(type || 'job'),
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    result: null,
    error: '',
    dedupeKey,
    deduplicated: false,
  };
  jobs.set(job.id, job);
  if (dedupeKey) activeDedupeKeys.set(dedupeKey, job.id);

  const queueName = String(options.queue || type || 'default');
  const concurrency = Math.max(1, Math.min(20, Number(options.concurrency) || 20));
  const queue = queues.get(queueName) || [];
  queue.push({ job, processor, concurrency });
  queues.set(queueName, queue);
  setImmediate(() => drainQueue(queueName));

  return publicJob(job);
}

function getJob(id) {
  cleanJobs();
  return publicJob(jobs.get(String(id || '')));
}

function getActiveJobByKey(dedupeKey) {
  const id = activeDedupeKeys.get(String(dedupeKey || ''));
  return id ? getJob(id) : null;
}

module.exports = { enqueueJob, getActiveJobByKey, getJob, publicJob };
