const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseExtraction, extractionFailureReason } = require('./questionExtractionService');

test('local questions survive an AI outage as a partial extraction', () => {
  const localQuestion = { questionKey: 'q1', questionText: 'Calculate the current.' };
  const selected = chooseExtraction({
    localResult: { questions: [localQuestion], confidence: 55, warnings: ['Low text confidence'] },
    aiResult: { attempted: true, questions: [], reason: 'AI unavailable' }, allowAi: true,
  });
  assert.equal(selected.source, 'rule');
  assert.deepEqual(selected.questions, [localQuestion]);
  assert.equal(selected.aiAttempted, true);
  assert.match(selected.warnings.join(' '), /AI unavailable/);
});

test('empty scanned extraction points to the disabled AI fallback', () => {
  const reason = extractionFailureReason({
    localResult: { textLength: 0 }, aiResult: { attempted: false }, allowAi: false,
  });
  assert.match(reason, /Enable AI extraction/);
});

test('empty extraction after AI attempt reports that the PDF needs review', () => {
  const reason = extractionFailureReason({
    localResult: { textLength: 0 }, aiResult: { attempted: true }, allowAi: true,
  });
  assert.match(reason, /even with AI extraction/);
});
