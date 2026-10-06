const axios = require('axios');
const crypto = require('node:crypto');
const { parsePdfBuffer, completeScannedPages, processingError } = require('./paperTextService');
const { extractPaperMetadata, classifyQuestions } = require('./paperMetadataService');
const { isTransientError } = require('./paperProcessingErrors');

const Paper = require('../models/Paper');
const Question = require('../models/Question');
const {
  buildQuestionDocuments,
  normalizeQuestionText,
} = require('./questionService');
const {
  extractQuestionsFromText,
} = require('./questionExtractionRules');
const {
  extractQuestionsWithAi,
  getQuestionAiStatus,
} = require('./freeAiQuestionService');

const EXTRACTION_VERSION = 'paper-processing-v2';
const AUTO_SOURCES = ['rule', 'ai'];
const PROTECTED_STATUSES = ['reviewed', 'verified'];

function extractionThreshold() {
  const value = Number(process.env.QUESTION_AI_MIN_CONFIDENCE || 90);
  if (!Number.isFinite(value)) return 90;
  return Math.max(90, Math.min(98, value));
}

function maxPdfBytes() {
  const mb = Number(process.env.QUESTION_PDF_MAX_MB || 30);
  return Math.max(1, Math.min(100, Number.isFinite(mb) ? mb : 30)) * 1024 * 1024;
}

async function downloadPaperBuffer(paper) {
  const url = String(paper?.filePath || '').trim();

  if (!/^https?:\/\//i.test(url)) {
    throw processingError('STORAGE_URL_INVALID', 'Paper does not have a downloadable PDF URL.');
  }

  const parsedUrl = new URL(url);
  const permittedHosts = new Set(['res.cloudinary.com', ...(process.env.PAPER_STORAGE_ALLOWED_HOSTS || '').split(',').map((v) => v.trim()).filter(Boolean)]);
  if (parsedUrl.protocol !== 'https:' || parsedUrl.username || parsedUrl.password || !permittedHosts.has(parsedUrl.hostname)) {
    throw processingError('STORAGE_URL_INVALID', 'The paper URL is not from an approved storage host.');
  }
  if (paper.fileSize > maxPdfBytes()) throw processingError('PDF_SIZE_LIMIT', 'Paper PDF exceeds the configured processing size limit.');
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    maxRedirects: 0,
    timeout: Number(process.env.QUESTION_DOWNLOAD_TIMEOUT_MS || 30000),
    maxContentLength: maxPdfBytes(),
    maxBodyLength: maxPdfBytes(),
    validateStatus: (status) => status >= 200 && status < 300,
  });

  const buffer = Buffer.from(response.data);

  if (!buffer.length) {
    throw processingError('INVALID_PDF', 'Downloaded paper PDF is empty.');
  }

  if (buffer.length > maxPdfBytes()) {
    throw processingError('PDF_SIZE_LIMIT', 'Paper PDF exceeds the configured processing size limit.');
  }

  return buffer;
}

function chooseExtraction({ localResult, aiResult, allowAi }) {
  const aiQuestions = allowAi ? aiResult?.questions || [] : [];
  if (!aiQuestions.length || (localResult.confidence >= extractionThreshold() && !localResult.questions.some((q) => q.needsReview))) {
    return { engine: 'rules', source: 'rule', questions: localResult.questions,
      confidence: localResult.confidence, warnings: [...localResult.warnings,
        ...(allowAi && aiResult?.reason ? [aiResult.reason] : [])],
      aiAttempted: Boolean(aiResult?.attempted), incomplete: Boolean(aiResult?.attempted && !aiQuestions.length) };
  }
  // AI may repair an uncertain boundary; it may not discard other local questions.
  const byKey = new Map(localResult.questions.map((q) => [q.questionKey, q]));
  for (const question of aiQuestions) {
    const local = byKey.get(question.questionKey);
    if (!local || (local.confidence < extractionThreshold() && question.confidence > local.confidence)) byKey.set(question.questionKey, question);
  }
  const questions = require('./questionExtractionRules').dedupeQuestions([...byKey.values()]);
  return { engine: 'ai', source: 'ai', questions,
    confidence: Math.round(questions.reduce((sum, q) => sum + q.confidence, 0) / questions.length),
    warnings: [...localResult.warnings, ...(aiResult.reason ? [aiResult.reason] : [])],
    aiAttempted: Boolean(aiResult.attempted), incomplete: Boolean(aiResult.incomplete) };
}

function uncertainQuestionText(pdf, local) {
  const uncertain = new Set();
  for (const page of pdf.pageTexts) {
    const covering = local.questions.filter((q) => q.pageStart <= page.pageNumber && q.pageEnd >= page.pageNumber);
    if (!covering.length || covering.some((q) => q.needsReview)) {
      uncertain.add(page.pageNumber - 1); uncertain.add(page.pageNumber); uncertain.add(page.pageNumber + 1);
    }
  }
  return pdf.pageTexts.filter((p) => uncertain.has(p.pageNumber))
    .map((p) => `[Physical page ${p.pageNumber}]\n${p.text}`).join('\n');
}

function extractionFailureReason({ localResult, aiResult, allowAi }) {
  const scanned = Number(localResult.textLength || 0) < 180;
  if (!allowAi) {
    return scanned
      ? 'No selectable question text was found in this PDF. Enable AI extraction for scanned papers and retry.'
      : 'PDF text was read, but no questions were identified. Enable AI extraction and retry.';
  }
  if (!aiResult?.attempted) {
    return scanned
      ? 'No selectable question text was found, and AI extraction was unavailable. Configure AI or upload a searchable PDF.'
      : 'No questions were identified, and AI extraction was unavailable. Configure AI or check the paper text.';
  }
  return scanned
    ? 'No readable questions were found in this PDF, even with AI extraction. Try a clearer or searchable PDF.'
    : 'No questions were identified from the PDF text or AI extraction. Check that this file is an exam paper.';
}

async function persistQuestions({
  paper,
  selected,
}) {
  const documents = buildQuestionDocuments({
    paper,
    questions: selected.questions.map((q) => ({ ...q, needsReview: Boolean(q.needsReview || selected.incomplete || q.confidence < extractionThreshold() || q.marks == null || q.hasVisualContext) })),
    source: selected.source,
    version: EXTRACTION_VERSION,
  });
  const { bestDuplicateCandidate } = require('./duplicateDetectionService');
  const subjectFilter = documents[0]?.subjectCode ? { subjectCode: documents[0].subjectCode } : { subjectKey: documents[0]?.subjectKey };
  const candidateQuestions = documents.length
    ? await Question.find({
        paperId: { $ne: paper._id },
        ...subjectFilter,
        status: { $ne: 'rejected' },
      }).select('_id questionText textHash repeatClusterId').sort({ year: -1 }).limit(180).lean()
    : [];
  if (documents.length) {
    const exactMatches = await Question.find({ ...subjectFilter, paperId: { $ne: paper._id }, status: { $ne: 'rejected' },
      textHash: { $in: documents.map((q) => q.textHash) } }).select('_id questionText textHash repeatClusterId').limit(1000).lean();
    const ids = new Set(candidateQuestions.map((q) => String(q._id)));
    candidateQuestions.push(...exactMatches.filter((q) => !ids.has(String(q._id))));
  }
  documents.forEach((document) => {
    const exact = candidateQuestions.find((candidate) => candidate.textHash && candidate.textHash === document.textHash);
    const match = exact
      ? { candidate: exact, classification: 'exact', confidence: 1, reason: 'matching question hash' }
      : bestDuplicateCandidate(document, candidateQuestions);
    if (match?.classification === 'exact' && normalizeQuestionText(document.questionText) !== normalizeQuestionText(match.candidate.questionText)) {
      match.classification = 'probable';
      match.reason = 'Normalized similarity requires review of mathematical notation.';
    }
    if (match && ['exact', 'probable'].includes(match.classification)) document.repeatClusterId = match.candidate.repeatClusterId || match.candidate._id;
    if (match?.classification === 'probable') document.needsReview = true;
    if (match) {
      document.duplicateReview = {
        classification: match.classification,
        matchedQuestionId: match.candidate._id,
        confidence: match.confidence,
        reason: match.reason,
      };
    }
  });

  const protectedQuestions = await Question.find({
    paperId: paper._id,
    $or: [
      { status: { $in: [...PROTECTED_STATUSES, 'rejected'] } },
      { 'extraction.source': { $in: ['manual', 'imported'] } },
    ],
  })
    .select('questionKey textHash')
    .lean();

  const protectedKeys = new Set(
    protectedQuestions.map((item) => String(item.questionKey))
  );
  const protectedHashes = new Set(protectedQuestions.map((q) => q.textHash).filter(Boolean));

  const writeDocuments = documents.filter(
    (document) => !protectedKeys.has(String(document.questionKey)) && !protectedHashes.has(document.textHash)
  );

  if (writeDocuments.length) {
    const existingIds = await Question.find({ paperId: paper._id, questionKey: { $in: writeDocuments.map((document) => document.questionKey) } }).distinct('_id');
    if (existingIds.length) {
      const { invalidateQuestionAnswers } = require('./semanticAiAnswerService');
      await invalidateQuestionAnswers(existingIds);
    }
    await Question.bulkWrite(
      writeDocuments.map((document) => ({
        updateOne: {
          filter: {
            paperId: paper._id,
            questionKey: document.questionKey,
          },
          update: [{ $replaceWith: { $cond: [
            { $or: [ { $in: ['$status', [...PROTECTED_STATUSES, 'rejected']] },
              { $in: ['$extraction.source', ['manual', 'imported']] } ] },
            '$$ROOT', { $mergeObjects: ['$$ROOT', { $literal: document }, { createdAt: { $ifNull: ['$createdAt', '$$NOW'] } }] }
          ] } }],
          upsert: true,
        },
      })),
      { ordered: false, updatePipeline: true }
    );

    const activeKeys = documents.map((document) => document.questionKey);

    if (!selected.incomplete && selected.confidence >= extractionThreshold() && !documents.some((q) => q.needsReview)) await Question.deleteMany({
      paperId: paper._id,
      status: 'extracted',
      'extraction.source': { $in: AUTO_SOURCES },
      questionKey: { $nin: activeKeys },
    });
  }

  const totalQuestionCount = await Question.countDocuments({
    paperId: paper._id,
    status: { $ne: 'rejected' },
  });

  const reviewCount = await Question.countDocuments({ paperId: paper._id, status: { $ne: 'rejected' }, needsReview: true });
  const threshold = extractionThreshold();
  const extractionStatus = selected.questions.length === 0
    ? 'failed'
    : selected.confidence >= threshold && reviewCount === 0 && !selected.incomplete
      ? 'complete'
      : 'partial';

  await Paper.findByIdAndUpdate(paper._id, {
    $set: {
      questionCount: totalQuestionCount,
      questionExtractionVersion: EXTRACTION_VERSION,
      questionsUpdatedAt: new Date(),
    },
  });

  return {
    totalQuestionCount,
    extractionStatus,
    protectedQuestionsSkipped: documents.length - writeDocuments.length,
    writtenQuestions: writeDocuments.length,
    reviewCount,
  };
}

async function extractPaperQuestions({
  paperId,
  force = false,
  allowAi = true,
}) {
  const paper = await Paper.findById(paperId).lean();

  if (!paper) {
    const error = new Error('Paper not found');
    error.statusCode = 404;
    throw error;
  }

  if (
    !force &&
    paper.questionExtractionStatus === 'complete' &&
    Number(paper.questionCount || 0) > 0 &&
    paper.questionExtractionVersion === EXTRACTION_VERSION
  ) {
    return {
      skipped: true,
      reason: 'Paper already has a complete question extraction. Use force=true to re-run it.',
      paper: {
        _id: paper._id,
        title: paper.title,
        subject: paper.subject,
        year: paper.year,
        examType: paper.examType,
      },
      questionCount: Number(paper.questionCount || 0),
      extractionStatus: paper.questionExtractionStatus,
    };
  }

  const started = Date.now();
  const leaseToken = crypto.randomUUID();
  const leaseUntil = () => new Date(Date.now() + 3 * 60 * 1000);
  const claimed = await Paper.findOneAndUpdate({ _id: paper._id,
    $or: [{ 'processing.leaseUntil': { $exists: false } }, { 'processing.leaseUntil': null },
      { 'processing.leaseUntil': { $lt: new Date() } }] },
    { $set: { questionExtractionStatus: 'processing', questionExtractionVersion: EXTRACTION_VERSION,
      'processing.leaseToken': leaseToken, 'processing.leaseUntil': leaseUntil(),
      'processing.jobId': paper.processing?.jobId || crypto.randomUUID(),
      'processing.allowAi': allowAi, 'processing.force': force,
      'processing.startedAt': new Date(), 'processing.stage': 'extracting_text' },
      $inc: { 'processing.attempts': 1 } }, { new: true }).lean();
  if (!claimed) return { skipped: true, extractionStatus: 'processing', reason: 'Paper is already processing.' };
  let stage = 'extracting_text';
  const setStage = async (value, extra = {}) => {
    stage = value;
    await Paper.updateOne({ _id: paper._id, 'processing.leaseToken': leaseToken },
      { $set: { 'processing.stage': value, ...extra } });
  };
  const heartbeat = setInterval(() => {
    Paper.updateOne({ _id: paper._id, 'processing.leaseToken': leaseToken },
      { $set: { 'processing.leaseUntil': leaseUntil() } }).catch(() => {});
  }, 30000);
  heartbeat.unref();
  try {
    const buffer = await downloadPaperBuffer(paper);
    const parsed = await parsePdfBuffer(buffer);
    const parsedPdf = await completeScannedPages({ buffer, parsedPdf: parsed, paperId: String(paper._id), allowAi, onStage: setStage });
    await setStage('extracting_metadata', { 'processing.pages': parsedPdf.pages,
      'processing.ocrPages': parsedPdf.ocrPages, 'processing.unreadablePages': parsedPdf.unreadablePages });
    const metadata = await extractPaperMetadata({ text: parsedPdf.text, paper, buffer, allowAi });
    if (Object.keys(metadata.updates).length) {
      await Paper.findByIdAndUpdate(paper._id, { $set: metadata.updates });
      Object.assign(paper, metadata.updates);
    }
    await setStage('extracting_questions', { 'processing.metadata': metadata, extractedTextPreview: parsedPdf.text.slice(0, 2000) });
    const localResult = extractQuestionsFromText(parsedPdf.text);

    const threshold = extractionThreshold();
    const shouldTryAi =
      Boolean(allowAi) &&
      (
        localResult.questions.length === 0 ||
        localResult.confidence < threshold || localResult.questions.some((q) => q.needsReview)
      );

    let aiResult = {
      attempted: false,
      questions: [],
      confidence: 0,
      reason: '',
    };

    if (shouldTryAi) {
      try {
        aiResult = await extractQuestionsWithAi({
          buffer, paper, localResult, extractedText: uncertainQuestionText(parsedPdf, localResult),
        });
      } catch {
        aiResult = { attempted: true, questions: [], confidence: 0,
          reason: 'AI extraction was unavailable; local questions were retained.' };
      }
    }

    const selected = chooseExtraction({
      localResult,
      aiResult,
      allowAi: shouldTryAi,
    });

    selected.incomplete ||= parsedPdf.unreadablePages.length > 0 || metadata.conflicts.length > 0 || metadata.missing.length > 0 || metadata.uncertain?.length > 0;
    selected.warnings.push(...parsedPdf.warnings);
    if (metadata.conflicts.length) selected.warnings.push('Header metadata conflicts with approved paper metadata; review is required.');
    await setStage('classifying');
    let known = [];
    try { if (paper.subjectCode) known = await Question.find({ subjectCode: paper.subjectCode, status: { $in: ['reviewed', 'verified'] } }).select('topics unit').limit(500).lean(); }
    catch { selected.warnings.push('Topic classification was unavailable; extracted questions were retained.'); }
    selected.questions = classifyQuestions(selected.questions.filter((q) => require('./questionExtractionRules').isQuestionText(q.questionText) && ![paper.title, paper.subject].filter(Boolean).some((label) => label.trim().toLowerCase() === q.questionText.trim().toLowerCase())), known);
    if (metadata.missing.length || metadata.conflicts.length || metadata.uncertain?.length) selected.questions = selected.questions.map((q) => ({ ...q, needsReview: true }));
    const failureReason = selected.questions.length ? '' : extractionFailureReason({
      localResult, aiResult, allowAi: shouldTryAi,
    });
    if (failureReason) {
      console.warn('Question extraction found no questions', {
        paperId: String(paper._id),
        parsedPages: parsedPdf.pages,
        extractedTextLength: localResult.textLength,
        aiAttempted: Boolean(aiResult.attempted),
        aiEnabledForRequest: shouldTryAi,
      });
    }

    await setStage('saving');
    const persistence = await persistQuestions({
      paper,
      selected,
    });

    const result = {
      skipped: false,
      paper: {
        _id: paper._id,
        title: paper.title,
        subject: paper.subject,
        subjectCode: paper.subjectCode || '',
        branch: paper.branch || '',
        semester: paper.semester || null,
        year: paper.year || null,
        examType: paper.examType || '',
      },
      engine: selected.engine,
      source: selected.source,
      confidence: selected.confidence,
      warnings: [...new Set(selected.warnings || [])],
      parsedPages: parsedPdf.pages,
      ocrPages: parsedPdf.ocrPages, unreadablePages: parsedPdf.unreadablePages, metadata,
      extractedTextLength: localResult.textLength,
      detectedQuestions: selected.questions.length,
      failureReason,
      resultStatus: !selected.questions.length
        ? 'failed'
        : selected.engine === 'rules' && selected.aiAttempted
          ? 'partial'
          : selected.engine === 'rules'
            ? 'local_only'
            : selected.confidence >= threshold
              ? 'high_confidence'
              : 'partial',
      degraded: selected.engine === 'rules' && selected.aiAttempted,
      ...persistence,
      ai: {
        ...getQuestionAiStatus(),
        attempted: selected.aiAttempted,
      },
      preview: selected.questions
        .slice(0, 12)
        .map((question) => ({
          questionLabel: question.questionLabel,
          questionText: question.questionText,
          marks: question.marks ?? null,
          pageNumber: question.pageNumber ?? null,
          confidence: question.confidence ?? null,
        })),
    };
    const finalStage = persistence.extractionStatus === 'failed' ? 'failed'
      : persistence.extractionStatus === 'partial' ? 'needs_review' : 'completed';
    const processingFailure = parsedPdf.errors?.length ? { stage: 'ocr', code: parsedPdf.errors[0].code,
      message: 'Some pages could not be read reliably.', retryable: parsedPdf.errors.some((e) => e.retryable) }
      : parsedPdf.unreadablePages.length ? { stage: 'ocr', code: 'OCR_INCOMPLETE', message: 'Some pages could not be read reliably.', retryable: false }
        : aiResult.incomplete || (aiResult.attempted && !aiResult.questions.length) ? { stage: 'extracting_questions', code: 'AI_PARSE_FAILED',
          message: 'AI structure extraction was incomplete; local questions were retained.', retryable: Boolean(aiResult.retryable) } : null;
    if (processingFailure) result.error = processingFailure;
    await setStage(finalStage, { questionExtractionStatus: persistence.extractionStatus, 'processing.result': result, 'processing.reviewCount': persistence.reviewCount,
      ...(paper.importBatchId ? { reviewStatus: persistence.extractionStatus === 'complete' ? 'approved' : persistence.extractionStatus === 'failed' ? 'failed' : 'needs_review' } : {}),
      'processing.finishedAt': new Date(), 'processing.durationMs': Date.now() - started,
      'processing.error': processingFailure,
      'processing.retryAt': null });
    if (paper.importBatchId) {
      try { await require('./resourceService').syncResourceFromPaper(await Paper.findById(paper._id).lean()); }
      catch { console.warn('Imported paper resource sync will need retry.', { paperId: String(paper._id) }); }
    }
    console.info('Paper processing completed', { paperId: String(paper._id), pages: parsedPdf.pages,
      method: selected.engine, ocrPages: parsedPdf.ocrPages.length, questions: persistence.totalQuestionCount,
      aiFallback: selected.aiAttempted, durationMs: Date.now() - started, reviewCount: persistence.reviewCount, stage: finalStage });
    return { ...result, processingStatus: finalStage };
  } catch (error) {
    const retryable = isTransientError(error);
    const code = error.code && !/^E[A-Z]+$/.test(error.code) ? error.code : stage === 'extracting_text' ? 'PDF_DOWNLOAD_FAILED' : 'PROCESSING_FAILED';
    const safeError = { stage, code, message: 'Paper processing failed.', retryable };
    await setStage('failed', { questionExtractionStatus: 'failed', 'processing.error': safeError,
      ...(paper.importBatchId ? { reviewStatus: 'failed' } : {}),
      'processing.finishedAt': new Date(), 'processing.durationMs': Date.now() - started });
    console.error('Paper processing failed', { paperId: String(paper._id), stage: safeError.stage, code, attempts: claimed.processing?.attempts || 1 });
    const result = { extractionStatus: 'failed', failureReason: 'Paper processing failed.', error: safeError, paperId: String(paper._id) };
    await Paper.updateOne({ _id: paper._id, 'processing.leaseToken': leaseToken }, { $set: { 'processing.result': result } });
    return result;
  } finally {
    clearInterval(heartbeat);
    await Paper.updateOne({ _id: paper._id, 'processing.leaseToken': leaseToken },
      { $unset: { 'processing.leaseToken': 1, 'processing.leaseUntil': 1 } });
  }
}

async function extractQuestionBatch({
  limit = 5,
  allowAi = false,
  force = false,
  afterId = '',
} = {}) {
  const safeLimit = Math.max(1, Math.min(10, Number(limit) || 5));

  const filter = {
    filePath: { $type: 'string', $ne: '' },
    questionExtractionStatus: { $nin: ['queued', 'processing'] },
  };

  if (afterId) filter._id = { $gt: afterId };
  if (!force) {
    filter.$or = [
      { questionExtractionStatus: { $exists: false } },
      { questionExtractionStatus: { $in: ['not_started'] } },
      { questionExtractionVersion: { $ne: EXTRACTION_VERSION }, questionExtractionStatus: { $nin: ['processing', 'queued'] } },
      { questionCount: { $exists: false } },
    ];
  }

  const papers = await Paper.find(filter)
    .sort({ _id: 1 })
    .limit(safeLimit)
    .select('_id title subject subjectCode branch semester year examType filePath questionCount questionExtractionStatus')
    .lean();

  const results = [];

  for (const paper of papers) {
    try {
      const result = await require('./paperProcessingQueue').processQueuedPaper(paper._id, { force, allowAi });

      results.push({
        paperId: String(paper._id),
        title: paper.title,
        success: result.extractionStatus !== 'failed',
        engine: result.engine || '',
        questionCount: result.totalQuestionCount ?? result.questionCount ?? 0,
        extractionStatus: result.extractionStatus || '',
        confidence: result.confidence ?? null,
        ...(result.failureReason ? { error: result.failureReason } : {}),
      });
    } catch (error) {
      results.push({
        paperId: String(paper._id),
        title: paper.title,
        success: false,
        error: 'Paper processing failed.',
      });
    }
  }

  return {
    nextCursor: papers.length ? String(papers.at(-1)._id) : '',
    hasMore: papers.length === safeLimit,
    requestedLimit: safeLimit,
    processed: results.length,
    successful: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
    results,
  };
}

async function listExtractionPapers({
  limit = 100,
  status = '',
} = {}) {
  const safeLimit = Math.max(1, Math.min(300, Number(limit) || 100));
  const filter = {};

  if (status && status !== 'all') {
    if (status === 'not_started') {
      filter.$or = [
        { questionExtractionStatus: { $exists: false } },
        { questionExtractionStatus: 'not_started' },
      ];
    } else {
      filter.questionExtractionStatus = status;
    }
  }

  const papers = await Paper.find(filter)
    .sort({ createdAt: -1, year: -1 })
    .limit(safeLimit)
    .select('_id title subject subjectCode branch semester year examType filePath questionCount questionExtractionStatus questionExtractionVersion questionsUpdatedAt processing')
    .lean();

  return papers.map((paper) => ({
    _id: paper._id,
    title: paper.title,
    subject: paper.subject,
    subjectCode: paper.subjectCode || '',
    branch: paper.branch || '',
    semester: paper.semester || null,
    year: paper.year || null,
    examType: paper.examType || '',
    hasPdf: Boolean(paper.filePath),
    questionCount: Number(paper.questionCount || 0),
    questionExtractionStatus: paper.questionExtractionStatus || 'not_started',
    questionExtractionVersion: paper.questionExtractionVersion || '',
    questionsUpdatedAt: paper.questionsUpdatedAt || null,
    processing: paper.processing ? { stage: paper.processing.stage, pages: paper.processing.pages, ocrPages: paper.processing.ocrPages, reviewCount: paper.processing.reviewCount, attempts: paper.processing.attempts, error: paper.processing.error, jobId: paper.processing.jobId } : null,
  }));
}

async function syncPaperQuestionReview(paperId) {
  const [reviewCount, questionCount] = await Promise.all([
    Question.countDocuments({ paperId, status: { $ne: 'rejected' }, needsReview: true }),
    Question.countDocuments({ paperId, status: { $ne: 'rejected' } }),
  ]);
  const paper = await Paper.findById(paperId).select('processing questionExtractionStatus importBatchId').lean();
  if (!paper) return;
  const update = { 'processing.reviewCount': reviewCount, questionCount, questionsUpdatedAt: new Date() };
  if (paper.processing?.result) Object.assign(update, { 'processing.result.reviewCount': reviewCount, 'processing.result.totalQuestionCount': questionCount });
  if (paper.questionExtractionStatus === 'partial' && reviewCount === 0 && questionCount > 0 &&
      !paper.processing?.unreadablePages?.length && !paper.processing?.metadata?.conflicts?.length &&
      !paper.processing?.metadata?.missing?.length && !paper.processing?.metadata?.uncertain?.length && !paper.processing?.error) {
    Object.assign(update, { questionExtractionStatus: 'complete', 'processing.stage': 'completed' });
    if (paper.processing?.result) update['processing.result.extractionStatus'] = 'complete';
    if (paper.importBatchId) update.reviewStatus = 'approved';
  }
  await Paper.updateOne({ _id: paperId, questionExtractionStatus: paper.questionExtractionStatus }, { $set: update });
  if (paper.importBatchId) await require('./resourceService').syncResourceFromPaper(await Paper.findById(paperId).lean());
}

module.exports = {
  AUTO_SOURCES,
  EXTRACTION_VERSION,
  chooseExtraction,
  extractionFailureReason,
  downloadPaperBuffer,
  extractPaperQuestions,
  extractQuestionBatch,
  extractionThreshold,
  uncertainQuestionText,
  listExtractionPapers,
  parsePdfBuffer,
  persistQuestions,
  syncPaperQuestionReview,
};
