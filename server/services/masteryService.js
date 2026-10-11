const UserTopicMastery = require('../models/UserTopicMastery');

const DIFFICULTY_WEIGHT = { unknown: 1, easy: 0.8, medium: 1, hard: 1.25 };
const REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60, 90];

function masteryStatus(score, confidence, attempts) {
  if (!attempts) return 'NOT_PRACTICED';
  if (score >= 80 && confidence >= 0.55) return 'STRONG';
  if (score >= 65) return 'GOOD';
  if (score >= 45) return 'IMPROVING';
  return 'WEAK';
}

function calculateMastery(previous = {}, attempt = {}) {
  const actual = Math.max(0, Math.min(1, Number(attempt.actualScore) || 0));
  const difficulty = DIFFICULTY_WEIGHT[attempt.difficulty] || 1;
  const firstAttempt = attempt.firstAttempt !== false;
  const repeatWeight = firstAttempt ? 1 : 0.6;
  const hintWeight = Math.max(0.65, 1 - Math.min(5, Number(attempt.hintsUsed) || 0) * 0.08);
  const speedWeight = Number(attempt.timeSpentSeconds) > 0 && Number(attempt.timeSpentSeconds) < 5 ? 0.7 : 1;
  const evidence = difficulty * repeatWeight * hintWeight * speedWeight;
  const evidenceWeight = Number(previous.evidenceWeight || 0) + evidence;
  const weightedScore = Number(previous.weightedScore || 0) + actual * evidence;
  // A neutral two-question prior prevents one easy answer from becoming 100% mastery.
  const masteryScore = Math.round(((50 * 2) + (weightedScore * 100)) / (2 + evidenceWeight));
  const totalAttempts = Number(previous.totalAttempts || 0) + 1;
  const firstAttemptCount = Number(previous.firstAttemptCount || 0) + (firstAttempt ? 1 : 0);
  const evidenceConfidence = evidenceWeight / (evidenceWeight + 6);
  const coverageConfidence = 0.65 + 0.35 * Math.min(1, firstAttemptCount / 5);
  const masteryConfidence = Math.round(evidenceConfidence * coverageConfidence * 1000) / 1000;
  return {
    masteryScore,
    masteryConfidence,
    evidenceWeight,
    weightedScore,
    totalAttempts,
    firstAttemptCount,
    correctEquivalent: Number(previous.correctEquivalent || 0) + actual,
    status: masteryStatus(masteryScore, masteryConfidence, totalAttempts),
  };
}

function calculateReview(previous = {}, actualScore, now = new Date()) {
  const quality = Math.max(0, Math.min(1, Number(actualScore) || 0));
  let stage = Number(previous.reviewStage || 0);
  if (quality >= 0.8) stage = Math.min(REVIEW_INTERVALS.length - 1, stage + 1);
  else if (quality < 0.6) stage = 0;
  const intervalDays = quality < 0.6 ? 1 : REVIEW_INTERVALS[stage];
  return {
    reviewStage: stage,
    intervalDays,
    lastReviewedAt: now,
    nextReviewAt: new Date(now.getTime() + intervalDays * 86400000),
  };
}

async function applyAttemptToTopics(userId, question, attempt, dependencies = {}) {
  const Model = dependencies.MasteryModel || UserTopicMastery;
  const topicKeys = Array.isArray(attempt.topicKeys) ? attempt.topicKeys : [];
  const names = new Map((question.topicKeys || []).map((key, index) => [key, question.topics?.[index] || question.primaryTopic || key.split(':').slice(1).join(' ')]));
  const updates = [];
  for (const key of topicKeys) {
    const prior = await Model.findOne({ userId, topicKey: key }).lean();
    const mastery = calculateMastery(prior || {}, attempt);
    const review = calculateReview(prior || {}, attempt.actualScore);
    const history = [...(prior?.performanceHistory || []), { score: attempt.actualScore, difficulty: attempt.difficulty || 'unknown', at: new Date() }].slice(-20);
    const row = await Model.findOneAndUpdate({ userId, topicKey: key }, { $set: {
      subjectCode: attempt.subjectCode,
      subjectName: question.subject || '',
      topicName: names.get(key) || key,
      ...mastery,
      ...review,
      lastPracticedAt: new Date(),
      performanceHistory: history,
    }, $setOnInsert: { userId, topicKey: key } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean();
    updates.push(row);
  }
  return updates;
}

function weakTopicScore(mastery, now = new Date()) {
  const history = (mastery.performanceHistory || []).slice(-8);
  const recentError = history.length ? 1 - history.reduce((sum, item) => sum + Number(item.score || 0), 0) / history.length : 0.5;
  const overdueDays = mastery.nextReviewAt ? Math.max(0, (now - new Date(mastery.nextReviewAt)) / 86400000) : 0;
  const overdue = Math.min(1, overdueDays / 14);
  const priority = 0.45 * (100 - Number(mastery.masteryScore || 0)) + 25 * (1 - Number(mastery.masteryConfidence || 0)) + 20 * recentError + 10 * overdue;
  return { priority: Math.round(priority), recentAccuracy: Math.round((1 - recentError) * 100), overdueDays: Math.floor(overdueDays) };
}

module.exports = { applyAttemptToTopics, calculateMastery, calculateReview, masteryStatus, weakTopicScore };
