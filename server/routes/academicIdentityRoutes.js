const express = require('express');
const User = require('../models/User');
const UserRating = require('../models/UserRating');
const UserTopicMastery = require('../models/UserTopicMastery');
const PracticeSession = require('../models/PracticeSession');
const { tierForRating } = require('../services/ratingService');
const { learningStreak } = require('../services/learningDashboardService');
const { getContributorProfile } = require('../services/contributorProfileService');
const { normalizeBranch } = require('../utils/branches');

const router = express.Router();

router.get('/leaderboard', async (req, res) => {
  try {
    const type = String(req.query.type || 'rating');
    const subjectCode = String(req.query.subjectCode || '').trim().toUpperCase();
    const userQuery = { academicProfilePublic: true, role: { $ne: 'admin' } };
    if (req.query.semester) userQuery.semester = Number(req.query.semester);
    if (req.query.branch) {
      const branch = normalizeBranch(req.query.branch);
      if (!branch) return res.status(400).json({ error: 'Choose a valid branch.' });
      userQuery.branch = branch;
    }
    const users = await User.find(userQuery).select('_id username displayName avatar semester branch').lean();
    const allowedIds = users.map((user) => user._id);
    const ratings = await UserRating.find({ userId: { $in: allowedIds }, public: true, ratedCount: { $gte: type === 'growth' ? 1 : 20 } }).sort(type === 'growth' ? { weeklyDelta: -1, globalRating: -1 } : { globalRating: -1 }).limit(100).lean();
    const byUser = new Map(users.map((user) => [String(user._id), user]));
    const rows = ratings.map((rating) => {
      const user = byUser.get(String(rating.userId));
      const subject = subjectCode ? rating.subjectRatings?.find((item) => item.subjectCode === subjectCode) : null;
      return { username: user?.username, name: user?.displayName || user?.username, avatar: user?.avatar || '', semester: user?.semester, branch: user?.branch, rating: subject?.rating || rating.globalRating, ratedCount: subject?.ratedCount || rating.ratedCount, weeklyDelta: subject?.weeklyDelta || rating.weeklyDelta, provisional: (subject?.ratedCount || rating.ratedCount) < 20, tier: tierForRating(subject?.rating || rating.globalRating) };
    }).filter((row) => row.username && (!subjectCode || row.ratedCount > 0)).sort((a, b) => type === 'growth' ? b.weeklyDelta - a.weeklyDelta : b.rating - a.rating).slice(0, 50).map((row, index) => ({ ...row, rank: index + 1 }));
    return res.json({ type, subjectCode, minimumRatedQuestions: 20, rows });
  } catch (error) { console.error('Academic leaderboard failed:', error); return res.status(500).json({ error: 'Could not load academic rankings.' }); }
});

router.get('/profile/:username', async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username, academicProfilePublic: true, role: { $ne: 'admin' } }).select('_id username displayName avatar semester branch').lean();
    if (!user) return res.status(404).json({ error: 'Academic profile is private or unavailable.' });
    const [rating, mastery, sessions, contribution] = await Promise.all([
      UserRating.findOne({ userId: user._id, public: true }).lean(),
      UserTopicMastery.find({ userId: user._id }).select('subjectCode topicName masteryScore masteryConfidence status').sort({ masteryScore: -1 }).limit(50).lean(),
      PracticeSession.find({ userId: user._id, completedAt: { $ne: null } }).select('completedAt result').sort({ completedAt: -1 }).limit(400).lean(),
      getContributorProfile(user._id),
    ]);
    const snapshot = rating || { globalRating: 1000, ratedCount: 0, provisional: true, subjectRatings: [] };
    return res.json({
      user, rating: { ...snapshot, tier: tierForRating(snapshot.globalRating) },
      subjectRatings: snapshot.subjectRatings || [],
      masteredTopics: mastery.filter((item) => item.status === 'STRONG').length,
      masteryOverview: mastery.slice(0, 12),
      verifiedPracticeCount: snapshot.ratedCount || 0,
      streak: learningStreak(sessions.filter((item) => Number(item.result?.attempted || 0) >= 3).map((item) => item.completedAt)),
      communityReputation: contribution?.xp || 0,
      badges: [],
    });
  } catch (error) { return res.status(500).json({ error: 'Could not load academic profile.' }); }
});

module.exports = router;
