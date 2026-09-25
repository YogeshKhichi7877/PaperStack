const Contribution = require('../models/Contribution');
const Paper = require('../models/Paper');
const User = require('../models/User');
const PaperRequest = require('../models/PaperRequest');
const {
  XP_RULES,
  calculateContributorXp,
  getContributorBadges,
  compareContributorProfiles,
  getNextXpMilestone,
} = require('../utils/contributorXp');

function normalizeRequestPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function buildRequestKey(source = {}) {
  return [
    normalizeRequestPart(source.branch || 'CSE'),
    `sem${Number(source.semester) || ''}`,
    normalizeRequestPart(source.subjectCode || source.shortCode || source.subject),
    Number(source.year) || '',
    normalizeRequestPart(source.examType),
  ].join('-');
}

function stringId(value) {
  return value ? String(value) : '';
}

function publicRecentContribution(contribution, paper) {
  return {
    contributionId: stringId(contribution._id),
    paperId: stringId(paper?._id || contribution.approvedPaperId),
    title: contribution.title || paper?.title || 'Question Paper',
    subject: contribution.subject || paper?.subject || '',
    subjectCode: contribution.subjectCode || paper?.subjectCode || '',
    branch: contribution.branch || paper?.branch || '',
    semester: Number(contribution.semester || paper?.semester) || null,
    year: Number(contribution.year || paper?.year) || null,
    examType: contribution.examType || paper?.examType || '',
    hasSolution: Boolean(contribution.solutionUrl || paper?.solutionPath),
    views: Number(paper?.views || 0),
    downloads: Number(paper?.downloads || 0),
    approvedAt: contribution.approvedAt || paper?.approvedAt || paper?.createdAt || contribution.updatedAt,
  };
}

async function buildContributorProfiles() {
  const contributions = await Contribution.find({ status: 'approved' })
    .sort({ approvedAt: -1, createdAt: -1 })
    .lean();

  if (!contributions.length) return [];

  const userIds = Array.from(new Set(contributions.map((item) => stringId(item.contributorUserId)).filter(Boolean)));
  const approvedPaperIds = Array.from(new Set(contributions.map((item) => stringId(item.approvedPaperId)).filter(Boolean)));
  const contributionIds = contributions.map((item) => item._id);

  const [users, papers] = await Promise.all([
    userIds.length
      ? User.find({ _id: { $in: userIds } }).select('username avatar semester currentSemester').lean()
      : [],
    Paper.find({
      $or: [
        ...(approvedPaperIds.length ? [{ _id: { $in: approvedPaperIds } }] : []),
        { contributionId: { $in: contributionIds } },
      ],
    })
      .select('title subject subjectCode branch semester year examType views downloads solutionPath approvedAt createdAt contributionId contributorUserId')
      .lean(),
  ]);

  const userMap = new Map(users.map((user) => [stringId(user._id), user]));
  const paperById = new Map(papers.map((paper) => [stringId(paper._id), paper]));
  const paperByContribution = new Map(
    papers.filter((paper) => paper.contributionId).map((paper) => [stringId(paper.contributionId), paper])
  );

  const requestKeys = Array.from(new Set(contributions.map(buildRequestKey).filter(Boolean)));
  const fulfilledRequests = requestKeys.length
    ? await PaperRequest.find({ requestKey: { $in: requestKeys }, status: 'fulfilled' })
      .select('requestKey requestCount')
      .lean()
    : [];
  const fulfilledRequestMap = new Map(fulfilledRequests.map((request) => [request.requestKey, request]));

  const grouped = new Map();

  contributions.forEach((contribution) => {
    const userId = stringId(contribution.contributorUserId);
    if (!userId) return;

    const user = userMap.get(userId);
    if (!grouped.has(userId)) {
      grouped.set(userId, {
        userId,
        name: user?.username || contribution.contributorName || 'Contributor',
        avatar: user?.avatar || '',
        semester: user?.semester ?? user?.currentSemester ?? null,
        approvedPapers: 0,
        approvedSolutions: 0,
        fulfilledRequests: 0,
        requestDemandServed: 0,
        impactViews: 0,
        impactDownloads: 0,
        recentContributions: [],
      });
    }

    const profile = grouped.get(userId);
    const paper = paperById.get(stringId(contribution.approvedPaperId)) || paperByContribution.get(stringId(contribution._id));
    const fulfilledRequest = fulfilledRequestMap.get(buildRequestKey(contribution));

    profile.approvedPapers += 1;
    if (contribution.solutionUrl || paper?.solutionPath) profile.approvedSolutions += 1;
    if (fulfilledRequest) {
      profile.fulfilledRequests += 1;
      profile.requestDemandServed += Number(fulfilledRequest.requestCount || 0);
    }

    profile.impactViews += Number(paper?.views || 0);
    profile.impactDownloads += Number(paper?.downloads || 0);
    profile.recentContributions.push(publicRecentContribution(contribution, paper));
  });

  const profiles = Array.from(grouped.values()).map((profile) => ({
    ...profile,
    xp: calculateContributorXp(profile),
    totalImpact: Number(profile.impactViews || 0) + Number(profile.impactDownloads || 0),
  }));

  profiles.sort(compareContributorProfiles);

  return profiles.map((profile, index) => {
    const ranked = {
      ...profile,
      rank: index + 1,
      recentContributions: profile.recentContributions
        .sort((a, b) => new Date(b.approvedAt || 0) - new Date(a.approvedAt || 0))
        .slice(0, 12),
    };

    return {
      ...ranked,
      badges: getContributorBadges(ranked),
      nextXpMilestone: getNextXpMilestone(ranked.xp),
    };
  });
}

function toLeaderboardItem(profile) {
  return {
    userId: profile.userId,
    name: profile.name,
    avatar: profile.avatar,
    semester: profile.semester,
    rank: profile.rank,
    xp: profile.xp,
    totalPoints: profile.xp,
    points: profile.xp,
    approvedPapers: profile.approvedPapers,
    approvedCount: profile.approvedPapers,
    approvedSolutions: profile.approvedSolutions,
    solutionCount: profile.approvedSolutions,
    fulfilledRequests: profile.fulfilledRequests,
    requestDemandServed: profile.requestDemandServed,
    impactViews: profile.impactViews,
    impactDownloads: profile.impactDownloads,
    totalImpact: profile.totalImpact,
    badges: profile.badges,
    badge: profile.badges?.[0] || 'New Contributor',
  };
}

async function getContributorsLeaderboard() {
  const profiles = await buildContributorProfiles();
  return profiles.map(toLeaderboardItem);
}

async function getContributorProfile(contributorId) {
  const profiles = await buildContributorProfiles();
  return profiles.find((profile) => profile.userId === String(contributorId)) || null;
}

async function getOwnContributorProfile(userId) {
  const profile = await getContributorProfile(userId);
  const user = await User.findById(userId).select('username avatar semester currentSemester').lean();
  if (!user) return null;

  const statusCounts = await Contribution.aggregate([
    { $match: { contributorUserId: user._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const privateStats = Object.fromEntries(statusCounts.map((item) => [item._id, item.count]));

  if (profile) {
    return {
      ...profile,
      isOwnProfile: true,
      privateStats: {
        pending: Number(privateStats.pending || 0),
        needsCorrection: Number(privateStats.needs_correction || 0),
        rejected: Number(privateStats.rejected || 0),
        duplicate: Number(privateStats.duplicate || 0),
      },
    };
  }

  const empty = {
    userId: stringId(user._id),
    name: user.username || 'Contributor',
    avatar: user.avatar || '',
    semester: user.semester ?? user.currentSemester ?? null,
    rank: null,
    xp: 0,
    totalImpact: 0,
    approvedPapers: 0,
    approvedSolutions: 0,
    fulfilledRequests: 0,
    requestDemandServed: 0,
    impactViews: 0,
    impactDownloads: 0,
    badges: [],
    recentContributions: [],
    nextXpMilestone: 100,
  };

  return {
    ...empty,
    isOwnProfile: true,
    privateStats: {
      pending: Number(privateStats.pending || 0),
      needsCorrection: Number(privateStats.needs_correction || 0),
      rejected: Number(privateStats.rejected || 0),
      duplicate: Number(privateStats.duplicate || 0),
    },
  };
}

function getXpRules() {
  return {
    rules: XP_RULES,
    labels: {
      APPROVED_PAPER: 'Approved question paper',
      APPROVED_SOLUTION: 'Solution included',
      FULFILLED_REQUEST: 'Requested/missing paper fulfilled',
    },
  };
}

module.exports = {
  buildContributorProfiles,
  getContributorsLeaderboard,
  getContributorProfile,
  getOwnContributorProfile,
  getXpRules,
};
