const Notification = require('../models/Notification');

const Contribution = require('../models/Contribution');
const PaperRequest = require('../models/PaperRequest');
const QuestionSolution = require('../models/QuestionSolution');

const {
  contributionEvent,
  publicNotification,
  requestEvent,
  solutionEvent,
} = require('./notificationEvents');

async function upsertEvents(
  events = []
) {
  const valid =
    events.filter(Boolean);

  if (
    !valid.length
  ) {
    return 0;
  }

  try {
    await Notification.bulkWrite(
      valid.map(
        (event) => ({
          updateOne: {
            filter: {
              sourceKey:
                event.sourceKey,
            },
            update: {
              $set: {
                title:
                  event.title,
                message:
                  event.message,
                severity:
                  event.severity,
                actionUrl:
                  event.actionUrl,
                eventAt:
                  event.eventAt,
                sourceState:
                  event.sourceState,
              },
              $setOnInsert: {
                userId:
                  event.userId,
                sourceKey:
                  event.sourceKey,
                sourceType:
                  event.sourceType,
                sourceId:
                  event.sourceId,
                readAt:
                  null,
              },
            },
            upsert:
              true,
          },
        })
      ),
      {
        ordered:
          false,
      }
    );
  } catch (error) {
    if (
      error?.code !==
      11000
    ) {
      throw error;
    }
  }

  return valid.length;
}

async function syncUserNotifications(
  userId
) {
  const [
    contributions,
    requests,
    solutions,
  ] =
    await Promise.all([
      Contribution.find({
        contributorUserId:
          userId,
        status: {
          $in: [
            'approved',
            'rejected',
            'needs_correction',
          ],
        },
      })
        .sort({
          updatedAt: -1,
        })
        .limit(80)
        .lean(),

      PaperRequest.find({
        status:
          'fulfilled',
        $or: [
          {
            requestedBy:
              userId,
          },
          {
            'requestedUsers.userId':
              userId,
          },
        ],
      })
        .sort({
          updatedAt: -1,
        })
        .limit(80)
        .lean(),

      QuestionSolution.find({
        authorUserId:
          userId,
        status: {
          $in: [
            'approved',
            'rejected',
          ],
        },
      })
        .sort({
          updatedAt: -1,
        })
        .limit(80)
        .lean(),
    ]);

  const events = [
    ...contributions.map(
      (item) =>
        contributionEvent(
          userId,
          item
        )
    ),
    ...requests.map(
      (item) =>
        requestEvent(
          userId,
          item
        )
    ),
    ...solutions.map(
      (item) =>
        solutionEvent(
          userId,
          item
        )
    ),
  ].filter(Boolean);

  return upsertEvents(
    events
  );
}

async function listUserNotifications(
  userId,
  {
    limit = 30,
    unreadOnly = false,
    sync = true,
  } = {}
) {
  if (
    sync
  ) {
    await syncUserNotifications(
      userId
    );
  }

  const safeLimit =
    Math.max(
      1,
      Math.min(
        100,
        Number(limit) ||
        30
      )
    );

  const filter = {
    userId,
    ...(unreadOnly
      ? {
          readAt:
            null,
        }
      : {}),
  };

  const [
    rows,
    unreadCount,
  ] =
    await Promise.all([
      Notification.find(
        filter
      )
        .sort({
          eventAt: -1,
          createdAt: -1,
        })
        .limit(
          safeLimit
        )
        .lean(),

      Notification.countDocuments({
        userId,
        readAt:
          null,
      }),
    ]);

  return {
    notifications:
      rows.map(
        publicNotification
      ),
    unreadCount,
  };
}

async function markNotificationRead(
  userId,
  notificationId
) {
  return Notification.findOneAndUpdate(
    {
      _id:
        notificationId,
      userId,
    },
    {
      $set: {
        readAt:
          new Date(),
      },
    },
    {
      new:
        true,
    }
  ).lean();
}

async function markAllNotificationsRead(
  userId
) {
  const result =
    await Notification.updateMany(
      {
        userId,
        readAt:
          null,
      },
      {
        $set: {
          readAt:
            new Date(),
        },
      }
    );

  return Number(
    result.modifiedCount ||
    0
  );
}

module.exports = {
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  syncUserNotifications,
  upsertEvents,
};
