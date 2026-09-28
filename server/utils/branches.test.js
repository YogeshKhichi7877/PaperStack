const test = require('node:test');
const assert = require('node:assert/strict');
const { OFFICIAL_BRANCHES, normalizeBranch, normalizeBranchList, branchQueryValues } = require('./branches');

test('the institute has exactly five canonical branch options', () => {
  assert.deepEqual(OFFICIAL_BRANCHES, ['CSE', 'CSE (AI-ML)', 'Cyber Security', 'Mathematics and Computing', 'ECE']);
});

test('legacy aliases resolve without rewriting old records', () => {
  assert.equal(normalizeBranch('CSE AI ML'), 'CSE (AI-ML)');
  assert.equal(normalizeBranch('AIML'), 'CSE (AI-ML)');
  assert.equal(normalizeBranch('CyberSecurity'), 'Cyber Security');
  assert.equal(normalizeBranch('MnC'), 'Mathematics and Computing');
  assert.deepEqual(normalizeBranchList('CSE & ECE'), ['CSE', 'ECE']);
});

test('shared legacy papers appear only for CSE and ECE', () => {
  assert.ok(branchQueryValues('CSE').includes('CSE & ECE'));
  assert.ok(branchQueryValues('ECE').includes('CSE & ECE'));
  assert.ok(!branchQueryValues('CSE (AI-ML)').includes('CSE & ECE'));
  assert.ok(branchQueryValues('MnC').includes('Mathematics and Computing'));
});
