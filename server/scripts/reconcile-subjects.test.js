const test = require('node:test');
const assert = require('node:assert/strict');
const { buildIndexes, planSubjectUpdate } = require('./reconcile-subjects');

test('subject migration normalizes code variants to one canonical code and name', () => {
  for (const code of ['CS-504', 'CS 504', 'cs504']) {
    const plan = planSubjectUpdate({ subjectCode: code, subject: 'Cloud Computing' });
    assert.equal(plan.status, 'safe');
    assert.equal(plan.canonical.code, 'CS504');
    assert.equal(plan.update.subjectCode, 'CS504');
    assert.equal(plan.update.subject, 'Cloud Computing & Big Data Infrastructure');
  }
});

test('subject migration never merges an explicit conflicting code by name', () => {
  const plan = planSubjectUpdate({ subjectCode: 'EC999', subject: 'Operating System' });
  assert.equal(plan.status, 'unknown-code');
  assert.equal(plan.canonical, null);
});

test('ambiguous exact aliases are held for review', () => {
  const indexes = buildIndexes([
    { code: 'AA101', name: 'Shared Name', aliases: [] },
    { code: 'BB101', name: 'Shared Name', aliases: [] },
  ]);
  const plan = planSubjectUpdate({ subjectCode: '', subject: 'Shared Name' }, 'subjectCode', 'subject', indexes);
  assert.equal(plan.status, 'ambiguous-name');
  assert.deepEqual(plan.update, {});
});
