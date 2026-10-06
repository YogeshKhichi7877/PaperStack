const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { rateLimit } = require('express-rate-limit');
const User = require('../models/User');
const Paper = require('../models/Paper');
const Question = require('../models/Question');
const Batch = require('../models/PaperImportBatch');
const { importLimits, importPapers, summarizeBatch } = require('../services/bulkPaperImportService');
const { metadataFromText } = require('../services/paperMetadataService');
const { OFFICIAL_BRANCHES } = require('../utils/branches');
const { syncResourceFromPaper } = require('../services/resourceService');

// Cap total buffered bytes as they arrive, rather than accepting 30 x 30 MB.
function boundedMemoryStorage(maxBytes) {
  return {
    _handleFile(req, file, cb) {
      const chunks = []; let size = 0, failed = false;
      file.stream.on('data', (chunk) => {
        if (failed) return;
        req.importBytes = (req.importBytes || 0) + chunk.length;
        if (req.importBytes > maxBytes) { failed = true; chunks.length = 0; cb(new Error('Batch is too large. Split it into smaller batches.')); return; }
        chunks.push(chunk); size += chunk.length;
      });
      file.stream.once('error', (error) => { if (!failed) { failed = true; cb(error); } });
      file.stream.once('end', () => { if (!failed) cb(null, { buffer: Buffer.concat(chunks), size }); });
    },
    _removeFile(req, file, cb) { delete file.buffer; cb(null); },
  };
}
async function authenticatedUploader(req, secret) {
  let identity = req.admin;
  const secondary = req.header('X-User-Authorization');
  if (secondary) {
    identity = jwt.verify(String(secondary).replace(/^Bearer\s+/i, ''), secret, { algorithms: ['HS256'] });
    if (!identity._id || identity.tokenType === 'admin') throw new Error('Invalid uploader identity');
  }
  if (!identity?._id) return null; // Password-only admin sessions have no user identity.
  const user = await User.findById(identity._id).select('_id email username displayName').lean();
  if (!user) throw new Error('Uploader account no longer exists');
  return user;
}
module.exports = function createBulkPaperImportRouter({ authenticateAdmin, upload, destroy, jwtSecret, importer = importPapers }) {
  const router = express.Router(); router.use(authenticateAdmin);
  const limits = importLimits();
  const receive = multer({ storage: boundedMemoryStorage(limits.maxBatchMb * 1024 * 1024),
    limits: { fileSize: limits.maxFileMb * 1024 * 1024, files: limits.maxFiles * 2, fields: 0 },
  }).fields([{ name: 'papers', maxCount: limits.maxFiles }, { name: 'solutions', maxCount: limits.maxFiles }]);
  const limiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false,
    message: { message: 'Too many import batches. Try again in a few minutes.' } });
  router.get('/config', async (req, res) => {
    try { return res.json({ ...limits, communityContributions: await Paper.countDocuments({ communityContribution: true }) }); }
    catch { return res.status(503).json({ message: 'Import settings are temporarily unavailable.' }); }
  });
  router.post('/', limiter, async (req, res, next) => {
    try { req.importUploader = await authenticatedUploader(req, jwtSecret); next(); }
    catch { res.status(401).json({ message: 'Sign in again to verify your uploader identity.' }); }
  }, (req, res, next) => receive(req, res, (error) => {
    if (error) return res.status(400).json({ message: error.code === 'LIMIT_FILE_SIZE' ? `Each PDF must be ${limits.maxFileMb} MB or smaller.` : error.code?.startsWith('LIMIT_') ? `Select up to ${limits.maxFiles} papers and optional solution PDFs only.` : error.message });
    next();
  }), async (req, res) => {
    const papers = req.files?.papers || [];
    if (!papers.length) return res.status(400).json({ message: 'Select at least one paper PDF.' });
    try { return res.status(202).json(await importer({ papers, solutions: req.files?.solutions || [], uploader: req.importUploader }, { upload, destroy })); }
    catch { return res.status(503).json({ message: 'Import could not finish. Re-select the PDFs to resume; already stored files will be skipped.' }); }
  });
  router.get('/batches', async (req, res) => {
    if (req.query.after && !mongoose.isValidObjectId(req.query.after)) return res.status(400).json({ message: 'Invalid import history cursor.' });
    try {
      const batches = await Batch.find(req.query.after ? { _id: { $lt: req.query.after } } : {}).sort({ _id: -1 }).limit(50).lean();
      return res.json({ batches: batches.map((batch) => ({ batchId: String(batch._id), totalFiles: batch.totalFiles, createdAt: batch.createdAt })), nextCursor: batches.length === 50 ? String(batches.at(-1)._id) : null });
    } catch { return res.status(503).json({ message: 'Import history is temporarily unavailable.' }); }
  });
  router.get('/batches/:batchId', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.batchId)) return res.status(400).json({ message: 'Invalid batch ID.' });
    try {
      const batch = await Batch.findById(req.params.batchId).lean(); if (!batch) return res.status(404).json({ message: 'Batch not found.' });
      const papers = await Paper.find({ importBatchId: batch._id }).select('originalFileName subject subjectCode branch semester year examType title questionCount questionExtractionStatus processing reviewStatus filePath').lean();
      return res.json(summarizeBatch(batch, papers));
    } catch { return res.status(503).json({ message: 'Batch progress is temporarily unavailable.' }); }
  });
  router.get('/papers/:paperId/review', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.paperId)) return res.status(400).json({ message: 'Invalid paper ID.' });
    try {
      const paper = await Paper.findById(req.params.paperId).lean(); if (!paper) return res.status(404).json({ message: 'Paper not found.' });
      const questions = await Question.find({ paperId: paper._id, status: { $ne: 'rejected' } }).sort({ sequence: 1 }).limit(500).lean();
      return res.json({ paper, questions });
    } catch { return res.status(503).json({ message: 'Review is temporarily unavailable.' }); }
  });
  router.patch('/papers/:paperId/metadata', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.paperId)) return res.status(400).json({ message: 'Invalid paper ID.' });
    try {
      const paper = await Paper.findById(req.params.paperId);
      if (!paper) return res.status(404).json({ message: 'Paper not found.' });
      if (['queued', 'processing'].includes(paper.questionExtractionStatus)) return res.status(409).json({ message: 'Wait until processing finishes before reviewing metadata.' });
      const body = req.body || {}, semester = Number(body.semester), year = Number(body.year);
      if (!OFFICIAL_BRANCHES.includes(body.branch) || !Number.isInteger(semester) || semester < 1 || semester > 8 || !Number.isInteger(year) || year < 2000 || year > 2100 || !['Mid-Sem', 'End-Sem'].includes(body.examType) || !String(body.subject || '').trim()) return res.status(400).json({ message: 'Check subject, branch, semester, exam type and year.' });
      const updates = { subject: String(body.subject).trim().slice(0, 200), subjectCode: String(body.subjectCode || '').trim().slice(0, 30), branch: body.branch, semester, year, examType: body.examType };
      const canonical = metadataFromText(updates.subjectCode, {}, undefined);
      Object.assign(updates, Object.fromEntries(Object.entries(canonical.updates).filter(([key]) => ['subject', 'normalizedSubject', 'subjectCode'].includes(key))));
      if (!updates.normalizedSubject) updates.normalizedSubject = updates.subject;
      updates.title = `${updates.subject} · ${updates.examType} · ${updates.year}`;
      // Keep the public resource pending until question provenance is synced.
      Object.assign(paper, updates); paper.reviewStatus = 'needs_review';
      paper.processing.metadata = { ...(paper.processing.metadata || {}), missing: [], conflicts: [], uncertain: [], reviewedAt: new Date() };
      paper.markModified('processing.metadata'); await paper.save();
      // Keep provenance/catalog context in sync; approving metadata does not approve question text.
      const { resolveSubject } = require('../services/subjectService');
      const subject = resolveSubject(updates);
      await Question.updateMany({ paperId: paper._id }, { $set: { subject: subject.name, subjectCode: subject.code || updates.subjectCode, subjectKey: subject.key, branch: updates.branch, semester, year, examType: updates.examType } });
      paper.reviewStatus = 'approved'; await paper.save();
      await require('../services/questionExtractionService').syncPaperQuestionReview(paper._id);
      return res.json({ success: true, paper });
    } catch { return res.status(503).json({ message: 'Metadata could not be saved.' }); }
  });
  router.patch('/batches/:batchId/solutions/:hash', async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.batchId) || !mongoose.isValidObjectId(req.body?.paperId) || !/^[a-f0-9]{64}$/.test(req.params.hash)) return res.status(400).json({ message: 'Invalid solution association.' });
    try {
      const batch = await Batch.findById(req.params.batchId).lean();
      const solution = batch?.solutions.find((entry) => entry.fileHash === req.params.hash && entry.status === 'needs_review');
      if (!solution) return res.status(404).json({ message: 'Solution awaiting review not found.' });
      const paper = await Paper.findOneAndUpdate({ _id: req.body.paperId, importBatchId: batch._id, solutionPath: { $in: ['', null] } }, { $set: { solutionPath: solution.fileUrl, solutionPublicId: solution.storageKey } }, { new: true });
      if (!paper) return res.status(409).json({ message: 'Choose a paper in this batch without an existing solution.' });
      await syncResourceFromPaper(paper);
      await Batch.updateOne({ _id: batch._id, 'solutions.fileHash': req.params.hash }, { $set: { 'solutions.$.paperId': paper._id, 'solutions.$.status': 'attached' } });
      return res.json({ success: true });
    } catch { return res.status(503).json({ message: 'Solution could not be attached.' }); }
  });
  return router;
};
module.exports.boundedMemoryStorage = boundedMemoryStorage;
module.exports.authenticatedUploader = authenticatedUploader;
