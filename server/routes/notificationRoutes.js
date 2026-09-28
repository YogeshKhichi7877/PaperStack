const express = require('express');
const mongoose = require('mongoose');

const {
  listUserNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  syncUserNotifications,
} = require('../services/notificationService');

function createNotificationRoutes({
  authenticate,
}) {
  if (
    typeof authenticate !==
    'function'
  ) {
    throw new Error(
      'Notification routes require authenticate middleware'
    );
  }

  const router =
    express.Router();

  router.get(
    '/',
    authenticate,
    async (
      req,
      res
    ) => {
      try {
        const userId =
          req.user?._id ||
          req.user?.id;

        const result =
          await listUserNotifications(
            userId,
            {
              limit:
                req.query.limit,
              unreadOnly:
                req.query.unread ===
                '1',
              sync:
                req.query.sync !==
                '0',
            }
          );

        return res.json(
          result
        );
      } catch (
        error
      ) {
        console.error(
          'Notifications failed:',
          error
        );

        return res
          .status(500)
          .json({
            error:
              'Failed to load notifications',
          });
      }
    }
  );

  router.post(
    '/sync',
    authenticate,
    async (
      req,
      res
    ) => {
      try {
        const userId =
          req.user?._id ||
          req.user?.id;

        const synced =
          await syncUserNotifications(
            userId
          );

        const result =
          await listUserNotifications(
            userId,
            {
              limit:
                30,
              sync:
                false,
            }
          );

        return res.json({
          synced,
          ...result,
        });
      } catch (
        error
      ) {
        console.error(
          'Notification sync failed:',
          error
        );

        return res
          .status(500)
          .json({
            error:
              'Failed to synchronize notifications',
          });
      }
    }
  );

  router.post(
    '/read-all',
    authenticate,
    async (
      req,
      res
    ) => {
      try {
        const userId =
          req.user?._id ||
          req.user?.id;

        const modified =
          await markAllNotificationsRead(
            userId
          );

        return res.json({
          modified,
          unreadCount:
            0,
        });
      } catch (
        error
      ) {
        return res
          .status(500)
          .json({
            error:
              'Failed to mark notifications as read',
          });
      }
    }
  );

  router.post(
    '/:notificationId/read',
    authenticate,
    async (
      req,
      res
    ) => {
      try {
        if (
          !mongoose.Types.ObjectId.isValid(
            req.params.notificationId
          )
        ) {
          return res
            .status(400)
            .json({
              error:
                'Invalid notification id',
            });
        }

        const userId =
          req.user?._id ||
          req.user?.id;

        const updated =
          await markNotificationRead(
            userId,
            req.params.notificationId
          );

        if (
          !updated
        ) {
          return res
            .status(404)
            .json({
              error:
                'Notification not found',
            });
        }

        return res.json({
          success:
            true,
        });
      } catch (
        error
      ) {
        return res
          .status(500)
          .json({
            error:
              'Failed to update notification',
          });
      }
    }
  );

  return router;
}

module.exports = {
  createNotificationRoutes,
};
