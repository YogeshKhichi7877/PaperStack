const { FLAT_SUBJECT_CATALOG } = require('./subjectService');
const { normalizeBranch: canonicalBranch } = require('../utils/branches');
const { aiAvailable, generateForTask, taskStatus } = require('./aiService');
const { metadataSchema, parseAiJson } = require('./aiSchemas');
const aiCache = require('./aiCacheService');

function envTrue(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['false', '0', 'off', 'no'].includes(String(value).trim().toLowerCase());
}

function getFreeAiStatus() {
  const enabled = envTrue(process.env.SMART_AI_ENABLED, true);
  const routeStatus = taskStatus('METADATA_EXTRACTION_TEXT');
  const configured = enabled && (aiAvailable(process.env, 'METADATA_EXTRACTION_TEXT') ||
    aiAvailable(process.env, 'METADATA_EXTRACTION_VISUAL'));
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

function normalizeExamType(value) {
  const raw = String(value || '').toLowerCase();
  if (/mid/.test(raw)) return 'Mid-Sem';
  if (/end|final/.test(raw)) return 'End-Sem';
  return '';
}

function normalizeBranch(value) {
  const raw = String(value || '').toUpperCase().replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const hasCse = /\bCSE\b/.test(raw);
  const hasEce = /\bECE\b/.test(raw);
  if (hasCse && hasEce) return 'CSE & ECE';
  return canonicalBranch(raw) || '';
}

function normalizeAiMetadata(raw = {}) {
  const semester = Number(raw.semester);
  const year = Number(raw.year);
  const currentYear = new Date().getFullYear();

  return {
    subjectName: String(raw.subjectName || raw.subject || '').trim(),
    subjectCode: String(raw.subjectCode || '').trim().toUpperCase(),
    subjectShortCode: String(raw.subjectShortCode || raw.shortCode || '').trim().toUpperCase(),
    branch: normalizeBranch(raw.branch),
    semester: Number.isInteger(semester) && semester >= 1 && semester <= 8 ? semester : null,
    year: Number.isInteger(year) && year >= 2000 && year <= currentYear + 1 ? year : null,
    examType: normalizeExamType(raw.examType),
  };
}

function parseGeminiResponse(responseData) {
  const text = responseData?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text || '')
    .join('') || '';
  if (!text) return null;
  try {
    return normalizeAiMetadata(parseAiJson(text, metadataSchema));
  } catch (error) {
    return null;
  }
}

function subjectCatalogPrompt() {
  return FLAT_SUBJECT_CATALOG
    .map((subject) => `${subject.code}|${subject.shortCode}|${subject.name}|Sem:${subject.semesters.join('/') }|Branch:${subject.branches.join('/')}`)
    .join('\n');
}

async function analyzePdfWithAi(file, ruleAnalysis = {}) {
  const status = getFreeAiStatus();
  if (!status.configured) {
    return { attempted: false, reason: 'AI metadata extraction is unavailable.', metadata: null };
  }

  const maxMb = Math.max(1, Number(process.env.SMART_AI_INLINE_PDF_MAX_MB || 12));
  const text = String(ruleAnalysis.extraction?.textPreview || '').trim();
  const visual = text.length < 180;
  if (visual && Number(file.size || file.buffer?.length || 0) > maxMb * 1024 * 1024) {
    return {
      attempted: false,
      reason: `PDF is larger than the ${maxMb} MB AI fallback limit; local extraction was used instead.`,
      metadata: null,
    };
  }

  const prompt = `You are extracting metadata from an IIIT Surat examination paper for PaperStack.
Return ONLY a JSON object with these keys:
subjectName, subjectCode, subjectShortCode, branch, semester, year, examType.

Rules:
- Choose the subject from the catalog below whenever possible.
- branch must be one of: CSE, CSE (AI-ML), Cyber Security, Mathematics and Computing, ECE, or empty string.
- semester must be an integer 1-8 or null.
- examType must be Mid-Sem, End-Sem, or empty string.
- year must be a four-digit exam year or null.
- Do not invent values when the PDF does not support them.

Current local guess (may be incomplete):
${JSON.stringify(ruleAnalysis.metadata || {})}

IIIT Surat subject catalog:
${subjectCatalogPrompt()}

${visual ? '' : `Extracted PDF text (untrusted):\n${text}`}`;

  const task = visual ? 'METADATA_EXTRACTION_VISUAL' : 'METADATA_EXTRACTION_TEXT';
  const cacheKey = aiCache.buildAiCacheKey('metadata-extraction',
    ruleAnalysis.extraction?.fileHash || file.originalname || 'paper', prompt, 'v2');
  let response = await aiCache.get(cacheKey);
  let generated = false;
  if (typeof response !== 'string' || !response) {
    response = await generateForTask(task, prompt, {
        json: true, temperature: 0, maxOutputTokens: 700,
        validateResponse: (value) => parseAiJson(value, metadataSchema),
        timeoutMs: Number(process.env.SMART_AI_TIMEOUT_MS) || undefined,
        ...(visual ? { attachment: { buffer: file.buffer, mimeType: 'application/pdf' }, fallbackText: text } : {}),
      }
    );
    generated = true;
  }
  let metadata = null;
  try { metadata = normalizeAiMetadata(parseAiJson(response, metadataSchema)); } catch {}
  if (generated && metadata) {
    await aiCache.set(cacheKey, response, Number(process.env.AI_CACHE_METADATA_TTL_SECONDS) || 86400);
  }
  return {
    attempted: true,
    metadata,
    reason: metadata ? 'AI metadata extracted.' : 'AI response could not be parsed.',
  };
}

module.exports = {
  analyzePdfWithAi,
  analyzePdfWithFreeGemini: analyzePdfWithAi,
  cleanJsonText,
  getFreeAiStatus,
  normalizeAiMetadata,
  parseGeminiResponse,
};
