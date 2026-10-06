const crypto = require('node:crypto');
const Paper = require('../models/Paper');
const Contribution = require('../models/Contribution');
const { enqueueJob, getJob, getActiveJobByKey } = require('./backgroundJobService');
const { rateLimitConfig } = require('../config/rateLimits');
const { extractPaperQuestions, EXTRACTION_VERSION } = require('./questionExtractionService');

const MAX_ATTEMPTS = 3;
async function contributionApproved(paper) {
  return paper.uploadMode !== 'contribution' || !paper.contributionId || Boolean(await Contribution.exists({
    _id: paper.contributionId, status: 'approved', approvedPaperId: paper._id,
  }));
}
function initialProcessingFields() {
  return { questionExtractionStatus: 'queued', processing: { stage: 'queued', jobId: crypto.randomUUID(), attempts: 0, allowAi: true, force: false } };
}
function dispatch(paper) {
  const key = `question-extraction:${paper._id}`;
  const existing = getActiveJobByKey(key);
  if (existing) return existing;
  return enqueueJob('question-extraction', async () => {
    const result = await extractPaperQuestions({ paperId: paper._id,
      force: Boolean(paper.processing?.force), allowAi: paper.processing?.allowAi !== false });
    if (result.error?.retryable) {
      const latest = await Paper.findById(paper._id).select('processing.attempts').lean();
      const attempts = latest?.processing?.attempts || 0;
      if (attempts < MAX_ATTEMPTS) {
        await Paper.updateOne({ _id: paper._id, questionExtractionStatus: { $in: ['failed', 'partial'] } }, {
          $set: { questionExtractionStatus: 'queued', 'processing.stage': 'queued',
            'processing.retryAt': new Date(Date.now() + 30000 * 2 ** attempts) } });
      }
    }
    return result;
  }, { jobId: paper.processing.jobId, queue: 'question-extraction',
    concurrency: rateLimitConfig(process.env).extractionConcurrency, dedupeKey: key });
}

async function queuePaperProcessing(paperId, { force = false, allowAi = true } = {}) {
  const existing = getActiveJobByKey(`question-extraction:${paperId}`);
  if (existing) return existing;
  const paper = await Paper.findById(paperId).lean();
  if (!paper) { const error = new Error('Paper not found'); error.statusCode = 404; throw error; }
  if (!await contributionApproved(paper)) {
    const error = new Error('Contribution approval is pending.'); error.statusCode = 409; throw error;
  }
  if (!force && paper.questionExtractionStatus === 'complete' && paper.questionExtractionVersion === EXTRACTION_VERSION && paper.processing?.jobId) return persistedJob(paper);
  if (['queued', 'processing'].includes(paper.questionExtractionStatus) && paper.processing?.jobId) {
    if (paper.questionExtractionStatus === 'queued' && (!paper.processing.retryAt || paper.processing.retryAt <= new Date())) return dispatch(paper);
    return persistedJob(paper);
  }
  const fields = initialProcessingFields();
  fields.processing.force = force; fields.processing.allowAi = allowAi;
  // Concurrent API calls cannot replace an active job or reset its retry count.
  const updated = await Paper.findOneAndUpdate({ _id: paper._id,
    questionExtractionStatus: { $nin: ['queued', 'processing'] } }, { $set: fields }, { new: true }).lean();
  return updated ? dispatch(updated) : persistedJob(await Paper.findById(paper._id).lean());
}

function persistedJob(paper) {
  const status = paper.questionExtractionStatus || 'queued';
  return { id: paper.processing?.jobId, type: 'question-extraction', status,
    createdAt: paper.processing?.startedAt || paper.createdAt,
    updatedAt: paper.processing?.finishedAt || paper.questionsUpdatedAt || paper.createdAt,
    result: ['complete', 'partial', 'failed'].includes(status) ? paper.processing?.result || null : null,
    error: status === 'failed' ? 'Paper processing failed.' : '',
    processing: { stage: paper.processing?.stage, attempts: paper.processing?.attempts,
      pages: paper.processing?.pages, reviewCount: paper.processing?.reviewCount, error: paper.processing?.error },
  };
}
async function getProcessingJob(jobId) {
  // MongoDB is authoritative across retries/restarts. Batch jobs remain in the existing queue.
  const paper = await Paper.findOne({ 'processing.jobId': String(jobId) }).lean();
  return paper ? persistedJob(paper) : getJob(jobId);
}

async function processQueuedPaper(paperId, options = {}) {
  const job = await queuePaperProcessing(paperId, options);
  let nextRecoveryAt = 0;
  for (;;) {
    const current = await getProcessingJob(job.id);
    if (!current) throw new Error('Paper processing status is unavailable.');
    if (['complete', 'partial', 'failed'].includes(current.status)) return current.result || {
      extractionStatus: current.status, failureReason: current.error,
    };
    if (Date.now() >= nextRecoveryAt) {
      await recoverPaperProcessing();
      nextRecoveryAt = Date.now() + 15000;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

let recovering = false, recoveryTimer;
async function recoverPaperProcessing() {
  if (recovering || Paper.db.readyState !== 1) return;
  recovering = true;
  try {
    const now = new Date();
    const papers = await Paper.find({
      'processing.jobId': { $exists: true },
      $or: [
        { questionExtractionStatus: 'queued', $or: [{ 'processing.retryAt': null }, { 'processing.retryAt': { $lte: now } }] },
        { questionExtractionStatus: 'processing', 'processing.leaseUntil': { $lt: now } },
      ],
    }).sort({ 'processing.retryAt': 1, _id: 1 }).limit(20).lean();
    for (const paper of papers) {
      if (!await contributionApproved(paper)) continue;
      if ((paper.processing?.attempts || 0) >= MAX_ATTEMPTS) {
        await Paper.updateOne({ _id: paper._id, questionExtractionStatus: paper.questionExtractionStatus }, {
          $set: { questionExtractionStatus: 'failed', 'processing.stage': 'failed',
            'processing.error': { stage: paper.processing.stage, code: 'RETRY_LIMIT', message: 'Paper processing failed.', retryable: false } } });
      } else dispatch(paper);
    }
  } catch { console.error('Paper processing recovery failed; the next recovery pass will retry.'); }
  finally { recovering = false; }
}
function startPaperProcessingRecovery() {
  if (recoveryTimer) return;
  recoverPaperProcessing();
  recoveryTimer = setInterval(recoverPaperProcessing, 15000);
  recoveryTimer.unref();
}
// Storage must not be deleted if dispatch fails after a successful database save.
async function startSavedPaperProcessing(paper) {
  try { return await queuePaperProcessing(paper._id); }
  catch { console.error('Paper is stored; processing remains queued for recovery.', { paperId: String(paper._id) }); return persistedJob(paper); }
}
module.exports = { initialProcessingFields, queuePaperProcessing, getProcessingJob,
  recoverPaperProcessing, startPaperProcessingRecovery, startSavedPaperProcessing, persistedJob, processQueuedPaper };
