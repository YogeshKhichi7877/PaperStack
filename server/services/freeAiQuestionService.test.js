const test = require('node:test');
const assert = require('node:assert/strict');

const {
  cleanJsonText,
  dedupeAiQuestions,
  parseGeminiQuestionResponse,
  readablePdfText,
  normalizeAiQuestion, textChunks,
  extractQuestionsWithAi,
} = require('./freeAiQuestionService');
const { PAGE_BREAK } = require('./questionExtractionRules');

test('removes page markers before deciding whether PDF text is usable', () => {
  assert.equal(readablePdfText(Array(12).fill(PAGE_BREAK).join('\n')), '');
});

test('cleans JSON code fences', () => {
  assert.equal(cleanJsonText('```json\n{"questions":[]}\n```'), '{"questions":[]}');
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

test('parses Gemini response JSON without network access', () => {
  const response = {
    candidates: [
      {
        content: {
          parts: [
            {
              text: JSON.stringify({
                questions: [
                  {
                    questionNumber: '1',
                    questionText: 'Explain raster scan.',
                    marks: 2,
                    confidence: 94,
                  },
                ],
              }),
            },
          ],
        },
      },
    ],
  };

  const questions = parseGeminiQuestionResponse(response);
  assert.equal(questions.length, 1);
  assert.equal(questions[0].questionKey, 'q1');
  assert.equal(questions[0].marks, 2);
});

test('normalizes complete labels and preserves unknown marks and math', () => {
  const q = normalizeAiQuestion({ questionNumber: 'Q2(a)', questionText: 'Calculate x² and y₂.\nUse the given values.', marks: null, confidence: 98 });
  assert.equal(q.questionLabel, 'Q2(a)');
  assert.equal(q.marks, null);
  assert.equal(q.needsReview, true);
  assert.match(q.questionText, /x²/);
});
test('long AI input is chunked with overlap without truncating the final question', () => {
  const text = `${PAGE_BREAK}\n${'context '.repeat(6000)}\n${PAGE_BREAK}\nQ99. Explain the final concept.`;
  const chunks = textChunks(text);
  assert.ok(chunks.length > 3);
  assert.match(chunks.at(-1), /final concept/);
  assert.match(chunks.at(-1), /Physical page 2/);
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
  assert.equal(result.questions[0].questionLabel, 'Q2(a)');
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
