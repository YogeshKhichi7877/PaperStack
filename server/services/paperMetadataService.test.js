const test = require('node:test');
const assert = require('node:assert/strict');
const { metadataFromText, extractPaperMetadata, classifyQuestions } = require('./paperMetadataService');

const catalog = [{ code: 'XY-999', name: 'Synthetic Systems', branches: ['Test Branch'], semesters: [9] }];
test('metadata matches academic catalog rather than hardcoded subject or semester', () => {
  const result = metadataFromText('XY999 End Semester Examination 2025\nTotal Marks: 25\nDate: 20/05/2025', {}, catalog);
  assert.equal(result.updates.subject, 'Synthetic Systems');
  assert.equal(result.updates.semester, 9);
  assert.equal(result.updates.totalMarks, 25);
  assert.equal(result.updates.examDate, '20/05/2025');
});
test('approved metadata is preserved and conflicting header guesses require review', () => {
  const result = metadataFromText('XY999 End Semester Examination 2025', { year: 2024, semester: 8 }, catalog);
  assert.ok(result.conflicts.includes('year'));
  assert.equal(result.updates.year, undefined);
  assert.equal(result.updates.semester, undefined);
});
test('classification maps known topics and units, leaving unknown values honest', () => {
  const questions = [{ questionText: 'Explain virtual memory allocation.', topics: [] }, { questionText: 'Explain an unfamiliar concept.' }];
  const result = classifyQuestions(questions, [{ topics: ['Virtual Memory'], unit: 2 }]);
  assert.equal(result[0].unit, 2);
  assert.equal(result[0].primaryTopic, 'Virtual Memory');
  assert.equal(result[1].difficulty, 'unknown');
  assert.equal(result[1].unit, null);
});
test('automatic import resolves code, Roman semester and title from PDF header', () => {
  const result = metadataFromText('Indian Institute of Information Technology Surat\nCS504\nCloud Computing\nBranch: CSE\nSemester V\nMid Semester Examination\n2025\nMaximum Marks: 25\nQ1. Explain cloud computing. [5]', { importBatchId: 'batch' });
  assert.equal(result.updates.subjectCode, 'CS504'); assert.equal(result.updates.semester, 5);
  assert.equal(result.updates.branch, 'CSE'); assert.equal(result.updates.examType, 'Mid-Sem');
  assert.equal(result.updates.totalMarks, 25); assert.equal(result.missing.length, 0);
  assert.match(result.updates.title, /2025/); assert.equal(result.fields.subjectCode.confidence, 0.98);
});
test('unknown subject remains reviewable and questions cannot supply missing exam year', () => {
  const result = metadataFromText('Unknown examination\nSemester III\nQ1. Discuss the 2025 invention. [5]', { branch: '' });
  assert.equal(result.updates.semester, 3); assert.equal(result.updates.year, undefined);
  assert.ok(result.missing.includes('subject')); assert.ok(result.missing.includes('branch'));
});
test('AI supplies only missing review suggestions and does not override deterministic catalog values', async () => {
  const result = await extractPaperMetadata({ text: 'CS504 Semester V End Semester Examination 2025', paper: { originalFileName: 'untrusted-name.pdf' }, buffer: Buffer.from('synthetic'), allowAi: true }, async () => ({ metadata: { subjectName: 'Incorrect subject', subjectCode: 'BAD999', branch: 'CSE', semester: 8, year: 2020, examType: 'Mid-Sem' } }));
  assert.equal(result.updates.subjectCode, 'CS504'); assert.equal(result.updates.semester, 5);
  assert.equal(result.updates.year, 2025); assert.equal(result.updates.branch, 'CSE');
  assert.deepEqual(result.uncertain, ['branch']); assert.equal(result.fields.branch.confidence, 0.7);
});
