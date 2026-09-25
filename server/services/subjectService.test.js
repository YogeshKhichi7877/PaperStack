const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeBranchList,
  normalizeSubjectKey,
  resolveSubject,
} = require('./subjectService');

test('resolves a known subject alias to canonical catalog code', () => {
  const result = resolveSubject({ subject: 'Computer Graphics', branch: 'CSE', semester: 5 });
  assert.equal(result.key, 'CS502');
  assert.equal(result.shortCode, 'CG');
});

test('resolves subject by short code', () => {
  const result = resolveSubject({ subject: 'CG', branch: 'CSE', semester: 5 });
  assert.equal(result.key, 'CS502');
});

test('creates stable custom key for unknown subject', () => {
  const result = resolveSubject({ subject: 'Future Computing' });
  assert.equal(result.key, 'custom:future-computing');
});

test('normalizes common branch values', () => {
  assert.deepEqual(normalizeBranchList('CSE & ECE'), ['CSE', 'ECE']);
  assert.equal(normalizeSubjectKey('cs502'), 'CS502');
});
