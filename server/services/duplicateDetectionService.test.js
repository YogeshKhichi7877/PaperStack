const test = require('node:test');
const assert = require('node:assert/strict');
const { classifyTextDuplicate } = require('./duplicateDetectionService');

test('duplicate classifier separates exact, probable and distinct content', () => {
  assert.equal(classifyTextDuplicate('Q1. Explain midpoint algorithm', 'Explain midpoint algorithm').classification, 'exact');
  assert.equal(classifyTextDuplicate('Explain midpoint line drawing algorithm with steps', 'Describe the midpoint line drawing algorithm and its steps').classification, 'probable');
  assert.equal(classifyTextDuplicate('Explain midpoint algorithm', 'Define database normalization').classification, 'distinct');
});
