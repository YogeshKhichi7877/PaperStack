const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { syntheticPdf } = require('../testFixtures/pdf');
const { importPapers, importLimits, validateFile, validatePdfStructure, attributionForUser, summarizeBatch, uploadWithRetry, solutionStem } = require('./bulkPaperImportService');

const pdf = (name, text = 'Q1. Explain cloud computing and its important advantages. [5]') => ({ originalname: name, mimetype: 'application/pdf', buffer: syntheticPdf([[text]]) });
function memoryDependencies() {
  const records = [], batches = [], dispatched = [], uploads = [];
  class PaperModel {
    constructor(data) { Object.assign(this, data); this._id = new mongoose.Types.ObjectId(); }
    async save() { await new (require('../models/Paper'))(this).validate(); records.push(this); return this; }
    static findOne(filter) { return { lean: async () => records.find((record) => record.fileHash === filter.fileHash) || null }; }
    static async findOneAndUpdate(filter, update) { const paper = records.find((record) => String(record._id) === String(filter._id)); if (!paper || paper.solutionPath) return null; Object.assign(paper, update.$set); return paper; }
  }
  class BatchModel {
    constructor(data) { Object.assign(this, data); this._id = new mongoose.Types.ObjectId(); }
    async save() { batches.push(this); return this; }
    static async updateOne() { return { matchedCount: 1 }; }
  }
  return { records, batches, dispatched, uploads, PaperModel, BatchModel,
    upload: async (file) => { uploads.push(file.originalname); return { secure_url: 'https://res.cloudinary.com/test/paper.pdf', public_id: file.originalname }; },
    destroy: async () => {}, dispatch: async (paper) => dispatched.push(paper._id), pause: async () => {}, syncResource: async () => {},
  };
}
test('30 valid PDFs import without any CSV or supplied academic metadata', async () => {
  const deps = memoryDependencies();
  const files = Array.from({ length: 30 }, (_, index) => pdf(`unhelpful-name-${index}.pdf`, `Q1. Explain the cloud computing model number ${index} and its advantages. [5]`));
  const result = await importPapers({ papers: files }, deps);
  assert.equal(result.queued, 30); assert.equal(result.failed, 0); assert.equal(result.totalFiles, 30);
  assert.equal(deps.dispatched.length, 30); assert.equal(deps.batches.length, 1);
  for (const paper of deps.records) {
    assert.equal(paper.subject, ''); assert.equal(paper.branch, ''); assert.equal(paper.semester, undefined);
    assert.equal(paper.reviewStatus, 'processing'); assert.equal(paper.questionExtractionStatus, 'queued');
    assert.equal(String(paper.importBatchId), result.batchId);
  }
});
test('one corrupt PDF does not block the other 29 papers', async () => {
  const deps = memoryDependencies();
  const files = Array.from({ length: 30 }, (_, index) => pdf(`${index}.pdf`, `Q1. Explain computing model ${index} with suitable examples. [5]`));
  files[12].buffer = Buffer.from('%PDF-1.7\ncorrupt');
  const result = await importPapers({ papers: files }, deps);
  assert.equal(result.queued, 29); assert.equal(result.failed, 1); assert.equal(result.results[12].code, 'PDF_CORRUPT');
});
test('exact duplicate uploads are skipped even under unrelated filenames', async () => {
  const deps = memoryDependencies(); const first = pdf('first.pdf'), second = { ...first, originalname: 'renamed.pdf' };
  const result = await importPapers({ papers: [first, second] }, deps);
  assert.equal(result.queued, 1); assert.equal(result.skipped, 1); assert.equal(deps.uploads.length, 1);
  const repeat = await importPapers({ papers: [second] }, deps); assert.equal(repeat.skipped, 1);
});
test('storage retries are bounded and failures remain isolated', async () => {
  let attempts = 0;
  await assert.rejects(() => uploadWithRetry(pdf('x.pdf'), async () => { attempts++; const error = new Error('Timeout'); error.code = 'ETIMEDOUT'; throw error; }, async () => {}));
  assert.equal(attempts, 3);
  const deps = memoryDependencies(); let calls = 0;
  deps.upload = async () => { if (++calls === 1) throw new Error('Unavailable storage'); return { secure_url: 'https://res.cloudinary.com/test/x.pdf', public_id: 'x' }; };
  const result = await importPapers({ papers: [pdf('bad.pdf'), pdf('good.pdf', 'Q1. Define public and private cloud computing platforms. [5]')] }, deps);
  assert.equal(result.failed, 1); assert.equal(result.queued, 1);
});
test('a saved paper remains durable if immediate dispatch fails', async () => {
  const deps = memoryDependencies(); let destroyed = 0;
  deps.dispatch = async () => { throw new Error('Queue unavailable'); }; deps.destroy = async () => { destroyed++; };
  const result = await importPapers({ papers: [pdf('x.pdf')] }, deps);
  assert.equal(result.queued, 1); assert.equal(destroyed, 0); assert.equal(deps.records[0].processing.stage, 'queued');
});
test('scanned and mixed PDFs pass structure validation without OCR at upload time', async () => {
  await validatePdfStructure({ buffer: syntheticPdf([[]]) });
  await validatePdfStructure({ buffer: syntheticPdf([['Readable page text'], []]) });
});
test('validates MIME, extension, empty files, size and configurable limits', () => {
  const file = pdf('x.pdf'); assert.equal(validateFile(file), '');
  assert.ok(validateFile({ ...file, mimetype: 'text/plain' }));
  assert.ok(validateFile({ ...file, originalname: 'x.png' }));
  assert.ok(validateFile({ ...file, buffer: Buffer.alloc(0) }));
  assert.ok(validateFile({ ...file, buffer: Buffer.alloc(31 * 1024 * 1024) }));
  assert.equal(importLimits({ BULK_UPLOAD_MAX_FILES: 50 }).maxFiles, 50);
  assert.equal(importLimits({}).maxFiles, 30);
});
test('community attribution retains internal uploader and avoids personal credit', async () => {
  const id = new mongoose.Types.ObjectId(), user = { _id: id, email: 'yogeshkhinchi2005@gmail.com', displayName: 'Yogesh' };
  const attribution = attributionForUser(user);
  assert.equal(attribution.contributedByName, 'PaperStack Community'); assert.equal(attribution.contributorUserId, null); assert.equal(attribution.actualUploaderUserId, id);
  const deps = memoryDependencies(); await importPapers({ papers: [pdf('x.pdf')], uploader: user }, deps);
  assert.equal(deps.records[0].communityContribution, true);
  assert.equal(attributionForUser({ ...user, email: 'another@example.com' }).contributorUserId, id);
});
test('persisted batch status covers processing, review, duplicates and failures', () => {
  const batch = { _id: 'batch', totalFiles: 5, ingestionComplete: true, results: [
    { paperId: '1', status: 'queued' }, { paperId: '2', status: 'queued' }, { paperId: '3', status: 'queued' }, { status: 'failed' }, { status: 'skipped' }], solutions: [] };
  const progress = summarizeBatch(batch, [{ _id: '1', questionExtractionStatus: 'complete', questionCount: 12 }, { _id: '2', questionExtractionStatus: 'partial', questionCount: 8 }, { _id: '3', questionExtractionStatus: 'processing' }]);
  assert.equal(progress.completed, 1); assert.equal(progress.needsReview, 1); assert.equal(progress.processing, 1);
  assert.equal(progress.failed, 1); assert.equal(progress.skipped, 1); assert.equal(progress.questions, 20);
});
test('solution matching strips only solution tokens, never guesses academic metadata', () => {
  assert.equal(solutionStem('CS504_End_2025_solution.pdf'), solutionStem('CS504_End_2025.pdf'));
  assert.notEqual(solutionStem('unknown.pdf'), solutionStem('CS504_End_2025.pdf'));
});
test('clear solution matches attach, ambiguous solutions are stored for review', async () => {
  const deps = memoryDependencies();
  await importPapers({ papers: [pdf('paper.pdf')], solutions: [pdf('paper_solution.pdf', 'Solution: cloud computing is a scalable platform.'), pdf('unrelated.pdf', 'Another solution for a different computing course.')] }, deps);
  assert.ok(deps.records[0].solutionPath);
  assert.equal(deps.batches[0].solutions[0].status, 'attached');
  assert.equal(deps.batches[0].solutions[1].status, 'needs_review');
  assert.ok(deps.batches[0].solutions[1].fileUrl);
});
test('batch can recover a saved paper missing from bookkeeping after interruption', () => {
  const batch = { _id: 'batch', totalFiles: 2, ingestionComplete: false, updatedAt: new Date(Date.now() - 25 * 60 * 1000), results: [] };
  const result = summarizeBatch(batch, [{ _id: '1', originalFileName: 'stored.pdf', questionExtractionStatus: 'complete', questionCount: 12 }]);
  assert.equal(result.completed, 1); assert.equal(result.missingFiles, 1); assert.equal(result.interrupted, true); assert.equal(result.status, 'finished');
});
