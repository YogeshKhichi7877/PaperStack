const axios = require('axios');
const pdfParseModule = require('pdf-parse');

const Paper = require('../models/Paper');
const Question = require('../models/Question');
const {
  buildQuestionDocuments,
  publicQuestion,
} = require('./questionService');
const {
  PAGE_BREAK,
  extractQuestionsFromText,
} = require('./questionExtractionRules');
const {
  extractQuestionsWithAi,
  getQuestionAiStatus,
} = require('./freeAiQuestionService');

const EXTRACTION_VERSION = 'question-extract-v1';
const AUTO_SOURCES = ['rule', 'ai'];
const PROTECTED_STATUSES = ['reviewed', 'verified'];

function extractionThreshold() {
  const value = Number(process.env.QUESTION_AI_MIN_CONFIDENCE || 72);
  if (!Number.isFinite(value)) return 72;
  return Math.max(40, Math.min(95, value));
}

function maxPdfBytes() {
  const mb = Number(process.env.QUESTION_PDF_MAX_MB || 30);
  return Math.max(1, Math.min(100, Number.isFinite(mb) ? mb : 30)) * 1024 * 1024;
}

async function renderPage(pageData) {
  const textContent = await pageData.getTextContent({
    normalizeWhitespace: false,
    disableCombineTextItems: false,
  });

  let text = '';
  let lastY = null;

  for (const item of textContent.items || []) {
    const value = String(item.str || '');
    const y = item.transform?.[5];

    if (lastY === null || y === lastY) {
      text += value;
    } else {
      text += `\n${value}`;
    }

    lastY = y;
  }

  return `${PAGE_BREAK}\n${text}\n`;
}

async function parsePdfBuffer(buffer) {
  // pdf-parse v1 compatibility
  if (typeof pdfParseModule === 'function') {
    let data;

    try {
      data = await pdfParseModule(buffer, {
        pagerender: renderPage,
      });
    } catch {
      data = await pdfParseModule(buffer);
    }

    return {
      text: String(data?.text || ''),
      pages: Number(data?.numpages || 0),
    };
  }

  // pdf-parse v2+
  const PDFParse =
    pdfParseModule.PDFParse ||
    pdfParseModule.default?.PDFParse;

  if (typeof PDFParse !== 'function') {
    throw new Error(
      'Unsupported pdf-parse version: PDFParse class was not found.'
    );
  }

  const parser = new PDFParse({
    data: buffer,
  });

  try {
    const result = await parser.getText();

    let text = String(result?.text || '');
    let pages = 0;

    if (Array.isArray(result?.pages)) {
      pages = result.pages.length;

      const pageTexts = result.pages
        .map((page) => String(page?.text || '').trim())
        .filter(Boolean);

      if (pageTexts.length) {
        text = pageTexts
          .map((pageText) => `${PAGE_BREAK}\n${pageText}\n`)
          .join('\n');
      }
    } else {
      pages = Number(
        result?.total ||
        result?.numpages ||
        result?.numPages ||
        0
      );
    }

    return {
      text,
      pages,
    };
  } finally {
    if (typeof parser.destroy === 'function') {
      await parser.destroy();
    }
  }
}

async function downloadPaperBuffer(paper) {
  const url = String(paper?.filePath || '').trim();

  if (!/^https?:\/\//i.test(url)) {
    throw new Error('Paper does not have a downloadable HTTP(S) PDF URL.');
  }

  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: Number(process.env.QUESTION_DOWNLOAD_TIMEOUT_MS || 30000),
    maxContentLength: maxPdfBytes(),
    maxBodyLength: maxPdfBytes(),
    validateStatus: (status) => status >= 200 && status < 300,
  });

  const buffer = Buffer.from(response.data);

  if (!buffer.length) {
    throw new Error('Downloaded paper PDF is empty.');
  }

  if (buffer.length > maxPdfBytes()) {
    throw new Error('Paper PDF exceeds the configured extraction size limit.');
  }

  return buffer;
}

function chooseExtraction({ localResult, aiResult, allowAi }) {
  const threshold = extractionThreshold();
  const localUsable =
    localResult.questions.length > 0 &&
    localResult.confidence >= threshold;

  if (localUsable) {
    return {
      engine: 'rules',
      source: 'rule',
      questions: localResult.questions,
      confidence: localResult.confidence,
      warnings: localResult.warnings,
      aiAttempted: false,
    };
  }

  if (
    allowAi &&
    aiResult?.questions?.length
  ) {
    return {
      engine: 'ai',
      source: 'ai',
      questions: aiResult.questions,
      confidence: aiResult.confidence || 0,
      warnings: [
        ...localResult.warnings,
        ...(aiResult.reason ? [aiResult.reason] : []),
      ],
      aiAttempted: Boolean(aiResult.attempted),
    };
  }

  return {
    engine: 'rules',
    source: 'rule',
    questions: localResult.questions,
    confidence: localResult.confidence,
    warnings: [
      ...localResult.warnings,
      ...(allowAi && aiResult?.reason ? [aiResult.reason] : []),
    ],
    aiAttempted: Boolean(aiResult?.attempted),
  };
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
    questions: selected.questions,
    source: selected.source,
    version: EXTRACTION_VERSION,
  });
  const { bestDuplicateCandidate } = require('./duplicateDetectionService');
  const candidateQuestions = documents.length
    ? await Question.find({
        paperId: { $ne: paper._id },
        subjectCode: documents[0].subjectCode,
        status: { $ne: 'rejected' },
      }).select('_id questionText textHash').sort({ year: -1 }).limit(180).lean()
    : [];
  documents.forEach((document) => {
    const exact = candidateQuestions.find((candidate) => candidate.textHash && candidate.textHash === document.textHash);
    const match = exact
      ? { candidate: exact, classification: 'exact', confidence: 1, reason: 'matching question hash' }
      : bestDuplicateCandidate(document, candidateQuestions);
    if (match && ['exact', 'probable'].includes(match.classification)) document.needsReview = true;
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
      { status: { $in: PROTECTED_STATUSES } },
      { 'extraction.source': { $in: ['manual', 'imported'] } },
    ],
  })
    .select('questionKey')
    .lean();

  const protectedKeys = new Set(
    protectedQuestions.map((item) => String(item.questionKey))
  );

  const writeDocuments = documents.filter(
    (document) => !protectedKeys.has(String(document.questionKey))
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
          update: {
            $set: document,
          },
          upsert: true,
        },
      })),
      { ordered: true }
    );

    const activeKeys = writeDocuments.map((document) => document.questionKey);

    await Question.deleteMany({
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

  const threshold = extractionThreshold();
  const extractionStatus = selected.questions.length === 0
    ? 'failed'
    : selected.confidence >= threshold && selected.questions.length >= 2
      ? 'complete'
      : 'partial';

  await Paper.findByIdAndUpdate(paper._id, {
    $set: {
      questionCount: totalQuestionCount,
      questionExtractionStatus: extractionStatus,
      questionExtractionVersion: EXTRACTION_VERSION,
      questionsUpdatedAt: new Date(),
    },
  });

  return {
    totalQuestionCount,
    extractionStatus,
    protectedQuestionsSkipped: documents.length - writeDocuments.length,
    writtenQuestions: writeDocuments.length,
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
    Number(paper.questionCount || 0) > 0
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

  await Paper.findByIdAndUpdate(paper._id, {
    $set: {
      questionExtractionStatus: 'processing',
      questionExtractionVersion: EXTRACTION_VERSION,
      questionsUpdatedAt: new Date(),
    },
  });

  try {
    const buffer = await downloadPaperBuffer(paper);
    const parsedPdf = await parsePdfBuffer(buffer);
    const localResult = extractQuestionsFromText(parsedPdf.text);

    const threshold = extractionThreshold();
    const shouldTryAi =
      Boolean(allowAi) &&
      (
        localResult.questions.length < 2 ||
        localResult.confidence < threshold ||
        localResult.textLength < 180
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
          buffer, paper, localResult, extractedText: parsedPdf.text,
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

    const persistence = await persistQuestions({
      paper,
      selected,
    });

    return {
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
  } catch (error) {
    await Paper.findByIdAndUpdate(paper._id, {
      $set: {
        questionExtractionStatus: 'failed',
        questionExtractionVersion: EXTRACTION_VERSION,
        questionsUpdatedAt: new Date(),
      },
    });

    throw error;
  }
}

async function extractQuestionBatch({
  limit = 5,
  allowAi = false,
  force = false,
} = {}) {
  const safeLimit = Math.max(1, Math.min(10, Number(limit) || 5));

  const filter = {
    filePath: { $type: 'string', $ne: '' },
  };

  if (!force) {
    filter.$or = [
      { questionExtractionStatus: { $exists: false } },
      { questionExtractionStatus: { $in: ['not_started', 'partial', 'failed'] } },
      { questionCount: { $exists: false } },
    ];
  }

  const papers = await Paper.find(filter)
    .sort({ year: -1, createdAt: -1 })
    .limit(safeLimit)
    .select('_id title subject subjectCode branch semester year examType filePath questionCount questionExtractionStatus')
    .lean();

  const results = [];

  for (const paper of papers) {
    try {
      const result = await extractPaperQuestions({
        paperId: paper._id,
        force,
        allowAi,
      });

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
        error: error.message || 'Extraction failed',
      });
    }
  }

  return {
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
    .sort({ year: -1, createdAt: -1 })
    .limit(safeLimit)
    .select('_id title subject subjectCode branch semester year examType filePath questionCount questionExtractionStatus questionExtractionVersion questionsUpdatedAt')
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
  }));
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
  listExtractionPapers,
  parsePdfBuffer,
  persistQuestions,
};
