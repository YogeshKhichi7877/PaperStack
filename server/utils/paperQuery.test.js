const test = require('node:test');
const assert = require('node:assert/strict');
const { buildSemesterPackQuery } = require('./paperQuery');

test('semester pack query uses the branch field and legacy title fallback', () => {
  const query = buildSemesterPackQuery({
    branch: 'CSE',
    semester: '5',
    examType: 'Mid-Sem',
  });

  assert.equal(query.semester, 5);
  assert.equal(query.examType, 'Mid-Sem');
  assert.equal(query.$or.length, 2);
  assert.ok(query.$or[0].branch instanceof RegExp);
  assert.ok(query.$or[1].title instanceof RegExp);
  assert.equal(query.$or[0].branch.test('CSE & ECE'), true);
});
