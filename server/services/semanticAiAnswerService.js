const crypto = require('node:crypto');

const AiAnswerCache = require('../models/AiAnswerCache');
const AiAnswerFeedback = require('../models/AiAnswerFeedback');
const { questionSimilarity } = require('./pyqIntelligenceService');

const REUSABLE_TASKS = new Set(['QUESTION_TUTOR']);
const REUSABLE_MODES = new Set(['explain', 'solution', 'hint', 'concepts', 'formula', 'structure', 'general']);

function normalizeAcademicRequest(value = '') {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\b(please|can you|could you|would you)\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\bmid point\b/g, 'midpoint')
    .replace(/\bfeed forward\b/g, 'feedforward')
    .trim();
}

function exactRequestHash({ task, mode, subjectCode, request }) {
  return crypto.createHash('sha256').update([
    String(task || '').toUpperCase(),
    String(mode || '').toLowerCase(),
    String(subjectCode || '').toUpperCase(),
    normalizeAcademicRequest(request),
  ].join('|')).digest('hex');
}

function reusableAcademicRequest({ task, mode, personalized = false }) {
  return !personalized && REUSABLE_TASKS.has(String(task || '').toUpperCase()) &&
    REUSABLE_MODES.has(String(mode || '').toLowerCase());
}

function answerReusable(entry, { semantic = false } = {}) {
  if (!entry || ['stale', 'needs_review'].includes(entry.status)) return false;
  if (Number(entry.negativeCount || 0) > Math.max(1, Number(entry.helpfulCount || 0))) return false;
  return semantic ? ['verified', 'helpful'].includes(entry.status) : true;
}

function semanticScore(request, candidate) {
  return questionSimilarity(
    { questionText: normalizeAcademicRequest(request) },
    { questionText: normalizeAcademicRequest(candidate) }
  );
}

function semanticReuseThreshold(env = process.env) {
  const value = Number(env.AI_SEMANTIC_CACHE_THRESHOLD || 0.88);
  return Math.max(0.82, Math.min(0.98, Number.isFinite(value) ? value : 0.88));
}

async function findReusableAnswer(input, dependencies = {}) {
  if (!reusableAcademicRequest(input)) return null;
  const Model = dependencies.Model || AiAnswerCache;
  const exactHash = exactRequestHash(input);
  const promptVersion = input.promptVersion || 'question-tutor-v3';
  const exact = await Model.findOne({ exactHash, contentVersion: input.contentVersion, promptVersion }).lean();

  if (answerReusable(exact)) {
    await Model.updateOne({ _id: exact._id }, { $inc: { exactHits: 1 }, $set: { lastUsedAt: new Date() } });
    return { entry: exact, matchType: 'exact', similarity: 1 };
  }

  const candidates = await Model.find({
    subjectCode: String(input.subjectCode || '').toUpperCase(),
    mode: String(input.mode || '').toLowerCase(),
    contentVersion: input.contentVersion,
    promptVersion,
    status: { $in: ['verified', 'helpful'] },
  }).sort({ helpfulCount: -1, lastUsedAt: -1 }).limit(40).lean();

  const ranked = candidates
    .map((entry) => ({ entry, similarity: semanticScore(input.request, entry.normalizedRequest) }))
    .filter(({ entry, similarity }) => similarity >= semanticReuseThreshold() && answerReusable(entry, { semantic: true }))
    .sort((a, b) => b.similarity - a.similarity || Number(b.entry.helpfulCount || 0) - Number(a.entry.helpfulCount || 0));

  if (!ranked.length) return null;
  await Model.updateOne({ _id: ranked[0].entry._id }, { $inc: { semanticHits: 1 }, $set: { lastUsedAt: new Date() } });
  return { ...ranked[0], matchType: 'semantic' };
}

async function storeReusableAnswer(input, dependencies = {}) {
  if (!reusableAcademicRequest(input) || !String(input.answer || '').trim()) return null;
  const Model = dependencies.Model || AiAnswerCache;
  const normalizedRequest = normalizeAcademicRequest(input.request);
  const exactHash = exactRequestHash(input);
  const answer = String(input.answer).trim();
  return Model.findOneAndUpdate(
    { exactHash, contentVersion: input.contentVersion, promptVersion: input.promptVersion || 'question-tutor-v3' },
    {
      $setOnInsert: {
        exactHash,
        normalizedRequest,
        task: String(input.task || '').toUpperCase(),
        mode: String(input.mode || '').toLowerCase(),
        subjectCode: String(input.subjectCode || '').toUpperCase(),
        questionId: input.questionId || null,
        topics: input.topics || [],
        contentVersion: input.contentVersion,
        promptVersion: input.promptVersion || 'question-tutor-v3',
        answer,
        answerHash: crypto.createHash('sha256').update(answer).digest('hex'),
        provider: input.provider || '',
        model: input.model || '',
        status: ['verified', 'helpful'].includes(input.status) ? input.status : 'generated',
      },
      $set: { lastUsedAt: new Date() },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();
}

async function recordAnswerFeedback({ userId, answerId, value, reason = '' }, dependencies = {}) {
  const Cache = dependencies.Cache || AiAnswerCache;
  const Feedback = dependencies.Feedback || AiAnswerFeedback;
  const answer = await Cache.findById(answerId);
  if (!answer) {
    const error = new Error('AI answer not found');
    error.statusCode = 404;
    throw error;
  }

  const existing = await Feedback.findOne({ userId, answerId }).lean();
  await Feedback.findOneAndUpdate(
    { userId, answerId },
    { $set: { value, reason } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  const inc = { helpfulCount: 0, negativeCount: 0 };
  if (existing?.value === 'helpful') inc.helpfulCount -= 1;
  if (existing?.value === 'not_helpful') inc.negativeCount -= 1;
  if (value === 'helpful') inc.helpfulCount += 1;
  if (value === 'not_helpful') inc.negativeCount += 1;
  await Cache.updateOne({ _id: answerId }, { $inc: inc });

  const updated = await Cache.findById(answerId).lean();
  const nextStatus = Number(updated.negativeCount || 0) >= 2 && Number(updated.negativeCount || 0) > Number(updated.helpfulCount || 0)
    ? 'needs_review'
    : Number(updated.helpfulCount || 0) >= 2 ? 'helpful' : updated.status;
  if (nextStatus !== updated.status) await Cache.updateOne({ _id: answerId }, { $set: { status: nextStatus } });
  return { value, reason, status: nextStatus };
}

async function invalidateQuestionAnswers(questionIds, dependencies = {}) {
  const Model = dependencies.Model || AiAnswerCache;
  const ids = (Array.isArray(questionIds) ? questionIds : [questionIds]).filter(Boolean);
  if (!ids.length) return { modifiedCount: 0 };
  return Model.updateMany({ questionId: { $in: ids }, status: { $ne: 'stale' } }, { $set: { status: 'stale' } });
}

module.exports = {
  answerReusable,
  exactRequestHash,
  findReusableAnswer,
  invalidateQuestionAnswers,
  normalizeAcademicRequest,
  recordAnswerFeedback,
  reusableAcademicRequest,
  semanticScore,
  semanticReuseThreshold,
  storeReusableAnswer,
};
