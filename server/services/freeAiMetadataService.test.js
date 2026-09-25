const test = require('node:test');
const assert = require('node:assert/strict');
const {
  cleanJsonText,
  normalizeAiMetadata,
  parseGeminiResponse,
} = require('./freeAiMetadataService');

test('strips markdown fences from JSON', () => {
  assert.equal(cleanJsonText('```json\n{"year":2026}\n```'), '{"year":2026}');
});

test('normalizes AI metadata into PaperStack values', () => {
  const value = normalizeAiMetadata({
    subjectName: 'Computer Graphics',
    subjectCode: 'cs502',
    shortCode: 'cg',
    branch: 'CSE / ECE',
    semester: '5',
    year: '2026',
    examType: 'mid semester',
  });
  assert.equal(value.subjectCode, 'CS502');
  assert.equal(value.subjectShortCode, 'CG');
  assert.equal(value.branch, 'CSE & ECE');
  assert.equal(value.semester, 5);
  assert.equal(value.year, 2026);
  assert.equal(value.examType, 'Mid-Sem');
});

test('parses Gemini JSON content safely', () => {
  const value = parseGeminiResponse({
    candidates: [{ content: { parts: [{ text: '{"subjectCode":"CS502","semester":5,"year":2026,"examType":"End-Sem","branch":"CSE"}' }] } }],
  });
  assert.equal(value.subjectCode, 'CS502');
  assert.equal(value.examType, 'End-Sem');
});
