const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeBranchList,
  resolveSubject,
} = require('./subjectService');

test('resolves a known subject alias to canonical catalog code', () => {
  assert.equal(resolveSubject({ subject: 'Data Structures' }).key, 'CS201');
});

test('resolves subject by short code', () => {
  assert.equal(resolveSubject({ subject: 'CG' }).key, 'CS502');
});

test('legacy Computer Graphics label does not collide with short code IC', () => {
  assert.equal(resolveSubject({ subject: 'Computer Graphics (CG)' }).key, 'CS502');
});

test('legacy Data Science label resolves to CS501', () => {
  assert.equal(resolveSubject({ subject: 'Data Science (DS)' }).key, 'CS501');
});

test('legacy Cloud Computing label resolves to CS504', () => {
  assert.equal(resolveSubject({ subject: 'Cloud Computing (CC)' }).key, 'CS504');
});

test('short subject codes still resolve exactly', () => {
  assert.equal(resolveSubject({ subject: 'IC' }).key, 'HM107');
  assert.equal(resolveSubject({ subject: 'AI' }).key, 'CS701');
  assert.equal(resolveSubject({ subject: 'ML' }).key, 'CS601');
});

test('resolves a hyphenated subject code used by paper uploads', () => {
  assert.equal(resolveSubject({ subjectCode: 'HM-505', branch: 'ECE', semester: 5 }).key, 'HM505');
  assert.equal(resolveSubject({ subject: 'HM-505' }).key, 'HM505');
});

test('creates stable custom key for unknown subject', () => {
  assert.equal(resolveSubject({ subject: 'Future Computing' }).key, 'custom:future-computing');
  assert.equal(resolveSubject({ subject: 'Future Computing', branch: 'ECE', semester: 5 }).key, 'custom:future-computing');
});

test('normalizes common branch values', () => {
  assert.deepEqual(normalizeBranchList('CSE & ECE'), ['CSE', 'ECE']);
});


test('subject facets merge legacy labels and semester rows while preserving real counts', () => {
  const { mergeSubjectOptions } = require('./subjectService');
  const rows = mergeSubjectOptions([
    { subjectCode: 'CS302', subject: 'DBMS', semester: 3, totalQuestions: 3, years: [2024], examTypes: ['Mid-Sem'] },
    { subjectCode: 'CS302', subject: 'Database Management Systems', semester: 4, totalQuestions: 4, years: [2024, 2025], examTypes: ['End-Sem'] },
  ]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].subjectCode, 'CS302');
  assert.equal(rows[0].totalQuestions, 7);
  assert.equal(rows[0].yearsCovered, 2);
  assert.deepEqual(rows[0].semesters, [3, 4]);
});
