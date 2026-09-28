const express = require('express');

const {
  getStudyStreak,
  recordStudyActivity,
} = require('../services/studyActivityService');

function createStreakRoutes({
  authenticate,
}) {
  if (
    typeof authenticate !==
    'function'
  ) {
    throw new Error(
      'Streak routes require authenticate middleware'
    );
  }

  const router =
    express.Router();

  router.get(
    '/me',
    authenticate,
    async (
      req,
      res
    ) => {
      try {
        const userId =
          req.user?._id ||
          req.user?.id;

        const snapshot =
          await getStudyStreak(
            userId,
            req.query.localDate
          );

        return res.json(
          snapshot
        );
      } catch (
        error
      ) {
        console.error(
          'Study streak failed:',
          error
        );

        return res
          .status(500)
          .json({
            error:
              'Failed to load study streak',
          });
      }
    }
  );

  router.post(
    '/ping',
    authenticate,
    async (
      req,
      res
    ) => {
      try {
        const userId =
          req.user?._id ||
          req.user?.id;

        const activity =
          await recordStudyActivity(
            userId,
            {
              dayKey:
                req.body?.localDate,
              category:
                req.body?.category,
              route:
                req.body?.route,
            }
          );

        return res.json({
          success:
            true,
          dayKey:
            activity.dayKey,
          categories:
            activity.categories,
        });
      } catch (
        error
      ) {
        const status =
          Number(
            error.status ||
            500
          );

        if (
          status >=
          500
        ) {
          console.error(
            'Study ping failed:',
            error
          );
        }

        return res
          .status(
            status
          )
          .json({
            error:
              error.message ||
              'Failed to record study activity',
          });
      }
    }
  );

  return router;
}

module.exports = {
  createStreakRoutes,
};
