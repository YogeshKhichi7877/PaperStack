const User =
  require('../models/User');

const Paper =
  require('../models/Paper');

const Resource =
  require('../models/Resource');

const Question =
  require('../models/Question');

const Contribution =
  require('../models/Contribution');

const QuestionSolution =
  require('../models/QuestionSolution');

const ResourceContribution =
  require('../models/ResourceContribution');

const PaperRequest =
  require('../models/PaperRequest');

const Report =
  require('../models/Report');

const ProductEvent =
  require('../models/ProductEvent');

const PaperEngagementDaily =
  require('../models/PaperEngagementDaily');

const {
  startDayKey,
  summarizeProductEvents,
} = require('./productAnalyticsMetrics');

function startDateFromKey(
  dayKey
) {
  return new Date(
    `${dayKey}T00:00:00.000Z`
  );
}

async function getProductAnalytics(
  period = '30d'
) {
  const safePeriod =
    period ===
    '7d'
      ? '7d'
      : '30d';

  const startKey =
    startDayKey(
      safePeriod
    );

  const startDate =
    startDateFromKey(
      startKey
    );

  const [
    events,
    engagementRows,
    totalAccounts,
    totalPapers,
    totalResources,
    totalQuestions,
    approvedContributions,
    approvedSolutions,
    openRequests,
    pendingContributions,
    needsCorrectionContributions,
    pendingResourceContributions,
    pendingSolutions,
    openReports,
    papersAdded,
    contributionsApproved,
    solutionsApproved,
  ] =
    await Promise.all([
      ProductEvent.find({
        dayKey: {
          $gte:
            startKey,
        },
      })
        .sort({
          createdAt: -1,
        })
        .limit(
          50000
        )
        .select(
          'eventName sessionId routeKey dayKey type branch semester examType resultBucket createdAt'
        )
        .lean(),

      PaperEngagementDaily.aggregate([
        {
          $match: {
            dayKey: {
              $gte:
                startKey,
            },
          },
        },
        {
          $group: {
            _id:
              null,
            views: {
              $sum:
                '$views',
            },
            downloads: {
              $sum:
                '$downloads',
            },
            activePaperIds: {
              $addToSet:
                '$paperId',
            },
          },
        },
      ]),

      User.countDocuments({}),

      Paper.countDocuments({}),

      Resource.countDocuments({
        status:
          'active',
      }),

      Question.countDocuments({
        status: {
          $ne:
            'rejected',
        },
      }),

      Contribution.countDocuments({
        status:
          'approved',
      }),

      QuestionSolution.countDocuments({
        status:
          'approved',
      }),

      PaperRequest.countDocuments({
        status:
          'open',
      }),

      Contribution.countDocuments({
        status:
          'pending',
      }),

      Contribution.countDocuments({
        status:
          'needs_correction',
      }),

      ResourceContribution.countDocuments({
        status: {
          $in: [
            'pending',
            'needs_correction',
          ],
        },
      }),

      QuestionSolution.countDocuments({
        status:
          'pending',
      }),

      Report.countDocuments({
        status: {
          $in: [
            'open',
            'reviewed',
          ],
        },
      }),

      Paper.countDocuments({
        createdAt: {
          $gte:
            startDate,
        },
      }),

      Contribution.countDocuments({
        status:
          'approved',
        approvedAt: {
          $gte:
            startDate,
        },
      }),

      QuestionSolution.countDocuments({
        status:
          'approved',
        approvedAt: {
          $gte:
            startDate,
        },
      }),
    ]);

  const eventSummary =
    summarizeProductEvents(
      events,
      safePeriod
    );

  const engagement =
    engagementRows[
      0
    ] || {
      views:
        0,
      downloads:
        0,
      activePaperIds:
        [],
    };

  return {
    period:
      safePeriod,
    startDay:
      startKey,
    generatedAt:
      new Date()
        .toISOString(),
    eventWindowTruncated:
      events.length >=
      50000,
    kpis: {
      activeSessions:
        eventSummary.activeSessions,
      pageViews:
        eventSummary.pageViews,
      searches:
        eventSummary.searches,
      searchSuccessRate:
        eventSummary.search
          .successRate,
      paperViews:
        Number(
          engagement.views ||
          0
        ),
      paperDownloads:
        Number(
          engagement.downloads ||
          0
        ),
      activePapers:
        Array.isArray(
          engagement.activePaperIds
        )
          ? engagement.activePaperIds.length
          : 0,
    },
    daily:
      eventSummary.daily,
    routes:
      eventSummary.routes.slice(
        0,
        16
      ),
    search:
      eventSummary.search,
    journey:
      eventSummary.journey,
    inventory: {
      accounts:
        totalAccounts,
      papers:
        totalPapers,
      resources:
        totalResources,
      questions:
        totalQuestions,
      approvedContributions,
      approvedSolutions,
      openRequests,
    },
    moderation: {
      pendingContributions,
      needsCorrectionContributions,
      pendingSolutions,
      openReports,
      total:
        pendingContributions +
        needsCorrectionContributions +
        pendingSolutions +
        openReports,
    },
    growth: {
      papersAdded,
      contributionsApproved,
      solutionsApproved,
    },
    methodology: {
      identity:
        'Product analytics uses a random browser-session identifier. It is not linked to a PaperStack user account.',
      searchPrivacy:
        'Search analytics stores result buckets and selected filters, never the raw search query.',
      paperEngagement:
        'Paper views/downloads come from the daily aggregate engagement collection introduced in Phase 25.',
      retention:
        'Anonymous product events expire automatically after 180 days.',
      caution:
        'Active sessions are browser sessions, not unique people. Use these metrics for product usage trends rather than student-level monitoring.',
    },
  };
}

module.exports = {
  getProductAnalytics,
  startDateFromKey,
};
