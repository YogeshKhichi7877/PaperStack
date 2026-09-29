const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateExpression, verifyCalculation } = require('./mathVerificationService');

test('verifies arithmetic, powers, roots, statistics and scientific notation', () => {
  assert.equal(evaluateExpression('(2+3)*4'), 20);
  assert.equal(evaluateExpression('sqrt(16)+2^3'), 12);
  assert.equal(evaluateExpression('mean([2,4,6])'), 4);
  assert.equal(evaluateExpression('2.5e3 / 5'), 500);
  assert.equal(verifyCalculation({ expression: '2^3', claimedResult: '4+4' }).verified, true);
});

test('verifies matrix multiplication, transpose and determinant', () => {
  assert.deepEqual(evaluateExpression('multiply([[1,2],[3,4]],[[5,6],[7,8]])'), [[19, 22], [43, 50]]);
  assert.deepEqual(evaluateExpression('transpose([[1,2],[3,4]])'), [[1, 3], [2, 4]]);
  assert.equal(evaluateExpression('det([[1,2],[3,4]])'), -2);
});

test('accepts equivalent numerical results within tolerance and rejects wrong answers', () => {
  assert.equal(verifyCalculation({ expression: '1/3', claimedResult: 0.3333333 }).verified, true);
  assert.equal(verifyCalculation({ expression: 'sqrt(9)', claimedResult: 4 }).verified, false);
});

test('rejects malformed expressions, assignments and arbitrary JavaScript', () => {
  for (const expression of ['2+(', 'process.exit()', 'a=2', 'import("fs")', '2^1000000', 'factorial(1000000)']) {
    assert.equal(verifyCalculation({ expression, claimedResult: 2 }).verified, false);
  }
});
