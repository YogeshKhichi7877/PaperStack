function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9%+\-*/=.\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'because',
  'by', 'can', 'do', 'does', 'for', 'from', 'has', 'have',
  'how', 'in', 'is', 'it', 'of', 'on', 'or', 'that', 'the',
  'their', 'then', 'there', 'this', 'to', 'using', 'was',
  'what', 'when', 'where', 'which', 'with', 'write', 'explain',
  'describe', 'calculate', 'find', 'state', 'define', 'show',
  'question', 'answer', 'given', 'following'
]);

function tokenize(value = '') {
  return normalizeText(value)
    .split(' ')
    .filter(
      (token) =>
        token.length >= 3 &&
        !STOP_WORDS.has(token)
    );
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function questionTopics(question = {}) {
  const values = [];

  if (question.primaryTopic) {
    values.push(question.primaryTopic);
  }

  if (Array.isArray(question.topics)) {
    question.topics.forEach((topic) => {
      if (typeof topic === 'string') {
        values.push(topic);
      } else if (topic && topic.name) {
        values.push(topic.name);
      }
    });
  }

  return unique(
    values
      .map((value) => String(value || '').trim())
      .filter(Boolean)
  );
}

function questionMarks(question = {}) {
  const numeric = Number(question.marks);

  return Number.isFinite(numeric) && numeric > 0
    ? numeric
    : 2;
}

function commandType(questionText = '') {
  const text = normalizeText(questionText);

  if (/(calculate|compute|find|solve|derive)/.test(text)) {
    return 'numerical';
  }

  if (/(compare|differentiate|difference)/.test(text)) {
    return 'compare';
  }

  if (/(draw|diagram|sketch|construct)/.test(text)) {
    return 'diagram';
  }

  if (/(define|state|list)/.test(text)) {
    return 'direct';
  }

  return 'explain';
}

function overlapRatio(referenceTokens = [], answerTokens = []) {
  const reference = unique(referenceTokens);
  const answer = new Set(answerTokens);

  if (!reference.length) {
    return 0;
  }

  const matches = reference.filter((token) => answer.has(token)).length;

  return Math.min(
    1,
    matches / Math.min(reference.length, 18)
  );
}

function topicCoverage(question = {}, answerTokens = []) {
  const topicTokens = unique(
    questionTopics(question).flatMap(tokenize)
  );

  if (!topicTokens.length) {
    return 0.5;
  }

  return overlapRatio(topicTokens, answerTokens);
}

function completenessRatio(answerText = '', marks = 2) {
  const words = normalizeText(answerText)
    .split(' ')
    .filter(Boolean).length;

  const expected = Math.max(
    20,
    Math.min(180, Number(marks || 2) * 24)
  );

  return Math.min(1, words / expected);
}

function structureRatio(question = {}, answerText = '') {
  const type = commandType(question.questionText);
  const text = String(answerText || '');
  const normalized = normalizeText(text);

  if (!normalized) {
    return 0;
  }

  if (type === 'numerical') {
    const hasNumber = /\d/.test(text);
    const hasMath = /[=+\-*/]/.test(text);
    const hasMethodWord = /(formula|step|therefore|substitut|matrix|value|result)/i.test(text);

    return (
      (hasNumber ? 0.35 : 0) +
      (hasMath ? 0.35 : 0) +
      (hasMethodWord ? 0.30 : 0)
    );
  }

  if (type === 'compare') {
    const cues = [
      /whereas/i,
      /while/i,
      /difference/i,
      /compared/i,
      /versus/i,
      /\bvs\b/i,
    ];

    return Math.min(
      1,
      0.35 +
      cues.filter((pattern) => pattern.test(text)).length * 0.25
    );
  }

  if (type === 'diagram') {
    return /(diagram|figure|label|axis|draw|sketch)/i.test(text)
      ? 0.85
      : 0.45;
  }

  if (type === 'direct') {
    return normalizeText(text).split(' ').length >= 8
      ? 0.9
      : 0.55;
  }

  const sentences = text
    .split(/[.!?]\s+/)
    .filter((item) => item.trim()).length;

  return Math.min(
    1,
    0.45 + Math.max(0, sentences - 1) * 0.18
  );
}

function referenceTokens(question = {}, approvedSolutions = []) {
  const solutionText = approvedSolutions
    .map((solution) => solution.answerText || '')
    .join(' ');

  const solutionTokens = tokenize(solutionText);
  const topicTokens = questionTopics(question).flatMap(tokenize);
  const questionTokens = tokenize(question.questionText || '');

  if (solutionTokens.length) {
    return unique([
      ...solutionTokens,
      ...topicTokens,
    ]);
  }

  return unique([
    ...topicTokens,
    ...questionTokens,
  ]);
}

function roundHalf(value) {
  return Math.round(Number(value || 0) * 2) / 2;
}

function buildFeedback({
  question,
  answerText,
  reference,
  approvedSolutions,
  content,
  topics,
  completeness,
  structure,
}) {
  const answerTokens = new Set(tokenize(answerText));

  const missing = reference
    .filter((token) => !answerTokens.has(token))
    .filter((token) => token.length >= 4)
    .slice(0, 5);

  const strengths = [];

  if (content >= 0.65) {
    strengths.push('Good coverage of the expected concepts.');
  }

  if (topics >= 0.7) {
    strengths.push('The answer addresses the main topic vocabulary.');
  }

  if (completeness >= 0.75) {
    strengths.push('Answer length/depth is appropriate for the marks.');
  }

  if (structure >= 0.75) {
    strengths.push('The response structure suits this question type.');
  }

  if (!strengths.length && String(answerText || '').trim()) {
    strengths.push('You attempted the question and included some relevant material.');
  }

  let nextStep = 'Add the missing core concepts and make the reasoning more explicit.';

  if (completeness < 0.45) {
    nextStep = 'Expand the answer: show more of the reasoning/steps expected for these marks.';
  } else if (structure < 0.45) {
    nextStep = 'Improve the answer structure for this question type before adding more detail.';
  } else if (missing.length) {
    nextStep = `Revise these likely missing concepts: ${missing.join(', ')}.`;
  }

  return {
    strengths,
    missingPoints: missing,
    nextStep,
    referenceBasis:
      approvedSolutions.length
        ? 'Approved student solution + question metadata'
        : 'Question/topic metadata only',
    confidence:
      approvedSolutions.length
        ? 'medium'
        : 'low',
  };
}

function evaluateLocalAnswer({
  question,
  answerText = '',
  approvedSolutions = [],
}) {
  const marks = questionMarks(question);
  const trimmed = String(answerText || '').trim();

  if (!trimmed) {
    return {
      questionId: String(question._id || ''),
      score: 0,
      maxMarks: marks,
      estimatedAccuracy: 0,
      feedback: 'No answer was provided.',
      strengths: [],
      missingPoints: questionTopics(question).slice(0, 5),
      nextStep: 'Attempt the question before checking a solution.',
      confidence: 'high',
      referenceBasis: 'No answer provided',
    };
  }

  const answerTokens = tokenize(trimmed);
  const reference = referenceTokens(question, approvedSolutions);

  const content = overlapRatio(reference, answerTokens);
  const topics = topicCoverage(question, answerTokens);
  const completeness = completenessRatio(trimmed, marks);
  const structure = structureRatio(question, trimmed);

  let ratio;

  if (approvedSolutions.length) {
    ratio =
      content * 0.52 +
      topics * 0.18 +
      completeness * 0.18 +
      structure * 0.12;
  } else {
    ratio =
      content * 0.34 +
      topics * 0.24 +
      completeness * 0.25 +
      structure * 0.17;

    ratio = Math.min(ratio, 0.80);
  }

  if (answerTokens.length < 5) {
    ratio = Math.min(ratio, 0.22);
  }

  ratio = Math.max(0, Math.min(1, ratio));

  const score = Math.min(
    marks,
    roundHalf(marks * ratio)
  );

  const estimatedAccuracy = Math.round(
    (score / marks) * 100
  );

  const details = buildFeedback({
    question,
    answerText: trimmed,
    reference,
    approvedSolutions,
    content,
    topics,
    completeness,
    structure,
  });

  const feedback =
    estimatedAccuracy >= 80
      ? 'Strong practice answer. Review the missing points, then compare with an approved solution if available.'
      : estimatedAccuracy >= 55
        ? 'Partially correct/relevant. The core direction is present, but important details or reasoning are still missing.'
        : 'The answer needs substantial improvement before it would be considered exam-ready.';

  return {
    questionId: String(question._id || ''),
    score,
    maxMarks: marks,
    estimatedAccuracy,
    feedback,
    diagnostics: {
      conceptCoverage: Math.round(content * 100),
      topicCoverage: Math.round(topics * 100),
      completeness: Math.round(completeness * 100),
      structure: Math.round(structure * 100),
    },
    ...details,
  };
}

function summarizeEvaluations(items = []) {
  const totalScore = roundHalf(
    items.reduce(
      (sum, item) => sum + Number(item.score || 0),
      0
    )
  );

  const totalMarks = items.reduce(
    (sum, item) => sum + Number(item.maxMarks || 0),
    0
  );

  const percentage = totalMarks
    ? Math.round((totalScore / totalMarks) * 100)
    : 0;

  const answeredCount = items.filter(
    (item) => item.referenceBasis !== 'No answer provided'
  ).length;

  let overallFeedback;

  if (percentage >= 80) {
    overallFeedback =
      'Strong mock attempt. Focus next on the few missing concepts and answer precision.';
  } else if (percentage >= 60) {
    overallFeedback =
      'Good base, but several answers need more complete reasoning or topic coverage.';
  } else if (percentage >= 40) {
    overallFeedback =
      'The attempt shows partial understanding. Revisit weak topics and retry the same questions.';
  } else {
    overallFeedback =
      'Use this result as a diagnostic: revise the fundamentals, then reattempt before checking all solutions.';
  }

  return {
    totalScore,
    totalMarks,
    percentage,
    answeredCount,
    questionCount: items.length,
    overallFeedback,
  };
}

function evaluateLocalBatch(items = []) {
  const evaluations = items.map((item) =>
    evaluateLocalAnswer(item)
  );

  return {
    mode: 'local',
    model: null,
    warnings: [],
    items: evaluations,
    ...summarizeEvaluations(evaluations),
  };
}

module.exports = {
  buildFeedback,
  commandType,
  completenessRatio,
  evaluateLocalAnswer,
  evaluateLocalBatch,
  normalizeText,
  overlapRatio,
  questionMarks,
  questionTopics,
  referenceTokens,
  roundHalf,
  structureRatio,
  summarizeEvaluations,
  tokenize,
  topicCoverage,
};
