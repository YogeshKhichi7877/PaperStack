const mongoose = require('mongoose');
const DailyLearningCheckin = require('../models/DailyLearningCheckin');
const QuestionAttempt = require('../models/QuestionAttempt');
const StudyActivity = require('../models/StudyActivity');

const Contribution = require('../models/Contribution');
const QuestionSolution = require('../models/QuestionSolution');
const PaperVerification = require('../models/PaperVerification');

const {
  buildStreakSnapshot,
  normalizeCategory,
  validDayKey,
} = require('./streakService');

function serverTodayKey() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    );
}

function acceptableClientDay(
  dayKey
) {
  if (
    !validDayKey(
      dayKey
    )
  ) {
    return false;
  }

  const server =
    new Date(
      `${serverTodayKey()}T00:00:00Z`
    );

  const client =
    new Date(
      `${dayKey}T00:00:00Z`
    );

  const diff =
    Math.abs(
      Math.round(
        (
          client -
          server
        ) /
          86400000
      )
    );

  return (
    diff <=
    1
  );
}

function sanitizeRoute(
  value
) {
  const path =
    String(value || '')
      .trim()
      .slice(
        0,
        180
      );

  if (
    !path.startsWith(
      '/'
    )
  ) {
    return '';
  }

  return path;
}

async function recordStudyActivity(
  userId,
  {
    dayKey,
    category,
    route,
  }
) {
  const normalizedCategory =
    normalizeCategory(
      category
    );

  if (
    !normalizedCategory
  ) {
    const error =
      new Error(
        'Unsupported study category'
      );

    error.status =
      400;

    throw error;
  }

  const safeDay =
    acceptableClientDay(
      dayKey
    )
      ? dayKey
      : serverTodayKey();

  const safeRoute =
    sanitizeRoute(
      route
    );

  const update = {
    $setOnInsert: {
      userId,
      dayKey:
        safeDay,
      firstSeenAt:
        new Date(),
    },
    $set: {
      lastSeenAt:
        new Date(),
      ...(safeRoute
        ? {
            lastRoute:
              safeRoute,
          }
        : {}),
    },
    $inc: {
      eventCount:
        1,
    },
    $addToSet: {
      categories:
        normalizedCategory,
    },
  };

  return StudyActivity.findOneAndUpdate(
    {
      userId,
      dayKey:
        safeDay,
    },
    update,
    {
      new:
        true,
      upsert:
        true,
      setDefaultsOnInsert:
        false,
    }
  ).lean();
}

async function communityStats(
  userId
) {
  const [
    approvedContributions,
    approvedSolutions,
    verificationCount,
  ] =
    await Promise.all([
      Contribution.countDocuments({
        contributorUserId:
          userId,
        status:
          'approved',
      }),

      QuestionSolution.countDocuments({
        authorUserId:
          userId,
        status:
          'approved',
      }),

      PaperVerification.countDocuments({
        userId,
      }),
    ]);

  return {
    approvedContributions,
    approvedSolutions,
    verificationCount,
  };
}

// Read actual saved learning work, including historical records. Merely opening
// a learning/practice page does not create an activity day here.
async function learningActivities(userId, { Checkin = DailyLearningCheckin, Attempt = QuestionAttempt } = {}) {
  const id = new mongoose.Types.ObjectId(String(userId));
  const pipeline = [
    { $match: { userId: id } },
    { $group: { _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: 'Asia/Kolkata' } }, eventCount: { $sum: 1 } } },
  ];
  const [classes, attempts] = await Promise.all([Checkin.aggregate(pipeline), Attempt.aggregate(pipeline)]);
  return [
    ...classes.map((row) => ({ dayKey: row._id, categories: ['learn'], eventCount: row.eventCount })),
    ...attempts.map((row) => ({ dayKey: row._id, categories: ['practice'], eventCount: row.eventCount })),
  ];
}

async function getStudyStreak(
  userId,
  todayKey
) {
  const [
    activities,
    community,
    learning,
  ] =
    await Promise.all([
      StudyActivity.find({
        userId,
      })
        .sort({
          dayKey: 1,
        })
        .select(
          'dayKey categories eventCount'
        )
        .lean(),

      communityStats(
        userId
      ),
      learningActivities(userId),
    ]);

  return buildStreakSnapshot({
    activities: [...activities, ...learning],
    todayKey:
      validDayKey(
        todayKey
      )
        ? todayKey
        : serverTodayKey(),
    community,
  });
}

module.exports = {
  learningActivities,
  acceptableClientDay,
  communityStats,
  getStudyStreak,
  recordStudyActivity,
  sanitizeRoute,
  serverTodayKey,
};
