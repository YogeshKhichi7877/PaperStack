const test = require('node:test');
const assert = require('node:assert/strict');

const {
  cleanJsonText,
  dedupeAiQuestions,
  parseGeminiQuestionResponse,
} = require('./freeAiQuestionService');

test('cleans JSON code fences', () => {
  assert.equal(cleanJsonText('```json\n{"questions":[]}\n```'), '{"questions":[]}');
});

test('normalizes and deduplicates AI question keys', () => {
  const result = dedupeAiQuestions([
    { questionNumber: '2', part: 'a', questionText: 'First' },
    { questionNumber: '2', part: 'a', questionText: 'Second' },
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
