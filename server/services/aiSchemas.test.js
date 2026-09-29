const test = require('node:test');
const assert = require('node:assert/strict');
const { mockSelectionSchema, numericalReasoningSchema, parseAiJson,
  questionExtractionSchema } = require('./aiSchemas');

test('rejects malformed JSON and structurally invalid AI output', () => {
  assert.throws(() => parseAiJson('not JSON', mockSelectionSchema), /AI response invalid/);
  assert.throws(() => parseAiJson('{"questions":[{"questionText":42}]}', questionExtractionSchema), /AI response invalid/);
  assert.throws(() => parseAiJson('{"given":[],"required":"x","formula":"x","expression":"2+2","claimedResult":{"x":4}}', numericalReasoningSchema), /AI response invalid/);
});

test('accepts a valid numerical reasoning contract', () => {
  const value = parseAiJson('{"given":["a=2"],"required":"x","formula":"x=a^2","expression":"2^2","claimedResult":4}', numericalReasoningSchema);
  assert.equal(value.claimedResult, 4);
});
