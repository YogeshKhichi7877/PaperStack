const crypto = require('crypto');
const { normalizeBranch: canonicalBranch } = require('../utils/branches');
const pdfParse = require('pdf-parse');
const {
  FLAT_SUBJECT_CATALOG,
  normalizeSubjectText,
  resolveSubject,
} = require('./subjectService');
const {
  analyzePdfWithFreeGemini,
  getFreeAiStatus,
  normalizeAiMetadata,
} = require('./freeAiMetadataService');

const CURRENT_YEAR = new Date().getFullYear();
const MAX_REASONABLE_YEAR = CURRENT_YEAR + 1;
const REQUIRED_FIELDS = ['subjectName', 'branch', 'semester', 'year', 'examType'];

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(Number(value) || 0)));
}

function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeSource(value) {
  return normalizeSubjectText(value)
    .replace(/\bmid\s*sem(?:ester)?\b/g, ' mid sem ')
    .replace(/\bend\s*sem(?:ester)?\b/g, ' end sem ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsToken(source, token) {
  const clean = String(token || '').trim();
  if (!clean) return false;
  return new RegExp(`(?:^|[^a-z0-9])${escapeRegex(clean.toLowerCase())}(?:$|[^a-z0-9])`, 'i').test(String(source || '').toLowerCase());
}

function containsPhrase(source, phrase) {
  const normalizedPhrase = normalizeSource(phrase);
  if (!normalizedPhrase || normalizedPhrase.length < 4) return false;
  return ` ${normalizeSource(source)} `.includes(` ${normalizedPhrase} `);
}

function subjectScore(candidate, fileNameSource, textSource) {
  const code = String(candidate.code || '').toLowerCase();
  const shortCode = String(candidate.shortCode || '').toLowerCase();
  const aliases = [candidate.name, ...(candidate.aliases || [])]
    .filter(Boolean)
    .map(normalizeSource)
    .filter(Boolean);

  let score = 0;
  let reason = '';

  if (code && containsToken(fileNameSource, code)) {
    score = Math.max(score, 100);
    reason = 'subject code in filename';
  }
  if (shortCode && containsToken(fileNameSource, shortCode)) {
    score = Math.max(score, 96);
    reason = reason || 'subject short code in filename';
  }
  if (aliases.some((alias) => containsPhrase(fileNameSource, alias))) {
    score = Math.max(score, 94);
    reason = reason || 'subject name in filename';
  }

  if (code && containsToken(textSource, code)) {
    score = Math.max(score, 92);
    reason = reason || 'subject code in PDF';
  }
  if (shortCode && shortCode.length >= 2 && containsToken(textSource, shortCode)) {
    score = Math.max(score, 86);
    reason = reason || 'subject short code in PDF';
  }
  if (aliases.some((alias) => containsPhrase(textSource, alias))) {
    score = Math.max(score, 90);
    reason = reason || 'subject name in PDF';
  }

  return { score, reason };
}

function detectSubject(fileName, text) {
  const fileNameSource = normalizeSource(String(fileName || '').replace(/\.pdf$/i, ' '));
  const textSource = normalizeSource(text);
  const ranked = FLAT_SUBJECT_CATALOG
    .map((candidate) => ({ candidate, ...subjectScore(candidate, fileNameSource, textSource) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  if (!ranked.length) {
    return { subject: null, confidence: 0, reason: 'subject not confidently detected' };
  }

  const best = ranked[0];
  const second = ranked[1];
  let confidence = best.score;
  if (second && best.score - second.score < 5) confidence -= 18;

  return {
    subject: best.candidate,
    confidence: clamp(confidence),
    reason: best.reason,
  };
}

function detectExamType(source) {
  const text = String(source || '').toLowerCase().replace(/[_-]+/g, ' ');
  const mid = /\b(mid[\s_-]*sem(?:ester)?|midterm|mse)\b/i.test(text);
  const end = /\b(end[\s_-]*sem(?:ester)?|endterm|ese|final\s+exam)\b/i.test(text);
  if (mid && !end) return { value: 'Mid-Sem', confidence: 96, reason: 'exam type found in paper' };
  if (end && !mid) return { value: 'End-Sem', confidence: 96, reason: 'exam type found in paper' };
  if (mid && end) return { value: '', confidence: 30, reason: 'both mid-sem and end-sem signals found' };
  return { value: '', confidence: 0, reason: 'exam type not detected' };
}

function parseRomanSemester(value) {
  const roman = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
  const raw = String(value || '').toUpperCase();
  return roman[raw] || Number(raw) || null;
}

function detectSemester(source, subject) {
  const text = String(source || '').replace(/[_-]+/g, ' ');
  const match = text.match(/\b(?:sem(?:ester)?)\s*[-:#]?\s*(VIII|VII|VI|IV|V|III|II|I|[1-8])\b/i)
    || text.match(/\b(VIII|VII|VI|IV|V|III|II|I|[1-8])\s*(?:st|nd|rd|th)?\s*sem(?:ester)?\b/i);

  if (match) {
    const semester = parseRomanSemester(match[1]);
    if (semester >= 1 && semester <= 8) {
      return { value: semester, confidence: 96, reason: 'semester found in paper' };
    }
  }

  if (subject?.semesters?.length === 1) {
    return { value: subject.semesters[0], confidence: 82, reason: 'semester inferred from subject catalog' };
  }

  return { value: null, confidence: 0, reason: 'semester not detected' };
}

function detectBranch(source, subject) {
  const text = String(source || '').toUpperCase();
  const hasCse = /\bCSE\b/.test(text);
  const hasEce = /\bECE\b/.test(text);
  if (hasCse && hasEce) {
    return { value: 'CSE & ECE', confidence: 96, reason: 'CSE and ECE found in paper' };
  }
  const candidates = ['CSE (AI-ML)', 'CYBER SECURITY', 'MATHEMATICS AND COMPUTING', 'AIML', 'MNC', 'CYBER', 'CSE', 'ECE'];
  const found = candidates.find((branch) => text.includes(branch));
  if (found) {
    return { value: canonicalBranch(found), confidence: 94, reason: 'branch found in paper' };
  }

  if (subject?.branches?.length === 1) {
    return { value: subject.branches[0], confidence: 80, reason: 'branch inferred from subject catalog' };
  }
  if (subject?.branches?.length === 2 && subject.branches.includes('CSE') && subject.branches.includes('ECE')) {
    return { value: 'CSE & ECE', confidence: 70, reason: 'common CSE/ECE subject inferred from catalog' };
  }

  return { value: '', confidence: 0, reason: 'branch not detected' };
}

function detectYear(source) {
  const yearSource = String(source || '').replace(/[_-]+/g, ' ');
  const years = Array.from(yearSource.matchAll(/\b(20\d{2})\b/g))
    .map((match) => Number(match[1]))
    .filter((year) => year >= 2000 && year <= MAX_REASONABLE_YEAR);

  if (!years.length) return { value: null, confidence: 0, reason: 'year not detected' };

  const counts = new Map();
  years.forEach((year) => counts.set(year, (counts.get(year) || 0) + 1));
  const ranked = Array.from(counts.entries()).sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1];
    return b[0] - a[0];
  });

  return {
    value: ranked[0][0],
    confidence: ranked[0][1] > 1 ? 94 : 84,
    reason: ranked[0][1] > 1 ? 'year repeated in paper' : 'year found in paper',
  };
}

async function extractPdfText(buffer) {
  try {
    const data = await pdfParse(buffer, { max: 3 });
    return String(data?.text || '').replace(/\s+/g, ' ').trim();
  } catch (error) {
    return '';
  }
}

function buildTitle(metadata, originalFileName) {
  if (metadata.subjectName && metadata.examType && metadata.year) {
    return `${metadata.subjectName} ${metadata.examType} ${metadata.year}`;
  }
  return String(originalFileName || 'Question Paper')
    .replace(/\.pdf$/i, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateOverall(fieldConfidence) {
  const weights = {
    subjectName: 0.30,
    branch: 0.15,
    semester: 0.15,
    year: 0.20,
    examType: 0.20,
  };
  return clamp(Object.entries(weights).reduce((sum, [key, weight]) => {
    return sum + clamp(fieldConfidence[key]) * weight;
  }, 0));
}

function buildWarnings(metadata, fieldConfidence, textAvailable) {
  const warnings = [];
  if (!textAvailable) warnings.push('This PDF appears scanned or has little extractable text. Review the detected fields carefully.');
  if (!metadata.subjectName) warnings.push('Subject could not be detected.');
  if (!metadata.branch) warnings.push('Branch could not be detected.');
  if (!metadata.semester) warnings.push('Semester could not be detected.');
  if (!metadata.year) warnings.push('Exam year could not be detected.');
  if (!metadata.examType) warnings.push('Exam type could not be detected.');

  Object.entries(fieldConfidence).forEach(([field, confidence]) => {
    if (metadata[field] && confidence > 0 && confidence < 70) {
      warnings.push(`${field} has low confidence and should be checked.`);
    }
  });

  return Array.from(new Set(warnings));
}

async function buildRuleAnalysis(file) {
  const text = await extractPdfText(file.buffer);
  const source = `${file.originalname || ''} ${text}`;
  const subjectMatch = detectSubject(file.originalname, text);
  const subject = subjectMatch.subject;
  const examType = detectExamType(source);
  const semester = detectSemester(source, subject);
  const branch = detectBranch(source, subject);
  const year = detectYear(source);

  const metadata = {
    subjectName: subject?.name || '',
    subjectCode: subject?.code || '',
    subjectShortCode: subject?.shortCode || '',
    branch: branch.value || '',
    semester: semester.value || null,
    year: year.value || null,
    examType: examType.value || '',
    title: '',
  };
  metadata.title = buildTitle(metadata, file.originalname);

  const fieldConfidence = {
    subjectName: subjectMatch.confidence,
    branch: branch.confidence,
    semester: semester.confidence,
    year: year.confidence,
    examType: examType.confidence,
  };

  const overall = calculateOverall(fieldConfidence);
  const warnings = buildWarnings(metadata, fieldConfidence, Boolean(text));

  return {
    source: 'rules',
    metadata,
    confidence: { overall, fields: fieldConfidence },
    evidence: {
      subject: subjectMatch.reason,
      branch: branch.reason,
      semester: semester.reason,
      year: year.reason,
      examType: examType.reason,
    },
    extraction: {
      textAvailable: Boolean(text),
      textPreview: text.slice(0, 700),
      fileHash: hashBuffer(file.buffer),
      fileSize: file.size,
      mimeType: file.mimetype,
      originalFileName: file.originalname,
    },
    warnings,
    status: REQUIRED_FIELDS.every((field) => metadata[field]) && overall >= 80 ? 'ready' : 'review',
  };
}

function shouldUseAi(ruleAnalysis) {
  const threshold = Number(process.env.SMART_AI_MIN_CONFIDENCE || 82);
  const missingRequired = REQUIRED_FIELDS.some((field) => !ruleAnalysis.metadata[field]);
  return missingRequired || Number(ruleAnalysis.confidence?.overall || 0) < threshold;
}

function mergeAiAnalysis(ruleAnalysis, aiResult) {
  if (!aiResult?.metadata) return ruleAnalysis;
  const ai = normalizeAiMetadata(aiResult.metadata);
  const merged = { ...ruleAnalysis.metadata };
  const fields = { ...ruleAnalysis.confidence.fields };
  const evidence = { ...ruleAnalysis.evidence };

  const resolvedAiSubject = ai.subjectName || ai.subjectCode || ai.subjectShortCode
    ? resolveSubject({
      subject: ai.subjectName,
      subjectCode: ai.subjectCode,
      shortCode: ai.subjectShortCode,
      branch: ai.branch,
      semester: ai.semester,
    })
    : null;

  if (resolvedAiSubject && fields.subjectName < 80) {
    merged.subjectName = resolvedAiSubject.name || merged.subjectName;
    merged.subjectCode = resolvedAiSubject.code || merged.subjectCode;
    merged.subjectShortCode = resolvedAiSubject.shortCode || merged.subjectShortCode;
    fields.subjectName = 88;
    evidence.subject = 'free AI fallback + catalog validation';
  }

  for (const field of ['branch', 'semester', 'year', 'examType']) {
    if (ai[field] && Number(fields[field] || 0) < 80) {
      merged[field] = ai[field];
      fields[field] = 86;
      evidence[field] = 'free AI fallback';
    }
  }

  merged.title = buildTitle(merged, ruleAnalysis.extraction.originalFileName);
  const overall = calculateOverall(fields);
  const warnings = buildWarnings(merged, fields, ruleAnalysis.extraction.textAvailable);

  return {
    ...ruleAnalysis,
    source: 'rules+gemini',
    metadata: merged,
    confidence: { overall, fields },
    evidence,
    warnings,
    status: REQUIRED_FIELDS.every((field) => merged[field]) && overall >= 80 ? 'ready' : 'review',
  };
}

async function analyzeContributionFile(file) {
  const ruleAnalysis = await buildRuleAnalysis(file);
  const aiStatus = getFreeAiStatus();
  const needsAi = shouldUseAi(ruleAnalysis);

  if (!needsAi || !aiStatus.configured) {
    return {
      ...ruleAnalysis,
      ai: {
        ...aiStatus,
        attempted: false,
        used: false,
        reason: needsAi ? 'Free AI key is not configured; rule-based analysis remains available.' : 'Rule-based confidence is already high.',
      },
    };
  }

  try {
    const aiResult = await analyzePdfWithFreeGemini(file, ruleAnalysis);
    if (!aiResult?.metadata) {
      return {
        ...ruleAnalysis,
        ai: {
          ...aiStatus,
          attempted: Boolean(aiResult?.attempted),
          used: false,
          reason: aiResult?.reason || 'Free AI fallback did not return usable metadata.',
        },
      };
    }

    const merged = mergeAiAnalysis(ruleAnalysis, aiResult);
    return {
      ...merged,
      ai: {
        ...aiStatus,
        attempted: true,
        used: true,
        reason: 'Low-confidence fields were checked with the configured free Gemini model.',
      },
    };
  } catch (error) {
    return {
      ...ruleAnalysis,
      ai: {
        ...aiStatus,
        attempted: true,
        used: false,
        reason: 'Free AI fallback was unavailable, so PaperStack kept the local rule-based result.',
      },
      warnings: Array.from(new Set([
        ...ruleAnalysis.warnings,
        'AI fallback could not be reached. You can still confirm the fields manually and submit normally.',
      ])),
    };
  }
}

module.exports = {
  analyzeContributionFile,
  buildRuleAnalysis,
  calculateOverall,
  detectBranch,
  detectExamType,
  detectSemester,
  detectSubject,
  detectYear,
  mergeAiAnalysis,
  shouldUseAi,
};
