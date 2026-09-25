const test = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveResourceSubjectKey,
  stripLegacyDisplaySuffix,
} = require('./subjectPageService');

test('subject page resolver accepts canonical subject code', () => {
  assert.equal(resolveResourceSubjectKey('cs502'), 'CS502');
});

test('subject page resolver accepts short code', () => {
  assert.equal(resolveResourceSubjectKey('CG'), 'CS502');
});

test('subject page resolver accepts subject name', () => {
  assert.equal(resolveResourceSubjectKey('Computer Graphics'), 'CS502');
});

test('subject page resolver handles legacy display label Data Science (DS)', () => {
  assert.equal(resolveResourceSubjectKey('Data Science (DS)'), 'CS501');
});

test('subject page resolver handles legacy display label Computer Graphics (CG)', () => {
  assert.equal(resolveResourceSubjectKey('Computer Graphics (CG)'), 'CS502');
});

test('subject page resolver handles legacy display label Cloud Computing (CC)', () => {
  assert.equal(resolveResourceSubjectKey('Cloud Computing (CC)'), 'CS504');
});

test('legacy suffix cleaner only removes code-like trailing parentheses', () => {
  assert.equal(stripLegacyDisplaySuffix('Data Science (DS)'), 'Data Science');
  assert.equal(stripLegacyDisplaySuffix('Computer Graphics (CG)'), 'Computer Graphics');
});

test('subject page resolver keeps custom subject keys stable', () => {
  assert.equal(resolveResourceSubjectKey('custom:Future Computing'), 'custom:future-computing');
});
