const test = require('node:test');
const assert = require('node:assert/strict');
const { chooseExtraction } = require('./questionExtractionService');

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
