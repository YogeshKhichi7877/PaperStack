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

test('a short AI fragment cannot replace a complete local multi-part question', () => {
  const local = { questionKey: 'q2', questionText: '(i) Explain the first calculation in detail.\n(ii) Explain the second calculation in detail.',
    mergedPartKeys: ['q2-i', 'q2-ii'], confidence: 78, needsReview: true };
  const selected = chooseExtraction({ localResult: { questions: [local], confidence: 78, warnings: [] },
    aiResult: { attempted: true, questions: [{ questionKey: 'q2', questionText: '(i) Explain the first calculation.', confidence: 98 }] },
    allowAi: true });
  assert.equal(selected.questions[0].questionText, local.questionText);
});

test('a complete AI repair retains the old child keys for safe retirement', () => {
  const local = { questionKey: 'q2', questionText: '(i) Calculate x.\n(ii) Calculate y.',
    mergedPartKeys: ['q2-i', 'q2-ii'], confidence: 78, needsReview: true };
  const repaired = { questionKey: 'q2', questionText: '(i) Calculate x² using the formula.\n(ii) Calculate y² using the formula.', confidence: 96 };
  const selected = chooseExtraction({ localResult: { questions: [local], confidence: 78, warnings: [] },
    aiResult: { attempted: true, questions: [repaired] }, allowAi: true });
  assert.equal(selected.questions[0].questionText, repaired.questionText);
  assert.deepEqual(selected.questions[0].mergedPartKeys, ['q2-i', 'q2-ii']);
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
