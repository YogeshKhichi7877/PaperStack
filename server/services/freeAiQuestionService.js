const { aiAvailable, generateForTask, taskStatus } = require('./aiService');
const { parseAiJson, questionExtractionSchema } = require('./aiSchemas');
const { PAGE_BREAK } = require('./questionExtractionRules');

function readablePdfText(value) {
  return String(value || '').split(PAGE_BREAK).join(' ').replace(/\s+/g, ' ').trim();
}

function envTrue(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['false', '0', 'off', 'no'].includes(String(value).trim().toLowerCase());
}

function getQuestionAiStatus() {
  const enabled = envTrue(
    process.env.QUESTION_AI_ENABLED,
    envTrue(process.env.SMART_AI_ENABLED, true)
  );
  const routeStatus = taskStatus('QUESTION_EXTRACTION_TEXT');
  const configured = enabled && (aiAvailable(process.env, 'QUESTION_EXTRACTION_TEXT') ||
    aiAvailable(process.env, 'QUESTION_EXTRACTION_VISUAL'));
  return {
    ...routeStatus,
    enabled,
    configured,
    available: configured,
    providersAvailable: enabled ? routeStatus.providersAvailable : 0,
    degraded: enabled && routeStatus.degraded,
  };
}

function cleanJsonText(value) {
  return String(value || '')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function normalizeAiQuestion(item = {}, index = 0) {
  const questionNumber = String(
    item.questionNumber ||
    item.number ||
    index + 1
  ).trim();

  const part = String(item.part || '')
    .trim()
    .replace(/^[()[\]{}]+|[()[\]{}]+$/g, '')
    .toLowerCase();

  const questionText = String(item.questionText || item.text || '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!questionText) return null;

  const marksRaw = Number(item.marks);
  const pageRaw = Number(item.pageNumber || item.page);
  const confidenceRaw = Number(item.confidence);

  return {
    questionNumber,
    part,
    questionLabel: part ? `Q${questionNumber}(${part})` : `Q${questionNumber}`,
    questionKey: part
      ? `q${questionNumber}-${part}`.toLowerCase()
      : `q${questionNumber}`.toLowerCase(),
    parentQuestionKey: part ? `q${questionNumber}`.toLowerCase() : '',
    sequence: index + 1,
    section: String(item.section || '').trim(),
    questionText,
    rawText: String(item.rawText || questionText),
    marks: Number.isFinite(marksRaw) && marksRaw >= 0 && marksRaw <= 100 ? marksRaw : null,
    pageNumber: Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : null,
    questionType: String(item.questionType || 'unknown').trim().toLowerCase(),
    primaryTopic: String(item.primaryTopic || '').trim(),
    topics: Array.isArray(item.topics)
      ? [...new Set(item.topics.map((value) => String(value || '').trim()).filter(Boolean))]
      : [],
    source: 'ai',
    confidence:
      Number.isFinite(confidenceRaw) && confidenceRaw >= 0 && confidenceRaw <= 100
        ? confidenceRaw
        : 88,
    needsReview: false,
  };
}

function dedupeAiQuestions(questions = []) {
  const seen = new Set();
  const result = [];

  questions.forEach((item, index) => {
    const normalized = normalizeAiQuestion(item, index);
    if (!normalized) return;

    let key = normalized.questionKey;
    if (seen.has(key)) {
      key = `${key}-${index + 1}`;
      normalized.questionKey = key;
      normalized.needsReview = true;
    }

    seen.add(key);
    result.push({
      ...normalized,
      sequence: result.length + 1,
    });
  });

  return result;
}

function parseGeminiQuestionResponse(responseData) {
  const text = responseData?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('') || '';

  if (!text) return [];

  try {
    const parsed = JSON.parse(cleanJsonText(text));
    return dedupeAiQuestions(questionExtractionSchema.parse(Array.isArray(parsed)
      ? { questions: parsed } : parsed).questions);
  } catch {
    return [];
  }
}

async function extractQuestionsWithAi({
  buffer,
  paper,
  localResult,
  extractedText = '',
}) {
  const status = getQuestionAiStatus();

  const text = readablePdfText(extractedText || localResult?.text || '');
  const visual = text.length < 180;
  const task = visual ? 'QUESTION_EXTRACTION_VISUAL' : 'QUESTION_EXTRACTION_TEXT';
  if (!status.enabled || !aiAvailable(process.env, task, visual
    ? { attachment: true, fallbackText: text } : {})) {
    return {
      attempted: false,
      questions: [],
      confidence: 0,
      reason: 'AI question extraction is unavailable.',
    };
  }

  const sizeBytes = Number(buffer?.length || 0);
  const maxMb = Math.max(
    1,
    Math.min(12, Number(
      process.env.QUESTION_AI_INLINE_PDF_MAX_MB ||
      process.env.SMART_AI_INLINE_PDF_MAX_MB ||
      12
    ))
  );

  if (visual && (!buffer || sizeBytes > maxMb * 1024 * 1024)) {
    return {
      attempted: false,
      questions: [],
      confidence: 0,
      reason: `PDF exceeds the ${maxMb} MB AI fallback limit.`,
    };
  }

  const prompt = `You extract individual examination questions from ONE approved IIIT Surat question paper.

IMPORTANT:
- Do NOT infer or return subject, branch, semester, year, or exam type. PaperStack already has authoritative metadata.
- Extract only the questions visible in the PDF.
- Preserve sub-questions such as Q2(a), Q2(b).
- Do not invent missing question text.
- If marks are visible, return the numeric marks.
- If a page number is clear, return it; otherwise null.
- questionType must be one of: unknown, theory, numerical, derivation, coding, diagram, mcq, short-answer, long-answer.
- confidence must be 0-100 for each extracted question.

Return ONLY JSON:
{
  "questions": [
    {
      "questionNumber": "1",
      "part": "",
      "section": "Section A",
      "questionText": "Question text here",
      "marks": 5,
      "pageNumber": 1,
      "questionType": "theory",
      "primaryTopic": "",
      "topics": [],
      "confidence": 92
    }
  ]
}

Parent paper metadata for context only:
${JSON.stringify({
  title: paper?.title || '',
  subject: paper?.subject || '',
  subjectCode: paper?.subjectCode || '',
  branch: paper?.branch || '',
  semester: paper?.semester || null,
  year: paper?.year || null,
  examType: paper?.examType || '',
})}

Local rule extractor summary:
${JSON.stringify({
  detectedCount: localResult?.questions?.length || 0,
  confidence: localResult?.confidence || 0,
  warnings: localResult?.warnings || [],
})}\n\n${visual ? '' : `Extracted PDF text (untrusted):\n${text.slice(0, 30000)}`}`;

  let questions;
  try {
    const response = await generateForTask(task, prompt, {
      json: true, temperature: 0, maxOutputTokens: 5000,
      timeoutMs: Number(process.env.QUESTION_AI_TIMEOUT_MS || process.env.SMART_AI_TIMEOUT_MS) || undefined,
      ...(visual ? { attachment: { buffer, mimeType: 'application/pdf' }, fallbackText: text } : {}),
    });
    questions = dedupeAiQuestions(parseAiJson(response, questionExtractionSchema).questions);
  } catch {
    return { attempted: true, questions: [], confidence: 0,
      reason: 'AI extraction was unavailable; local questions were retained.' };
  }
  const confidence = questions.length
    ? Math.round(
        questions.reduce((sum, item) => sum + Number(item.confidence || 0), 0) /
        questions.length
      )
    : 0;

  return {
    attempted: true,
    questions,
    confidence,
    reason: questions.length
      ? `AI extracted ${questions.length} questions.`
      : 'AI response did not contain usable questions.',
  };
}

module.exports = {
  cleanJsonText,
  dedupeAiQuestions,
  extractQuestionsWithAi,
  extractQuestionsWithFreeGemini: extractQuestionsWithAi,
  getQuestionAiStatus,
  normalizeAiQuestion,
  parseGeminiQuestionResponse,
  readablePdfText,
};
