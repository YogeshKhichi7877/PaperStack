const test = require('node:test');
const assert = require('node:assert/strict');

const {
  FIRST_CATEGORY_BONUS,
  baseResourcePoints,
  calculateResourcePoints,
} = require('./resourceContributionPoints');

test('notes award the configured base points', () => {
  assert.equal(baseResourcePoints('notes'), 60);
});

test('solution awards more points than quiz material', () => {
  assert.ok(
    baseResourcePoints('solution') >
      baseResourcePoints('quiz')
  );
});

test('first category bonus is added only when applicable', () => {
  const normal = calculateResourcePoints(
    'formula_sheet',
    {
      firstInCategory: false,
    }
  );

  const first = calculateResourcePoints(
    'formula_sheet',
    {
      firstInCategory: true,
    }
  );

  assert.equal(
    first.total,
    normal.total + FIRST_CATEGORY_BONUS
  );
});

test('unsupported resource kinds do not receive points', () => {
  assert.equal(
    calculateResourcePoints(
      'question_paper'
    ).total,
    0
  );
});
