const test = require('node:test');
const assert = require('node:assert/strict');
const {
  calculateOverall,
  detectBranch,
  detectExamType,
  detectSemester,
  detectSubject,
  detectYear,
  mergeAiAnalysis,
} = require('./smartContributionService');

function fakeRule(overrides = {}) {
  return {
    source: 'rules',
    metadata: {
      subjectName: 'Unknown Subject',
      subjectCode: '',
      subjectShortCode: '',
      branch: '',
      semester: null,
      year: null,
      examType: '',
      title: 'paper',
      ...(overrides.metadata || {}),
    },
    confidence: {
      overall: 20,
      fields: {
        subjectName: 20,
        branch: 0,
        semester: 0,
        year: 0,
        examType: 0,
        ...(overrides.fields || {}),
      },
    },
    evidence: {},
    extraction: { originalFileName: 'paper.pdf', textAvailable: true },
    warnings: [],
    status: 'review',
  };
}

test('detects Computer Graphics without confusing CG with other short codes', () => {
  const result = detectSubject('Computer_Graphics_CG_MidSem_2026.pdf', 'Course: CS502 Computer Graphics');
  assert.equal(result.subject.code, 'CS502');
  assert.ok(result.confidence >= 90);
});

test('detects Data Science from canonical subject code', () => {
  const result = detectSubject('CS501_mid_2026.pdf', 'Data Science examination');
  assert.equal(result.subject.code, 'CS501');
});

test('detects exam type, semester, branch and year', () => {
  assert.equal(detectExamType('Mid Semester Examination').value, 'Mid-Sem');
  assert.equal(detectSemester('Semester V', null).value, 5);
  assert.equal(detectBranch('Branch: CSE', null).value, 'CSE');
  assert.equal(detectYear('Academic session 2025  Exam held 2026').value, 2026);
});

test('infers semester from a unique subject catalog mapping', () => {
  const subject = detectSubject('CS502.pdf', '').subject;
  assert.equal(detectSemester('', subject).value, 5);
});

test('overall confidence is weighted and clamped', () => {
  const score = calculateOverall({ subjectName: 100, branch: 80, semester: 80, year: 100, examType: 100 });
  assert.equal(score, 94);
});

test('AI only replaces low-confidence fields', () => {
  const rule = fakeRule({
    metadata: { subjectName: 'Computer Graphics', subjectCode: 'CS502', subjectShortCode: 'CG', year: 2026 },
    fields: { subjectName: 96, year: 94 },
  });
  const merged = mergeAiAnalysis(rule, {
    metadata: {
      subjectName: 'Data Science',
      subjectCode: 'CS501',
      subjectShortCode: 'DS',
      branch: 'CSE',
      semester: 5,
      year: 2025,
      examType: 'Mid-Sem',
    },
  });

  assert.equal(merged.metadata.subjectCode, 'CS502');
  assert.equal(merged.metadata.year, 2026);
  assert.equal(merged.metadata.branch, 'CSE');
  assert.equal(merged.metadata.examType, 'Mid-Sem');
});


test('full analyzer remains usable with local rules when no AI key is configured', async () => {
  const previousKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;
  const { analyzeContributionFile } = require('./smartContributionService');
  const result = await analyzeContributionFile({
    originalname: 'CS502_CSE_Sem5_MidSem_2026.pdf',
    buffer: Buffer.from('not-a-real-pdf'),
    size: 14,
    mimetype: 'application/pdf',
  });
  assert.equal(result.metadata.subjectCode, 'CS502');
  assert.equal(result.metadata.branch, 'CSE');
  assert.equal(result.metadata.semester, 5);
  assert.equal(result.metadata.year, 2026);
  assert.equal(result.metadata.examType, 'Mid-Sem');
  assert.equal(result.ai.used, false);
  if (previousKey !== undefined) process.env.GEMINI_API_KEY = previousKey;
});

test('smart metadata keeps its rule result during an AI outage', async () => {
  const saved = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    AI_ENABLED: process.env.AI_ENABLED,
    AI_MAX_RETRIES: process.env.AI_MAX_RETRIES,
    SMART_AI_ENABLED: process.env.SMART_AI_ENABLED,
    SMART_AI_MIN_CONFIDENCE: process.env.SMART_AI_MIN_CONFIDENCE,
    fetch: global.fetch,
  };
  process.env.GEMINI_API_KEY = 'test-key';
  delete process.env.GROQ_API_KEY;
  process.env.AI_ENABLED = 'true';
  process.env.AI_MAX_RETRIES = '0';
  process.env.SMART_AI_ENABLED = 'true';
  process.env.SMART_AI_MIN_CONFIDENCE = '99';
  global.fetch = async () => ({ ok: false, status: 503 });
  try {
    const { analyzeContributionFile } = require('./smartContributionService');
    const result = await analyzeContributionFile({
      originalname: 'CS502_CSE_Sem5_MidSem_2026.pdf',
      buffer: Buffer.from('not-a-real-pdf'), size: 14, mimetype: 'application/pdf',
    });
    assert.equal(result.metadata.subjectCode, 'CS502');
    assert.equal(result.ai.used, false);
    assert.equal(result.source, 'rules');
  } finally {
    for (const key of ['GEMINI_API_KEY', 'GROQ_API_KEY', 'AI_ENABLED', 'AI_MAX_RETRIES', 'SMART_AI_ENABLED', 'SMART_AI_MIN_CONFIDENCE']) {
      if (saved[key] === undefined) delete process.env[key]; else process.env[key] = saved[key];
    }
    global.fetch = saved.fetch;
  }
});
