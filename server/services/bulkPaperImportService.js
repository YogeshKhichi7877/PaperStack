const crypto = require('node:crypto');
const { PDFParse } = require('pdf-parse');
const Paper = require('../models/Paper');
const PaperImportBatch = require('../models/PaperImportBatch');
const { initialProcessingFields, startSavedPaperProcessing } = require('./paperProcessingQueue');
const { isTransientError } = require('./paperProcessingErrors');

function importLimits(env = process.env) {
  const bounded = (value, fallback, max) => Math.max(1, Math.min(max, Math.floor(Number(value) || fallback)));
  return { maxFiles: bounded(env.BULK_UPLOAD_MAX_FILES, 30, 80), maxFileMb: 30,
    maxBatchMb: bounded(env.BULK_UPLOAD_MAX_TOTAL_MB, 150, 512) };
}
function fileHash(file) { return crypto.createHash('sha256').update(file.buffer).digest('hex'); }
function validateFile(file, limits = importLimits()) {
  if (!file || !/\.pdf$/i.test(file.originalname || '') || !['application/pdf', 'application/octet-stream'].includes(file.mimetype)) return 'Select PDF files only.';
  if (!Buffer.isBuffer(file.buffer) || !file.buffer.length) return 'This PDF is empty.';
  if (file.buffer.length > limits.maxFileMb * 1024 * 1024) return `Each PDF must be ${limits.maxFileMb} MB or smaller.`;
  if (/[\x00-\x1f]/.test(file.originalname) || !file.buffer.subarray(0, 1024).includes(Buffer.from('%PDF-'))) return 'This file is not a valid PDF.';
  return '';
}
async function validatePdfStructure(file) {
  const parser = new PDFParse({ data: file.buffer });
  try {
    const info = await parser.getInfo();
    if (!info.total) throw new Error('Empty PDF');
    if (info.total > Math.max(1, Math.min(300, Number(process.env.QUESTION_PDF_MAX_PAGES) || 100))) {
      const error = new Error('This PDF exceeds the processing page limit.'); error.code = 'PDF_PAGE_LIMIT'; throw error;
    }
  } catch (error) {
    if (error.code === 'PDF_PAGE_LIMIT') throw error;
    const invalid = new Error('This PDF is corrupt or encrypted. Upload a readable PDF.'); invalid.code = 'PDF_CORRUPT'; throw invalid;
  } finally { await parser.destroy(); }
}
function attributionForUser(user) {
  const community = String(user?.email || '').trim().toLowerCase() === 'yogeshkhinchi2005@gmail.com';
  return { actualUploaderUserId: user?._id || null, contributorUserId: community ? null : user?._id || null,
    contributedByName: community ? 'PaperStack Community' : user?.displayName || user?.username || 'PaperStack Admin',
    contributedBy: community ? 'PaperStack Community' : user?.displayName || user?.username || 'PaperStack Admin',
    communityContribution: community };
}
function solutionStem(name) {
  return String(name).replace(/\.pdf$/i, '').toLowerCase().replace(/(?:^|[\s_.-])(?:solutions?|answers?|solved)(?=$|[\s_.-])/g, ' ').replace(/[^a-z0-9]/g, '');
}
async function uploadWithRetry(file, upload, pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))) {
  for (let attempt = 0; ; attempt += 1) {
    try { return await upload(file); }
    catch (error) { if (attempt >= 2 || !isTransientError(error)) throw error; await pause(500 * 2 ** attempt); }
  }
}

// Refactored Upload Center importer. Only storage and structural validation run
// during the request; the durable Paper queue owns OCR, metadata and questions.
async function importPapers({ papers, solutions = [], uploader = null }, dependencies = {}) {
  const { upload, destroy, PaperModel = Paper, BatchModel = PaperImportBatch,
    validatePdf = validatePdfStructure, dispatch = startSavedPaperProcessing, pause,
    syncResource = require('./resourceService').syncResourceFromPaper } = dependencies;
  const batch = await new BatchModel({ totalFiles: papers.length, createdBy: uploader?._id || null, results: [], solutions: [] }).save();
  for (const file of papers) {
    let stored, saved;
    const hash = fileHash(file);
    let result;
    try {
      const invalid = validateFile(file); if (invalid) { const error = new Error(invalid); error.code = 'INVALID_PDF'; throw error; }
      const duplicate = await PaperModel.findOne({ fileHash: hash }).lean();
      if (duplicate) result = { fileName: file.originalname, fileHash: hash, paperId: duplicate._id, status: 'skipped', code: 'DUPLICATE', message: 'This exact PDF is already stored.' };
      else {
        await validatePdf(file);
        stored = await uploadWithRetry(file, upload, pause);
        saved = await new PaperModel({ title: 'Question paper — detecting details', subject: '', subjectCode: '', branch: '',
          originalFileName: file.originalname, filePath: stored.secure_url || stored.url, filePublicId: stored.public_id,
          fileHash: hash, fileSize: file.buffer.length, mimeType: 'application/pdf', uploadMode: 'bulk', uploadedBy: 'admin',
          importBatchId: batch._id, reviewStatus: 'processing', ...attributionForUser(uploader), ...initialProcessingFields() }).save();
        // Recovery can find saved papers even if the request/server ends here.
        await dispatch(saved);
        result = { fileName: file.originalname, fileHash: hash, paperId: saved._id, status: 'queued' };
      }
    } catch (error) {
      if (stored && !saved) await destroy(stored.public_id).catch(() => {});
      const duplicate = error.code === 11000 ? await PaperModel.findOne({ fileHash: hash }).lean() : null;
      result = saved ? { fileName: file.originalname, fileHash: hash, paperId: saved._id, status: 'queued' }
        : { fileName: file.originalname, fileHash: hash, ...(duplicate ? { paperId: duplicate._id } : {}),
          status: duplicate ? 'skipped' : 'failed', code: duplicate ? 'DUPLICATE' : error.code === 'PDF_CORRUPT' || error.code === 'PDF_PAGE_LIMIT' || error.code === 'INVALID_PDF' ? error.code : 'STORAGE_FAILED',
          message: duplicate ? 'This exact PDF is already stored.' : ['PDF_CORRUPT', 'PDF_PAGE_LIMIT', 'INVALID_PDF'].includes(error.code) ? error.message : 'Upload failed. Select this PDF again to retry.' };
    }
    await BatchModel.updateOne({ _id: batch._id }, { $push: { results: result } });
    batch.results.push(result);
  }
  for (const file of solutions) {
    let stored, attached;
    let entry;
    const hash = fileHash(file);
    try {
      const invalid = validateFile(file); if (invalid) throw new Error(invalid);
      await validatePdf(file);
      if (batch.solutions.some((solution) => solution.fileHash === hash)) continue;
      stored = await uploadWithRetry(file, upload, pause);
      const matches = batch.results.filter((result) => result.status === 'queued' && solutionStem(result.fileName) === solutionStem(file.originalname));
      // Unique exact stem match is the only automatic filename association.
      const match = matches.length === 1 ? matches[0] : null;
      attached = match ? await PaperModel.findOneAndUpdate({ _id: match.paperId, solutionPath: { $in: ['', null] } },
        { $set: { solutionPath: stored.secure_url || stored.url, solutionPublicId: stored.public_id } }, { new: true }) : null;
      if (attached) await syncResource(attached).catch(() => {});
      entry = { fileName: file.originalname, fileHash: hash, fileUrl: stored.secure_url || stored.url,
        storageKey: stored.public_id, paperId: attached?._id, status: attached ? 'attached' : 'needs_review' };
    } catch { entry = stored ? { fileName: file.originalname, fileHash: hash, fileUrl: stored.secure_url || stored.url,
      storageKey: stored.public_id, paperId: attached?._id, status: attached ? 'attached' : 'needs_review', message: 'Check the solution association.' }
      : { fileName: file.originalname, fileHash: hash, status: 'failed', message: 'Solution upload failed. Select it again to retry.' }; }
    await BatchModel.updateOne({ _id: batch._id }, { $push: { solutions: entry } }); batch.solutions.push(entry);
  }
  await BatchModel.updateOne({ _id: batch._id }, { $set: { ingestionComplete: true } });
  return { success: true, batchId: String(batch._id), totalFiles: papers.length,
    publicContributor: attributionForUser(uploader).contributedByName,
    communityAdded: attributionForUser(uploader).communityContribution ? batch.results.filter((result) => result.status === 'queued').length : 0,
    queued: batch.results.filter((result) => result.status === 'queued').length,
    skipped: batch.results.filter((result) => result.status === 'skipped').length,
    failed: batch.results.filter((result) => result.status === 'failed').length,
    status: batch.results.some((result) => result.status === 'queued') ? 'processing' : 'finished', results: batch.results };
}

function summarizeBatch(batch, papers) {
  // A server interruption between Paper.save and batch bookkeeping must not
  // hide a durable queued paper from the batch screen.
  const entries = [...batch.results];
  for (const paper of papers) if (!entries.some((result) => String(result.paperId) === String(paper._id))) entries.push({ paperId: paper._id, fileName: paper.originalFileName, fileHash: paper.fileHash, status: 'queued' });
  const byId = new Map(papers.map((paper) => [String(paper._id), paper]));
  const counts = { completed: 0, processing: 0, waiting: 0, needsReview: 0, failed: 0, skipped: 0, questions: 0 };
  const results = entries.map((result) => {
    const paper = byId.get(String(result.paperId));
    const state = result.status !== 'queued' ? result.status : paper?.questionExtractionStatus || 'queued';
    const key = state === 'complete' ? 'completed' : state === 'partial' ? 'needsReview' : state === 'queued' ? 'waiting' : state;
    if (key in counts) counts[key] += 1;
    if (result.status === 'queued') counts.questions += paper?.questionCount || 0;
    return { ...result, status: key, ...(paper && result.status === 'queued' ? { paper } : {}) };
  });
  const interrupted = !batch.ingestionComplete && Date.now() - new Date(batch.updatedAt || batch.createdAt || Date.now()).getTime() > 20 * 60 * 1000;
  return { batchId: String(batch._id), totalFiles: batch.totalFiles, createdAt: batch.createdAt, ...counts,
    interrupted, missingFiles: Math.max(0, batch.totalFiles - entries.length),
    status: !batch.ingestionComplete && !interrupted ? 'uploading' : counts.waiting || counts.processing ? 'processing' : 'finished',
    results, solutions: batch.solutions || [] };
}
module.exports = { importLimits, validateFile, validatePdfStructure, attributionForUser, solutionStem, uploadWithRetry, importPapers, summarizeBatch };
