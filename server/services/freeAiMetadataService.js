const axios = require('axios');
const { FLAT_SUBJECT_CATALOG } = require('./subjectService');

function envTrue(value, fallback = true) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['false', '0', 'off', 'no'].includes(String(value).trim().toLowerCase());
}

function getFreeAiStatus() {
  const enabled = envTrue(process.env.SMART_AI_ENABLED, true);
  const configured = enabled && Boolean(String(process.env.GEMINI_API_KEY || '').trim());
  return {
    enabled,
    configured,
    provider: 'gemini',
    model: String(process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim(),
    paidRequired: false,
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
  for (const branch of ['CSE', 'ECE', 'AIML', 'AI', 'IT']) {
    if (new RegExp(`\\b${branch}\\b`).test(raw)) return branch;
  }
  return '';
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
    return normalizeAiMetadata(JSON.parse(cleanJsonText(text)));
  } catch (error) {
    return null;
  }
}

function subjectCatalogPrompt() {
  return FLAT_SUBJECT_CATALOG
    .map((subject) => `${subject.code}|${subject.shortCode}|${subject.name}|Sem:${subject.semesters.join('/') }|Branch:${subject.branches.join('/')}`)
    .join('\n');
}

async function analyzePdfWithFreeGemini(file, ruleAnalysis = {}) {
  const status = getFreeAiStatus();
  if (!status.configured) {
    return { attempted: false, reason: 'Gemini free-tier key is not configured.', metadata: null };
  }

  const maxMb = Math.max(1, Number(process.env.SMART_AI_INLINE_PDF_MAX_MB || 12));
  if (Number(file.size || file.buffer?.length || 0) > maxMb * 1024 * 1024) {
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
- branch must be one of: CSE, ECE, CSE & ECE, AIML, AI, IT, or empty string.
- semester must be an integer 1-8 or null.
- examType must be Mid-Sem, End-Sem, or empty string.
- year must be a four-digit exam year or null.
- Do not invent values when the PDF does not support them.

Current local guess (may be incomplete):
${JSON.stringify(ruleAnalysis.metadata || {})}

IIIT Surat subject catalog:
${subjectCatalogPrompt()}`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(status.model)}:generateContent`;
  const response = await axios.post(
    url,
    {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: 'application/pdf',
                data: file.buffer.toString('base64'),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    },
    {
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY,
        'Content-Type': 'application/json',
      },
      timeout: Number(process.env.SMART_AI_TIMEOUT_MS || 25000),
      maxBodyLength: Infinity,
    }
  );

  const metadata = parseGeminiResponse(response.data);
  return {
    attempted: true,
    metadata,
    reason: metadata ? 'Gemini metadata extracted.' : 'Gemini response could not be parsed.',
  };
}

module.exports = {
  analyzePdfWithFreeGemini,
  cleanJsonText,
  getFreeAiStatus,
  normalizeAiMetadata,
  parseGeminiResponse,
};
