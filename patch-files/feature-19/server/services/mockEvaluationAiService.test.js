const test = require('node:test');
const assert = require('node:assert/strict');

const {
  evaluationAiModel,
  parseJsonFromText,
  validateAiEvaluations,
} = require('./mockEvaluationAiService');

function entry(id, marks = 5) {
  return {
    question: {
      _id: id,
      questionText: `Question ${id}`,
      marks,
      primaryTopic: 'Topic',
    },
    answerText: 'A student answer',
    approvedSolutions: [],
  };
}

test('AI model resolves to a configured/default model', () => {
  assert.ok(evaluationAiModel().length > 0);
});

test('parses fenced JSON', () => {
  const parsed = parseJsonFromText(
    '```json\n{"items":[]}\n```'
  );

  assert.deepEqual(parsed.items, []);
});

test('AI score is capped at question marks', () => {
  const items = [entry('1', 5)];

  const local = {
    items: [
      {
        questionId: '1',
        score: 2,
        maxMarks: 5,
        estimatedAccuracy: 40,
        feedback: 'local',
        strengths: [],
        missingPoints: [],
        nextStep: 'local',
        confidence: 'low',
        referenceBasis: 'local',
      },
    ],
  };

  const result = validateAiEvaluations(
    {
      items: [
        {
          questionId: '1',
          score: 99,
          estimatedAccuracy: 120,
          feedback: 'AI',
          strengths: ['x'],
          missingPoints: ['y'],
          nextStep: 'z',
          confidence: 'high',
        },
      ],
    },
    items,
    local
  );

  assert.equal(result.evaluations[0].score, 5);
  assert.equal(result.evaluations[0].estimatedAccuracy, 100);
});

test('missing AI item falls back to local evaluation', () => {
  const items = [entry('1', 5)];

  const localItem = {
    questionId: '1',
    score: 2.5,
    maxMarks: 5,
    estimatedAccuracy: 50,
    feedback: 'local fallback',
    strengths: [],
    missingPoints: [],
    nextStep: 'retry',
    confidence: 'low',
    referenceBasis: 'local',
  };

  const result = validateAiEvaluations(
    { items: [] },
    items,
    { items: [localItem] }
  );

  assert.equal(result.evaluations[0].score, 2.5);
  assert.equal(result.evaluations[0].feedback, 'local fallback');
});
