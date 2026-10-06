const crypto = require('crypto');
const { resolveSubject } = require('./subjectService');

function normalizeQuestionText(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hashQuestionText(value) {
  const normalized = normalizeQuestionText(value);
  return normalized
    ? crypto.createHash('sha256').update(normalized).digest('hex')
    : '';
}

function cleanLabel(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeQuestionKey(value) {
  const raw = cleanLabel(value).toLowerCase();
  if (!raw) return '';

  return raw
    .replace(/^question\s*/i, 'q')
    .replace(/^ques\s*/i, 'q')
    .replace(/^q\s*/i, 'q')
    .replace(/[()[\]{}]/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveQuestionLabel({ questionNumber, part, sequence }) {
  const number = cleanLabel(questionNumber) || String(sequence);
  const normalizedNumber = /^q/i.test(number) ? number : `Q${number}`;
  const cleanPart = cleanLabel(part).replace(/^[()[\]{}]+|[()[\]{}]+$/g, '');

  return cleanPart
    ? `${normalizedNumber}(${cleanPart})`
    : normalizedNumber;
}

function clampConfidence(value) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.max(0, Math.min(100, Math.round(numeric * 100) / 100));
}

function toOptionalNumber(value, { min = null, max = null } = {}) {
  if (value === null || value === undefined || value === '') return null;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  if (min !== null && numeric < min) return null;
  if (max !== null && numeric > max) return null;
  return numeric;
}

function uniqueStrings(values = []) {
  return [...new Set(
    (Array.isArray(values) ? values : [values])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  )];
}

function fallbackSubjectKey(paper = {}) {
  const subjectCode = String(paper.subjectCode || '').trim().toUpperCase();
  if (subjectCode) return subjectCode;

  const normalized = String(paper.subject || paper.normalizedSubject || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized ? `custom:${normalized}` : '';
}

function resolvePaperSubject(paper = {}) {
  try {
    const resolved = resolveSubject({
      subject: paper.subject || paper.normalizedSubject || paper.title,
      subjectCode: paper.subjectCode,
      shortCode: paper.shortCode,
      branch: paper.branch,
      semester: paper.semester,
    });

    return {
      subjectKey: resolved?.key || fallbackSubjectKey(paper),
      subject: resolved?.name || paper.subject || '',
      subjectCode: resolved?.code || paper.subjectCode || '',
      shortCode: resolved?.shortCode || paper.shortCode || '',
    };
  } catch {
    return {
      subjectKey: fallbackSubjectKey(paper),
      subject: paper.subject || '',
      subjectCode: paper.subjectCode || '',
      shortCode: paper.shortCode || '',
    };
  }
}

function buildQuestionDocument({ paper, input = {}, sequence }) {
  if (!paper?._id) {
    throw new Error('A parent paper with _id is required.');
  }

  const resolvedSequence = Number(sequence || input.sequence);
  if (!Number.isInteger(resolvedSequence) || resolvedSequence < 1) {
    throw new Error('Question sequence must be a positive integer.');
  }

  const questionText = String(input.questionText || input.text || '').normalize('NFC').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
  if (!questionText) {
    throw new Error('Question text is required.');
  }

  const questionNumber = cleanLabel(
    input.questionNumber ||
    input.number ||
    resolvedSequence
  );

  const part = cleanLabel(input.part).replace(/^[()[\]{}]+|[()[\]{}]+$/g, '');
  const questionLabel = cleanLabel(input.questionLabel) || deriveQuestionLabel({
    questionNumber,
    part,
    sequence: resolvedSequence,
  });

  const questionKey =
    normalizeQuestionKey(input.questionKey || questionLabel) ||
    `q${resolvedSequence}`;

  const subject = resolvePaperSubject(paper);

  const pageStart = toOptionalNumber(
    input.pageStart ?? input.pageNumber ?? input.page,
    { min: 1 }
  );
  const pageEnd = toOptionalNumber(input.pageEnd, { min: 1 }) || pageStart;

  const marks = toOptionalNumber(input.marks, { min: 0 });
  const unit = toOptionalNumber(input.unit, { min: 1, max: 20 });

  return {
    paperId: paper._id,
    questionKey,
    questionNumber,
    questionLabel,
    part,
    parentQuestionKey: cleanLabel(input.parentQuestionKey),
    parentQuestionId: input.parentQuestionId || null,
    sequence: resolvedSequence,
    section: cleanLabel(input.section),

    questionText,
    normalizedText: normalizeQuestionText(questionText),
    textHash: hashQuestionText(questionText),
    rawText: String(input.rawText || ''),

    marks,
    questionType: cleanLabel(input.questionType) || 'unknown',
    difficulty: ['easy', 'medium', 'hard'].includes(String(input.difficulty || '').toLowerCase())
      ? String(input.difficulty).toLowerCase()
      : 'unknown',

    unit,
    primaryTopic: cleanLabel(input.primaryTopic),
    topics: uniqueStrings(input.topics),

    sourceLocation: {
      pageStart,
      pageEnd,
      charStart: toOptionalNumber(input.charStart, { min: 0 }),
      charEnd: toOptionalNumber(input.charEnd, { min: 0 }),
    },

    // Never trust extracted header metadata here; inherit it from Paper.
    subjectKey: subject.subjectKey,
    subject: subject.subject,
    subjectCode: subject.subjectCode,
    shortCode: subject.shortCode,
    branch: paper.branch || '',
    semester: toOptionalNumber(paper.semester, { min: 1, max: 8 }),
    examType: paper.examType || '',
    year: toOptionalNumber(paper.year, { min: 1900, max: 2200 }),

    extraction: {
      source: ['manual', 'rule', 'ai', 'imported'].includes(input.source)
        ? input.source
        : 'manual',
      confidence: clampConfidence(input.confidence),
      provider: cleanLabel(input.provider),
      model: cleanLabel(input.model),
      version: cleanLabel(input.version) || 'question-v1',
    },
    status: ['extracted', 'reviewed', 'verified', 'rejected'].includes(input.status)
      ? input.status
      : 'extracted',
    needsReview: Boolean(input.needsReview),
    choiceGroup: cleanLabel(input.choiceGroup),
    choiceInstructions: cleanLabel(input.choiceInstructions),
    hasVisualContext: Boolean(input.hasVisualContext),
  };
}

function buildQuestionDocuments({ paper, questions = [], source = 'manual', version = 'question-v1' }) {
  if (!Array.isArray(questions)) {
    throw new Error('Questions must be an array.');
  }

  const seenKeys = new Set();

  return questions.map((input, index) => {
    const document = buildQuestionDocument({
      paper,
      input: {
        ...input,
        source: input.source || source,
        version: input.version || version,
      },
      sequence: input.sequence || index + 1,
    });

    if (seenKeys.has(document.questionKey)) {
      throw new Error(`Duplicate question key in batch: ${document.questionKey}`);
    }

    seenKeys.add(document.questionKey);
    return document;
  });
}

function publicQuestion(question = {}) {
  return {
    _id: question._id,
    paperId: question.paperId,
    questionKey: question.questionKey,
    questionNumber: question.questionNumber,
    questionLabel: question.questionLabel,
    part: question.part || '',
    parentQuestionKey: question.parentQuestionKey || '',
    sequence: question.sequence,
    section: question.section || '',
    questionText: question.questionText,
    marks: question.marks ?? null,
    questionType: question.questionType || 'unknown',
    difficulty: question.difficulty || 'unknown',
    unit: question.unit ?? null,
    primaryTopic: question.primaryTopic || '',
    topics: question.topics || [],
    sourceLocation: question.sourceLocation || {},
    subjectKey: question.subjectKey || '',
    subject: question.subject || '',
    subjectCode: question.subjectCode || '',
    shortCode: question.shortCode || '',
    branch: question.branch || '',
    semester: question.semester ?? null,
    examType: question.examType || '',
    year: question.year ?? null,
    extraction: {
      source: question.extraction?.source || 'manual',
      confidence: question.extraction?.confidence ?? null,
      version: question.extraction?.version || '',
    },
    status: question.status || 'extracted',
    needsReview: Boolean(question.needsReview),
    choiceGroup: question.choiceGroup || '',
    choiceInstructions: question.choiceInstructions || '',
    hasVisualContext: Boolean(question.hasVisualContext),
    repeatClusterId: question.repeatClusterId || null,
    duplicateReview: question.duplicateReview || null,
    similarity: question.similarity ?? null,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
  };
}

module.exports = {
  buildQuestionDocument,
  buildQuestionDocuments,
  clampConfidence,
  deriveQuestionLabel,
  hashQuestionText,
  normalizeQuestionKey,
  normalizeQuestionText,
  publicQuestion,
  resolvePaperSubject,
  uniqueStrings,
};
