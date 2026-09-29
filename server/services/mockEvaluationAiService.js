const {
  evaluateLocalBatch,
  questionMarks,
  questionTopics,
  roundHalf,
  summarizeEvaluations,
} = require('./mockEvaluationService');
const { aiAvailable, generateForTask, modelForProvider, providerOrder } = require('./aiService');
const { mockEvaluationSchema, parseAiJson } = require('./aiSchemas');
const { applyNumericalScoreCap } = require('./numericalEvaluationService');

const DEFAULT_MODEL =
  'openai/gpt-oss-120b';

function evaluationAiModel() {
  const provider = providerOrder(process.env, 'MOCK_EVALUATION')[0];
  return provider ? modelForProvider(provider) : DEFAULT_MODEL;
}

function evaluationAiEnabled() {
  return process.env.MOCK_EVALUATION_AI_ENABLED !== 'false' && aiAvailable(process.env, 'MOCK_EVALUATION');
}

function parseJsonFromText(text = '') {
  const raw = String(text || '').trim();

  if (!raw) {
    throw new Error('AI response invalid');
  }

  try {
    return JSON.parse(raw);
  } catch {}

  const fenced = raw.match(
    /```(?:json)?\s*([\s\S]*?)```/i
  );

  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');

  if (first !== -1 && last > first) {
    return JSON.parse(
      raw.slice(first, last + 1)
    );
  }

  throw new Error('AI response invalid');
}

function promptItem(item = {}) {
  const question = item.question || {};
  const approvedSolutions = item.approvedSolutions || [];

  return {
    questionId: String(question._id || ''),
    question: question.questionText || '',
    marks: questionMarks(question),
    questionType: question.questionType || '',
    topics: questionTopics(question),
    studentAnswer: String(item.answerText || '').slice(0, 8000),
    approvedReferenceSolutions: item.generatedReference ? [] : approvedSolutions
      .slice(0, 2)
      .map((solution) => String(solution.answerText || '').slice(0, 5000)),
    generatedPracticeAnswerKey: item.generatedReference
      ? String(approvedSolutions[0]?.answerText || '').slice(0, 5000) : '',
    markingScheme: item.generatedReference ? item.markingScheme : [],
  };
}

function validateAiEvaluations(payload, items, localFallback) {
  const sourceItems = Array.isArray(payload?.items)
    ? payload.items
    : [];

  const sourceById = new Map(
    sourceItems.map((item) => [
      String(item.questionId || ''),
      item,
    ])
  );

  const localById = new Map(
    localFallback.items.map((item) => [
      String(item.questionId),
      item,
    ])
  );

  const evaluations = items.map((entry) => {
    const questionId = String(entry.question._id || '');
    const local = localById.get(questionId);
    const ai = sourceById.get(questionId);

    if (!ai) {
      return local;
    }

    const maxMarks = questionMarks(entry.question);

    const rawScore = Number(ai.score);
    const score = Number.isFinite(rawScore)
      ? Math.max(0, Math.min(maxMarks, roundHalf(rawScore)))
      : local.score;

    const rawAccuracy = Number(ai.estimatedAccuracy);
    const estimatedAccuracy = Number.isFinite(rawAccuracy)
      ? Math.max(0, Math.min(100, Math.round(rawAccuracy)))
      : Math.round((score / maxMarks) * 100);

    return applyNumericalScoreCap({
      questionId,
      score,
      maxMarks,
      estimatedAccuracy,
      feedback:
        String(ai.feedback || '').trim() ||
        local.feedback,
      strengths:
        Array.isArray(ai.strengths)
          ? ai.strengths.map(String).slice(0, 5)
          : local.strengths,
      missingPoints:
        Array.isArray(ai.missingPoints)
          ? ai.missingPoints.map(String).slice(0, 6)
          : local.missingPoints,
      nextStep:
        String(ai.nextStep || '').trim() ||
        local.nextStep,
      confidence:
        ['low', 'medium', 'high'].includes(ai.confidence)
          ? ai.confidence
          : (
              entry.approvedSolutions?.length
                ? 'medium'
                : 'low'
            ),
      referenceBasis: entry.generatedReference
        ? 'Generated practice answer key'
        : entry.approvedSolutions?.length
          ? 'Approved student solution + question context'
          : 'Question/topic context',
      diagnostics: local.diagnostics,
    }, entry, roundHalf);
  });

  return {
    evaluations,
    overallFeedback:
      String(payload?.overallFeedback || '').trim(),
  };
}

async function requestAiEvaluation(items = []) {
  const compact = items.map(promptItem);

  const prompt = [
    'You are a practice-exam evaluator for PaperStack.',
    'Score each student answer fairly and conservatively.',
    'This is NOT official grading. It is formative practice feedback.',
    'Use an approved reference solution or generated practice answer key when provided. For generated questions, award marks against the supplied markingScheme; do not exceed the question maximum. Otherwise use your academic knowledge plus the question/topic context.',
    'Do not reward length alone. Check correctness, reasoning, completeness, method, and whether the answer satisfies the command word.',
    'Never assign more than the question marks.',
    'estimatedAccuracy is a 0-100 estimate of correctness/completeness, not a probability.',
    '',
    'Return JSON only in this exact shape:',
    '{"items":[{"questionId":"...","score":3.5,"estimatedAccuracy":70,"feedback":"...","strengths":["..."],"missingPoints":["..."],"nextStep":"...","confidence":"low|medium|high"}],"overallFeedback":"..."}',
    '',
    'Questions and answers:',
    JSON.stringify(compact),
  ].join('\n');

  const text = await generateForTask('MOCK_EVALUATION', prompt,
    { temperature: 0.1, maxOutputTokens: 5000, json: true,
      validateResponse: (value) => parseAiJson(value, mockEvaluationSchema) });

  return {
    model: null,
    payload: parseAiJson(text, mockEvaluationSchema),
  };
}

async function evaluateBatchWithMode(
  items = [],
  mode = 'local'
) {
  const local = evaluateLocalBatch(items);

  if (mode !== 'ai') {
    return { ...local, status: 'local_only', degraded: false };
  }

  if (!evaluationAiEnabled()) {
    return {
      ...local,
      status: 'ai_unavailable',
      degraded: true,
      warnings: [
        'PaperStack used local scoring because AI assistance was unavailable.',
      ],
    };
  }

  try {
    const ai = await requestAiEvaluation(items);

    const validated = validateAiEvaluations(
      ai.payload,
      items,
      local
    );

    const summary = summarizeEvaluations(
      validated.evaluations
    );

    return {
      mode: 'ai',
      status: 'high_confidence',
      degraded: false,
      model: null,
      warnings: [],
      items: validated.evaluations,
      ...summary,
      overallFeedback:
        validated.overallFeedback ||
        summary.overallFeedback,
    };
  } catch (error) {
    return {
      ...local,
      status: 'ai_unavailable',
      degraded: true,
      warnings: [
        'PaperStack used local scoring because AI assistance was unavailable.',
      ],
    };
  }
}

module.exports = {
  DEFAULT_MODEL,
  evaluateBatchWithMode,
  evaluationAiEnabled,
  evaluationAiModel,
  parseJsonFromText,
  promptItem,
  requestAiEvaluation,
  validateAiEvaluations,
};
