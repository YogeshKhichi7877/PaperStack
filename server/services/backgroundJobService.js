const crypto = require('node:crypto');

const jobs = new Map();
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
  };
}

function enqueueJob(type, processor) {
  if (typeof processor !== 'function') throw new TypeError('Background job requires a processor');
  cleanJobs();
  const now = new Date();
  const job = {
    id: crypto.randomUUID(),
    type: String(type || 'job'),
    status: 'queued',
    createdAt: now,
    updatedAt: now,
    result: null,
    error: '',
  };
  jobs.set(job.id, job);

  setImmediate(async () => {
    job.status = 'processing';
    job.updatedAt = new Date();
    try {
      job.result = await processor();
      job.status = job.result?.extractionStatus === 'partial' ? 'partial' : 'complete';
    } catch (error) {
      job.status = 'failed';
      job.error = error?.statusCode && error.statusCode < 500
        ? String(error.message || 'Job failed')
        : 'The background operation could not be completed.';
      console.error('PaperStack background job failed', {
        jobId: job.id,
        type: job.type,
        category: error?.code || error?.name || 'error',
      });
    }
    job.updatedAt = new Date();
  });

  return publicJob(job);
}

function getJob(id) {
  cleanJobs();
  return publicJob(jobs.get(String(id || '')));
}

module.exports = { enqueueJob, getJob, publicJob };
