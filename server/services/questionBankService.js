const crypto = require('node:crypto');
const Question = require('../models/Question');
const { enqueueJob } = require('./backgroundJobService');
const { aiAvailable, generateForTask } = require('./aiService');
const { parseAiJson, practiceQuestionSchema } = require('./aiSchemas');
const { hashQuestionText, normalizeQuestionText } = require('./questionService');

function defaultQuestionRating(difficulty) {
  return difficulty === 'easy' ? 900 : difficulty === 'hard' ? 1300 : 1100;
}

async function generateQuestionInventory({ subject, topics, count = 15 }, dependencies = {}) {
  const Model = dependencies.QuestionModel || Question;
  if (!topics.length || !aiAvailable(dependencies.env || process.env, 'PRACTICE_QUESTION_GENERATION')) return { created: 0, reason: 'AI unavailable' };
  const requested = Math.max(5, Math.min(30, Number(count) || 15));
  const prompt = [
    'Create reusable university practice questions for the supplied canonical topics.',
    'Use only the exact topicKey values supplied. Produce a balanced easy/medium/hard mix.',
    'Prefer MCQ, conceptual, short_answer, scenario and numerical questions as appropriate.',
    'For MCQ provide 4 options and answerKey must exactly equal one option.',
    'Do not copy a previous-year question verbatim. Return JSON only.',
    `Subject: ${subject.name} (${subject.code})`,
    `Topics: ${JSON.stringify(topics.map(({ topicKey, name }) => ({ topicKey, name })))}`,
    `Count: ${requested}`,
    '{"questions":[{"questionText":"...","difficulty":"easy|medium|hard","questionType":"mcq|conceptual|short_answer|scenario|numerical","topicKey":"...","options":["..."],"answerKey":"...","marks":2}]}',
  ].join('\n');
  const text = await generateForTask('PRACTICE_QUESTION_GENERATION', prompt, {
    temperature: 0.45,
    maxOutputTokens: 7000,
    json: true,
    validateResponse: (value) => parseAiJson(value, practiceQuestionSchema),
  }, dependencies);
  const payload = parseAiJson(text, practiceQuestionSchema);
  const allowed = new Map(topics.map((topic) => [topic.topicKey, topic]));
  const existing = await Model.find({ subjectCode: subject.code, status: { $ne: 'rejected' } }).select('normalizedText textHash').limit(2000).lean();
  const seen = new Set(existing.map((item) => item.textHash || hashQuestionText(item.normalizedText || '')));
  const documents = [];
  for (const item of payload.questions) {
    const canonical = allowed.get(item.topicKey);
    const normalizedText = normalizeQuestionText(item.questionText);
    const textHash = hashQuestionText(normalizedText);
    if (!canonical || seen.has(textHash)) continue;
    if (item.questionType === 'mcq' && (!(item.options || []).includes(item.answerKey) || item.options.length < 3)) continue;
    seen.add(textHash);
    const id = crypto.randomUUID();
    documents.push({
      paperId: null,
      questionKey: `generated-${id}`,
      questionNumber: `PS-${id.slice(0, 8)}`,
      questionLabel: 'PaperStack Practice',
      sequence: 1,
      questionText: item.questionText,
      normalizedText,
      textHash,
      rawText: item.questionText,
      marks: item.marks,
      questionType: item.questionType,
      difficulty: item.difficulty,
      primaryTopic: canonical.name,
      topics: [canonical.name],
      topicKeys: [canonical.topicKey],
      subjectKey: subject.key || subject.code,
      subject: subject.name,
      subjectCode: subject.code,
      shortCode: subject.shortCode || '',
      sourceType: 'PAPERSTACK_GENERATED',
      generatedByAI: true,
      ratingEligible: false,
      questionRating: defaultQuestionRating(item.difficulty),
      options: item.options || [],
      answerKey: item.answerKey,
      extraction: { source: 'ai', confidence: 80, version: 'practice-bank-u4-v1' },
      status: 'reviewed',
      needsReview: false,
    });
  }
  if (!documents.length) return { created: 0, reason: 'No valid unique questions' };
  const result = await Model.insertMany(documents, { ordered: false });
  return { created: result.length };
}

function enqueueQuestionBankRefill({ subject, topics, count = 15 }, dependencies = {}) {
  const dedupeKey = `practice-refill:${subject.code}:${topics.map((item) => item.topicKey).sort().join(',')}`;
  return enqueueJob('practice-question-refill', () => generateQuestionInventory({ subject, topics, count }, dependencies), {
    queue: 'practice-question-generation', concurrency: 1, dedupeKey,
  });
}

module.exports = { defaultQuestionRating, enqueueQuestionBankRefill, generateQuestionInventory };
