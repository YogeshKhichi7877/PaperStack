const crypto = require('node:crypto');
const { buildMockExam, buildMockPaper, clampNumber, createSeededRandom, questionFingerprint,
  questionMarks, shuffleSeeded, strategyScore } = require('./mockExamService');
const { combineMock, estimateDifficulty, generateNovelQuestions, novelQuestionAiEnabled } = require('./mockNovelService');

function generationError(code, message, status = 503) {
  return Object.assign(new Error(message), { code, status });
}

function planMock(archive, options = {}) {
  const totalMarks = clampNumber(options.totalMarks, 10, 100, 25);
  const mockType = ['pyq', 'mixed', 'new'].includes(options.mockType) ? options.mockType : 'mixed';
  const seen = new Set();
  const references = archive.filter((item) => {
    const fingerprint = questionFingerprint(item);
    if (!fingerprint || item.status === 'rejected' || seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
  if (!references.length) throw generationError('NO_QUESTIONS', 'No readable questions are available for this subject and exam scope.', 404);

  const requestedDifficulty = options.difficulty === 'balanced' ? '' : options.difficulty;
  const matching = references.filter((item) => estimateDifficulty(item) === requestedDifficulty);
  const candidates = mockType === 'pyq' && requestedDifficulty && matching.length ? matching : references;
  let base = buildMockExam(candidates, { ...options, totalMarks });
  if (mockType === 'pyq') {
    if (!base.questions.length) {
      const smallest = [...candidates].sort((a, b) => questionMarks(a) - questionMarks(b))[0];
      base = buildMockPaper([smallest], { ...options, totalMarks });
    }
    return { base, templates: [], archive: references };
  }

  const byId = new Map(references.map((item) => [String(item._id), item]));
  const selected = mockType === 'new' ? [] : base.questions.map((item) => byId.get(item._id));
  // Evaluation accepts at most 30 answers. Reserve enough places for any AI
  // top-up when the archive consists of many low-mark questions.
  while (selected.length + Math.ceil((totalMarks - selected.reduce((sum, item) => sum + questionMarks(item), 0)) / 5) > 30) {
    selected.pop();
  }
  const templates = mockType === 'new' ? [] : selected.filter((_, index) => index % 2 === 0);
  let remaining = totalMarks - selected.reduce((sum, item) => sum + questionMarks(item), 0);
  // Rank source concepts with the chosen strategy/adaptive scores, then spread
  // new slots across them. The archive's mark denominations do not constrain AI.
  const ordered = shuffleSeeded(candidates, createSeededRandom(options.seed)).sort((a, b) =>
    (strategyScore(b, options.strategy) + Number(b.topicScore || 0) * .1)
      - (strategyScore(a, options.strategy) + Number(a.topicScore || 0) * .1));
  const selectedTopics = new Set();
  const topicKey = (item) => String(item.primaryTopic || item.topics?.[0] || item._id).toLowerCase();
  let index = 0;
  while (remaining > 1e-6) {
    const reference = ordered.find((item) => !selectedTopics.has(topicKey(item)))
      || ordered[index % ordered.length];
    selectedTopics.add(topicKey(reference));
    const marks = Math.min(5, remaining);
    const slot = {
      ...reference, _id: crypto.randomBytes(12).toString('hex'),
      archiveQuestionId: String(reference._id), marks,
    };
    selected.push(slot);
    templates.push(slot);
    remaining = Math.round((remaining - marks) * 100) / 100;
    index += 1;
  }
  return { base: buildMockPaper(selected, { ...options, totalMarks }), templates, archive: references };
}

async function generatePracticeMock(archive, options = {}, dependencies = {}) {
  const aiEnabled = (dependencies.aiEnabled || novelQuestionAiEnabled)();
  const mockType = options.mockType || 'mixed';
  if (mockType === 'new' && !aiEnabled) throw generationError('AI_UNAVAILABLE',
    'AI question generation is temporarily unavailable. Try again later or choose PYQ Only.');
  const plan = planMock(archive, options);
  const warnings = [];
  if (mockType === 'pyq' && !plan.base.exactMarks) warnings.push(
    `The archive cannot supply exactly ${plan.base.targetMarks} marks for this scope. This paper contains ${plan.base.generatedMarks} marks with no repeated questions.`);
  let generated = [];
  if (mockType !== 'pyq' && aiEnabled) {
    generated = await (dependencies.generateNovelQuestions || generateNovelQuestions)(plan.templates, plan.archive, {
      subject: plan.base.subject, examType: options.examType, difficulty: options.difficulty,
    });
    const generatedSlots = new Set(generated.map((item) => item.generationSlotId || item.sourceQuestionId));
    const missingRequired = plan.templates.some((item) =>
      (mockType === 'new' || item.archiveQuestionId) && !generatedSlots.has(String(item._id)));
    if (missingRequired) throw generationError('AI_INCOMPLETE',
      'AI could not finish checking a complete paper. Please try again. You can also choose PYQ Only for immediate practice.');
    if (generated.length < plan.templates.length) warnings.push(
      'Some fresh questions could not be verified; their original archived questions remain in this paper.');
  } else if (mockType !== 'pyq') {
    // Never expose AI reference placeholders as archive questions.
    plan.base = planMock(plan.archive, { ...options, mockType: 'pyq' }).base;
    warnings.push('AI generation is temporarily unavailable. This paper contains archived questions only.');
  }
  const mock = combineMock(plan.base, generated, mockType);
  if (generated.length && (!mock.exactMarks || mock.questions.some((item) =>
    plan.templates.some((slot) => slot.archiveQuestionId && String(slot._id) === item._id)))) {
    throw generationError('MOCK_INTEGRITY', 'This paper could not be completed. Please try again.');
  }
  return { mock: { ...mock, generationMode: generated.length ? 'ai' : 'local',
    requestedMockType: mockType, requestedDifficulty: options.difficulty || 'balanced', warnings }, generated };
}

module.exports = { generatePracticeMock, planMock };
