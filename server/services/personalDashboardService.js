const User = require('../models/User');
const Contribution = require('../models/Contribution');
const PaperRequest = require('../models/PaperRequest');
const PaperVerification = require('../models/PaperVerification');
const QuestionSolution = require('../models/QuestionSolution');
const SavedItem = require('../models/SavedItem');
const StudyProgress = require('../models/StudyProgress');

const {
  getOwnContributorProfile,
} = require('./contributorProfileService');

const {
  countByStatus,
  impactSummary,
  sanitizeBookmark,
  sanitizeRequest,
} = require('./personalDashboardMetrics');

function stringId(value) {
  return String(value?._id || value || '');
}

function publicContribution(contribution = {}) {
  return {
    _id: stringId(contribution),
    title: contribution.title || 'Contribution',
    subject: contribution.subject || '',
    subjectCode: contribution.subjectCode || '',
    branch: contribution.branch || '',
    semester: contribution.semester ?? null,
    year: contribution.year ?? null,
    examType: contribution.examType || '',
    status: contribution.status || '',
    adminNote: contribution.adminNote || '',
    approvedPaperId: stringId(contribution.approvedPaperId),
    createdAt: contribution.createdAt || null,
    updatedAt: contribution.updatedAt || null,
    approvedAt: contribution.approvedAt || null,
  };
}

function publicSolution(solution = {}) {
  const question =
    solution.questionId &&
    typeof solution.questionId === 'object'
      ? solution.questionId
      : null;

  return {
    _id: stringId(solution),
    status: solution.status || '',
    helpfulCount: Number(solution.helpfulCount || 0),
    createdAt: solution.createdAt || null,
    approvedAt: solution.approvedAt || null,
    question: question
      ? {
          _id: stringId(question),
          questionText: question.questionText || '',
          subject: question.subject || '',
          subjectCode: question.subjectCode || '',
          year: question.year ?? null,
          examType: question.examType || '',
        }
      : null,
  };
}

async function getPersonalDashboard(userId) {
  const user = await User.findById(userId)
    .select('username displayName email avatar authProvider semester currentSemester role bookmarks')
    .populate({
      path: 'bookmarks',
      select:
        'title subject subjectCode branch semester year examType filePath solutionPath views downloads',
    })
    .lean();

  if (!user) return null;

  const [
    contributionRows,
    solutionRows,
    verificationCount,
    requestTotal,
    requests,
    recentContributions,
    recentSolutions,
    contributorProfile,
    savedItems,
    studyProgress,
  ] = await Promise.all([
    Contribution.aggregate([
      {
        $match: {
          contributorUserId: user._id,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),

    QuestionSolution.aggregate([
      {
        $match: {
          authorUserId: user._id,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]),

    PaperVerification.countDocuments({
      userId: user._id,
    }),

    PaperRequest.countDocuments({
      $or: [
        { requestedBy: user._id },
        { 'requestedUsers.userId': user._id },
      ],
    }),

    PaperRequest.find({
      $or: [
        { requestedBy: user._id },
        { 'requestedUsers.userId': user._id },
      ],
    })
      .sort({
        updatedAt: -1,
        createdAt: -1,
      })
      .limit(10)
      .lean(),

    Contribution.find({
      contributorUserId: user._id,
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean(),

    QuestionSolution.find({
      authorUserId: user._id,
    })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate(
        'questionId',
        '_id questionText subject subjectCode year examType'
      )
      .lean(),

    getOwnContributorProfile(user._id),

    SavedItem.find({ userId: user._id })
      .sort({ updatedAt: -1 })
      .limit(20)
      .lean(),

    StudyProgress.find({ userId: user._id })
      .sort({ lastViewedAt: -1 })
      .limit(12)
      .lean(),
  ]);

  const contributionCounts = countByStatus(contributionRows);
  const solutionCounts = countByStatus(solutionRows);

  const bookmarks = (user.bookmarks || [])
    .filter(Boolean)
    .map(sanitizeBookmark)
    .slice(-12)
    .reverse();

  const stats = impactSummary({
    contributionCounts,
    solutionCounts,
    bookmarkCount: (user.bookmarks || []).length + savedItems.filter((item) => item.entityType !== 'paper').length,
    requestCount: requestTotal,
    verificationCount,
    contributorProfile: contributorProfile || {},
  });

  return {
    version: 'personal-dashboard-v1',
    user: {
      _id: stringId(user),
      name: user.displayName || user.username || 'Student',
      email: user.email || '',
      authProvider: user.authProvider || 'local',
      avatar: user.avatar || '',
      role: user.role || 'student',
      semester: Number(user.semester || user.currentSemester) || null,
    },
    stats,
    contributor: {
      xp: Number(contributorProfile?.xp || 0),
      rank: contributorProfile?.rank ?? null,
      badges: contributorProfile?.badges || [],
      nextXpMilestone: contributorProfile?.nextXpMilestone ?? null,
      approvedPapers: Number(contributorProfile?.approvedPapers || 0),
      approvedSolutions: Number(contributorProfile?.approvedSolutions || 0),
      fulfilledRequests: Number(contributorProfile?.fulfilledRequests || 0),
      impactViews: Number(contributorProfile?.impactViews || 0),
      impactDownloads: Number(contributorProfile?.impactDownloads || 0),
    },
    statusCounts: {
      contributions: contributionCounts,
      solutions: solutionCounts,
    },
    bookmarks,
    savedItems: savedItems.map((item) => ({
      _id: stringId(item),
      entityType: item.entityType,
      entityKey: item.entityKey,
      title: item.title,
      route: item.route,
      subjectCode: item.subjectCode || '',
      updatedAt: item.updatedAt || null,
    })),
    continueStudying: studyProgress.map((item) => ({
      _id: stringId(item),
      entityType: item.entityType,
      entityKey: item.entityKey,
      title: item.title,
      route: item.route,
      subjectCode: item.subjectCode || '',
      status: item.status,
      progress: Number(item.progress || 0),
      lastViewedAt: item.lastViewedAt || null,
    })),
    requests: requests.map(sanitizeRequest),
    recentContributions: recentContributions.map(publicContribution),
    recentSolutions: recentSolutions.map(publicSolution),
    recommendations: {
      preferredSemester: Number(user.semester || user.currentSemester) || null,
      links: {
        survival: '/semester-survival',
        revision: '/revision-sheets',
        warRoom: '/exam-war-room',
        ask: '/ask-paperstack',
        mocks: '/mock-exams',
        contribute: '/contribute',
        profile: '/contributors/me',
      },
    },
  };
}

module.exports = {
  getPersonalDashboard,
  publicContribution,
  publicSolution,
};
