const test = require('node:test');
const assert = require('node:assert/strict');

const {
  dedupeAiQuestions,
  readablePdfText,
  normalizeAiQuestion, textChunks,
  extractQuestionsWithAi,
} = require('./freeAiQuestionService');
const { PAGE_BREAK } = require('./questionExtractionRules');

test('removes page markers before deciding whether PDF text is usable', () => {
  assert.equal(readablePdfText(Array(12).fill(PAGE_BREAK).join('\n')), '');
});

test('normalizes and deduplicates AI question keys', () => {
  const result = dedupeAiQuestions([
    { questionNumber: '2', part: 'a', questionText: 'Explain the first concept.' },
    { questionNumber: '2', part: 'a', questionText: 'Explain the second concept.' },
  ]);

  assert.equal(result.length, 2);
  assert.equal(result[0].questionKey, 'q2-a');
  assert.notEqual(result[1].questionKey, 'q2-a');
  assert.equal(result[1].needsReview, true);
});

test('normalizes complete labels and preserves unknown marks and math', () => {
  const q = normalizeAiQuestion({ questionNumber: 'Q2(a)', questionText: 'Calculate x² and y₂.\nUse the given values.', marks: null, confidence: 98 });
  assert.equal(q.questionLabel, 'Q2(a)');
  assert.equal(q.marks, null);
  assert.equal(q.needsReview, true);
  assert.match(q.questionText, /x²/);
});
test('oversized questions are skipped for AI instead of split into fragments', () => {
  const text = `${PAGE_BREAK}\nQ1. ${'context '.repeat(6000)}\n${PAGE_BREAK}\nQ99. Explain the final concept.`;
  const chunks = textChunks(text);
  assert.equal(chunks.length, 1);
  assert.equal(chunks.skipped, 1);
  assert.match(chunks[0], /final concept/);
  assert.match(chunks[0], /Physical page 2/);
});

test('AI chunks keep a whole numbered question and its continuation together', () => {
  const q1 = 'Q1. Calculate the value of x² + y².\nContinue using the matrix below. [5]';
  const q2 = 'Q2. Explain the following derivation fully.\nShow the final operator. [5]';
  const chunks = textChunks(`${PAGE_BREAK}\n${q1}\n${PAGE_BREAK}\n${q2}`, 100, 20);
  assert.equal(chunks.length, 2);
  assert.ok(chunks[0].includes('Continue using the matrix below'));
  assert.ok(chunks[1].includes('Show the final operator'));
  assert.match(chunks[1], /Physical page 2/);
});

test('AI chunking does not separate Q2(i) from Q2(ii)', () => {
  const text = `${PAGE_BREAK}\nQ1. Explain caching. [2]\nQ2(i) Calculate x² + 1. [3]\nQ2(ii) Calculate y² + 1. [3]\nQ3. Explain the result. [2]`;
  const chunks = textChunks(text, 90, 20);
  const containingFirstPart = chunks.find((chunk) => chunk.includes('Q2(i)'));
  assert.ok(containingFirstPart);
  assert.match(containingFirstPart, /Q2\(ii\)/);
});

test('AI structure fallback repairs malformed output once and validates repaired questions', async () => {
  let calls = 0;
  const result = await extractQuestionsWithAi({ paper: { _id: 'synthetic-repair-test' }, extractedText: 'Explain virtual memory. '.repeat(20), localResult: { questions: [], warnings: [] } }, {
    status: { enabled: true }, aiAvailable: () => true,
    generateForTask: async (task, prompt, options) => {
      calls += 1;
      if (calls === 1) { const error = new Error('secret malformed output'); error.failures = [{ category: 'invalid_response' }]; throw error; }
      assert.match(prompt, /previous response failed validation/);
      assert.equal(options.maxRetries, 0);
      return JSON.stringify({ questions: [{ questionNumber: 'Q2(a)', questionText: 'Explain virtual memory allocation.', marks: 5, pageNumber: 1, confidence: 95 }] });
    },
  });
  assert.equal(calls, 2);
  assert.equal(result.questions[0].questionLabel, 'Q2');
  assert.match(result.questions[0].questionText, /\(a\) Explain virtual memory/);
});

test('AI subparts are combined into one record after extraction', async () => {
  const result = await extractQuestionsWithAi({ paper: { _id: 'combined-ai-test' }, extractedText: 'Q2(i) Evaluate x². [2]\nQ2(ii) Evaluate y². [3]\n'.repeat(4) }, {
    status: { enabled: true }, aiAvailable: () => true,
    generateForTask: async () => JSON.stringify({ questions: [
      { questionNumber: '2', part: 'i', questionText: 'Evaluate x² carefully.', marks: 2, confidence: 96 },
      { questionNumber: '2', part: 'ii', questionText: 'Evaluate y² carefully.', marks: 3, confidence: 96 },
    ] }),
  });
  assert.equal(result.questions.length, 1);
  assert.equal(result.questions[0].questionKey, 'q2');
  assert.equal(result.questions[0].marks, 5);
  assert.match(result.questions[0].questionText, /\(i\).*x²/);
  assert.match(result.questions[0].questionText, /\(ii\).*y²/);
});
test('AI provider failure preserves safe retry diagnostics without leaking provider messages', async () => {
  const result = await extractQuestionsWithAi({ paper: { _id: 'synthetic-outage-test' }, extractedText: 'Explain virtual memory. '.repeat(20) }, {
    status: { enabled: true }, aiAvailable: () => true,
    generateForTask: async () => { const error = new Error('secret provider message'); error.code = 'AI_TIMEOUT'; throw error; },
  });
  assert.equal(result.retryable, true);
  assert.equal(result.incomplete, true);
  assert.equal(result.questions.length, 0);
  assert.doesNotMatch(result.reason, /secret/);
});
