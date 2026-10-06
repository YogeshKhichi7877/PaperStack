const Question = require('../models/Question');
const { normalizeText, questionSimilarity } = require('./pyqIntelligenceService');
const { browserQuestion } = require('./questionBrowserService');

function canonicalQuestion(value = '') {
  return normalizeText(value).replace(/\bmid point\b/g, 'midpoint').replace(/\bfeed forward\b/g, 'feedforward');
}

function topicOverlap(left = {}, right = {}) {
  const a = new Set([left.primaryTopic, ...(left.topics || [])].map(normalizeText).filter(Boolean));
  const b = new Set([right.primaryTopic, ...(right.topics || [])].map(normalizeText).filter(Boolean));
  return [...a].some((topic) => b.has(topic));
}

function relatedScore(base, candidate) {
  const semantic = questionSimilarity(
    { ...base, questionText: canonicalQuestion(base.questionText) },
    { ...candidate, questionText: canonicalQuestion(candidate.questionText) }
  );
  const sameTopic = topicOverlap(base, candidate);
  const sameType = Boolean(base.questionType && base.questionType !== 'unknown' && base.questionType === candidate.questionType);
  const sameMarks = base.marks != null && Number(base.marks) === Number(candidate.marks);
  const differentYear = base.year && candidate.year && Number(base.year) !== Number(candidate.year);
  return Math.min(1, semantic * 0.78 + (sameTopic ? 0.12 : 0) + (sameType ? 0.04 : 0) + (sameMarks ? 0.03 : 0) + (differentYear ? 0.03 : 0));
}

function rankRelatedQuestions(base, candidates = [], limit = 6) {
  const baseNormalized = canonicalQuestion(base.questionText);
  return candidates
    .filter((candidate) => String(candidate._id) !== String(base._id))
    .filter((candidate) => canonicalQuestion(candidate.questionText) !== baseNormalized)
    .map((candidate) => ({ ...candidate, similarity: Math.round(relatedScore(base, candidate) * 1000) / 10 }))
    .filter((candidate) => candidate.similarity >= 18)
    .sort((a, b) => b.similarity - a.similarity || Number(b.year || 0) - Number(a.year || 0) || String(a._id).localeCompare(String(b._id)))
    .slice(0, Math.max(1, Math.min(10, Number(limit) || 6)));
}

async function findRelatedQuestions(question, { limit = 6, Model = Question } = {}) {
  const subjectFilter = question.subjectCode
    ? { subjectCode: question.subjectCode }
    : { subjectKey: question.subjectKey };
  const candidates = await Model.find({
    ...subjectFilter,
    _id: { $ne: question._id },
    status: { $ne: 'rejected' }, needsReview: { $ne: true },
  }).sort({ year: -1, sequence: 1 }).limit(220).populate('paperId', '_id title filePath solutionPath').lean();
  return rankRelatedQuestions(question, candidates, limit).map(browserQuestion);
}

function buildMiniPracticeSet(base, candidates = [], limit = 5) {
  const related = rankRelatedQuestions(base, candidates, limit * 3);
  const seenYears = new Set();
  const diverse = [];
  for (const item of related) {
    const yearKey = String(item.year || 'unknown');
    if (!seenYears.has(yearKey) || diverse.length >= Math.ceil(limit / 2)) {
      diverse.push(item);
      seenYears.add(yearKey);
    }
    if (diverse.length >= limit) break;
  }
  if (diverse.length < limit) {
    for (const item of related) {
      if (!diverse.some((existing) => String(existing._id) === String(item._id))) diverse.push(item);
      if (diverse.length >= limit) break;
    }
  }
  return diverse.slice(0, limit);
}

module.exports = { buildMiniPracticeSet, findRelatedQuestions, rankRelatedQuestions, relatedScore, topicOverlap };
