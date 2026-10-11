const DailyLearningCheckin = require('../models/DailyLearningCheckin');
const PracticeSession = require('../models/PracticeSession');
const QuestionAttempt = require('../models/QuestionAttempt');
const UserTopicMastery = require('../models/UserTopicMastery');
const UserRating = require('../models/UserRating');
const UserNote = require('../models/UserNote');
const RatingEvent = require('../models/RatingEvent');
const { weakTopicScore } = require('./masteryService');
const { tierForRating } = require('./ratingService');

function indiaDayKey(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

function learningStreak(completedDates, today = new Date()) {
  const days = new Set(completedDates.map(indiaDayKey));
  let current = 0;
  const cursor = new Date(today);
  if (!days.has(indiaDayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(indiaDayKey(cursor))) {
    current += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  let longest = 0;
  let run = 0;
  let previous = null;
  for (const key of [...days].sort()) {
    const date = new Date(`${key}T00:00:00+05:30`);
    run = previous && Math.round((date - previous) / 86400000) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }
  return { current, longest, activeDays: days.size };
}

function badgesFor({ streak, rating, mastery, attemptCount }) {
  const badges = [];
  if (streak.current >= 7) badges.push({ key: '7-day-learner', name: '7 Day Learner' });
  if (streak.current >= 30) badges.push({ key: '30-day-consistency', name: '30 Day Consistency' });
  if (attemptCount >= 100) badges.push({ key: '100-verified-questions', name: '100 Practice Questions' });
  if (mastery.length && mastery.every((item) => item.masteryScore >= 45)) badges.push({ key: 'zero-weak-topics', name: 'Zero Weak Topics' });
  for (const item of mastery.filter((row) => row.masteryScore >= 80 && row.masteryConfidence >= 0.55).slice(0, 3)) {
    badges.push({ key: `specialist-${item.topicKey}`, name: `${item.topicName} Specialist` });
  }
  if (Number(rating.globalRating || 1000) >= 1500) badges.push({ key: 'paperstack-expert', name: 'PaperStack Expert' });
  return badges;
}

async function getLearningDashboard(userId, dependencies = {}) {
  const now = new Date();
  const today = indiaDayKey(now);
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  const [mastery, rating, checkins, sessions, notes, openDoubts, attemptsToday, attemptCount, weeklyAttempts, weeklyRatingEvents] = await Promise.all([
    (dependencies.MasteryModel || UserTopicMastery).find({ userId }).sort({ masteryScore: 1, updatedAt: -1 }).limit(200).lean(),
    (dependencies.RatingModel || UserRating).findOne({ userId }).lean(),
    DailyLearningCheckin.find({ userId }).sort({ createdAt: -1 }).limit(120).lean(),
    PracticeSession.find({ userId }).sort({ updatedAt: -1 }).limit(50).lean(),
    UserNote.find({ userId }).sort({ createdAt: -1 }).limit(8).lean(),
    UserNote.find({ userId, type: 'DOUBT', status: { $ne: 'RESOLVED' } }).sort({ createdAt: -1 }).limit(50).lean(),
    QuestionAttempt.find({ userId, createdAt: { $gte: new Date(`${today}T00:00:00+05:30`) } }).countDocuments(),
    QuestionAttempt.countDocuments({ userId }),
    QuestionAttempt.find({ userId, createdAt: { $gte: weekStart } }).select('createdAt actualScore topicKeys').lean(),
    RatingEvent.find({ userId, createdAt: { $gte: weekStart } }).select('delta').lean(),
  ]);
  const completedDates = sessions.filter((session) => session.completedAt && Number(session.result?.attempted || 0) >= 3).map((session) => session.completedAt);
  const streak = learningStreak(completedDates, now);
  const weakTopics = mastery.map((item) => ({ ...item, ...weakTopicScore(item, now) }))
    .filter((item) => item.status === 'WEAK' || item.status === 'IMPROVING' || item.nextReviewAt && new Date(item.nextReviewAt) <= now)
    .sort((a, b) => b.priority - a.priority).slice(0, 8)
    .map((item) => ({ ...item, reason: item.overdueDays > 0 ? `Review is ${item.overdueDays} day${item.overdueDays === 1 ? '' : 's'} overdue.` : `Recent accuracy is ${item.recentAccuracy}% with ${Math.round(item.masteryConfidence * 100)}% evidence confidence.` }));
  const dueReviews = mastery.filter((item) => item.nextReviewAt && new Date(item.nextReviewAt) <= now).sort((a, b) => new Date(a.nextReviewAt) - new Date(b.nextReviewAt)).slice(0, 8);
  const incompleteSession = sessions.find((session) => !session.completedAt) || null;
  const ratingSnapshot = rating || { globalRating: 1000, ratedCount: 0, weeklyDelta: 0, provisional: true, subjectRatings: [] };
  const tier = tierForRating(ratingSnapshot.globalRating);
  const nextTier = [[900, 'Learner'], [1100, 'Explorer'], [1300, 'Specialist'], [1500, 'Expert'], [1700, 'Master'], [1900, 'Grand Scholar']].find(([minimum]) => minimum > ratingSnapshot.globalRating);
  const taughtByTopic = new Map();
  for (const checkin of checkins) for (const topic of checkin.topics || []) taughtByTopic.set(topic.topicKey, { topicKey: topic.topicKey, topicName: topic.name, subjectCode: checkin.subjectCode, subjectName: checkin.subjectName, taughtAt: checkin.createdAt });
  const masteryByTopic = new Map(mastery.map((item) => [item.topicKey, item]));
  const coverageTopics = [...taughtByTopic.values()].map((topic) => {
    const evidence = masteryByTopic.get(topic.topicKey);
    return { ...topic, classStatus: 'TAUGHT', learningStatus: !evidence?.totalAttempts ? 'TAUGHT' : evidence.masteryScore >= 80 && evidence.masteryConfidence >= 0.55 ? 'MASTERED' : evidence.masteryScore >= 55 ? 'IMPROVING' : 'PRACTICED', masteryScore: evidence?.masteryScore ?? null, masteryConfidence: evidence?.masteryConfidence ?? 0 };
  });
  const courseCoverage = Object.values(coverageTopics.reduce((groups, topic) => {
    const key = topic.subjectCode;
    if (!groups[key]) groups[key] = { subjectCode: key, subjectName: topic.subjectName, taughtCount: 0, practicedCount: 0, masteredCount: 0, topics: [] };
    groups[key].topics.push(topic); groups[key].taughtCount += 1;
    if (topic.learningStatus !== 'TAUGHT') groups[key].practicedCount += 1;
    if (topic.learningStatus === 'MASTERED') groups[key].masteredCount += 1;
    return groups;
  }, {}));
  const weekCheckins = checkins.filter((item) => new Date(item.createdAt) >= weekStart);
  const improvements = mastery.map((item) => {
    const recent = (item.performanceHistory || []).filter((entry) => new Date(entry.at) >= weekStart);
    return { topicKey: item.topicKey, topicName: item.topicName, gain: recent.length >= 2 ? Math.round((recent[recent.length - 1].score - recent[0].score) * 100) : 0 };
  }).sort((a, b) => b.gain - a.gain);
  const reviewSessions = sessions.filter((item) => item.mode === 'REVIEW' && new Date(item.updatedAt) >= weekStart);
  return {
    today,
    dailyGoal: { attempted: attemptsToday, target: 6, complete: attemptsToday >= 6 },
    rating: { ...ratingSnapshot, tier, nextTier: nextTier ? { name: nextTier[1], pointsAway: nextTier[0] - ratingSnapshot.globalRating } : null },
    mastery,
    weakTopics,
    dueReviews,
    incompleteSession,
    recentCheckins: checkins.slice(0, 10),
    recentNotes: notes,
    openDoubts,
    courseCoverage,
    weeklyReview: {
      topicsLearned: new Set(weekCheckins.flatMap((item) => (item.topics || []).map((topic) => topic.topicKey))).size,
      questionsPracticed: weeklyAttempts.length,
      reviewsCompleted: reviewSessions.filter((item) => item.completedAt).length,
      reviewsStarted: reviewSessions.length,
      mostImproved: improvements.find((item) => item.gain > 0) || null,
      needsAttention: weakTopics[0] || null,
      ratingDelta: weeklyRatingEvents.reduce((sum, item) => sum + Number(item.delta || 0), 0),
    },
    streak,
    badges: badgesFor({ streak, rating: ratingSnapshot, mastery, attemptCount }),
    overallMastery: mastery.length ? Math.round(mastery.reduce((sum, item) => sum + item.masteryScore * Math.max(0.2, item.masteryConfidence), 0) / mastery.reduce((sum, item) => sum + Math.max(0.2, item.masteryConfidence), 0)) : null,
  };
}

module.exports = { badgesFor, getLearningDashboard, indiaDayKey, learningStreak };
