const express =
  require('express');

const mongoose =
  require('mongoose');

const Question =
  require('../models/Question');

const {
  getModerationQueue,
} = require('../services/adminModerationService');

module.exports = function createAdminModerationRoutes({
  authenticateAdmin,
}) {
  if (
    typeof authenticateAdmin !==
    'function'
  ) {
    throw new Error(
      'Admin moderation routes require authenticateAdmin middleware.'
    );
  }

  const router =
    express.Router();

  router.use(
    authenticateAdmin
  );

  router.get(
    '/queue',
    async (
      req,
      res
    ) => {
      try {
        const result =
          await getModerationQueue({
            kind:
              String(
                req.query.kind ||
                'all'
              ),
            limit:
              req.query.limit,
          });

        return res.json(
          result
        );
      } catch (
        error
      ) {
        console.error(
          'Unified moderation queue failed:',
          error
        );

        return res
          .status(500)
          .json({
            error:
              'Failed to load moderation queue',
          });
      }
    }
  );

  router.patch(
    '/questions/:questionId',
    async (
      req,
      res
    ) => {
      try {
        if (
          !mongoose.Types.ObjectId.isValid(
            String(
              req.params.questionId ||
              ''
            )
          )
        ) {
          return res
            .status(400)
            .json({
              error:
                'Invalid question id',
            });
        }

        const status =
          String(
            req.body?.status ||
            ''
          )
            .trim()
            .toLowerCase();

        if (
          ![
            'reviewed',
            'verified',
            'rejected',
          ].includes(
            status
          )
        ) {
          return res
            .status(400)
            .json({
              error:
                'Question status must be reviewed, verified, or rejected.',
            });
        }

        const question =
          await Question.findByIdAndUpdate(
            req.params.questionId,
            {
              $set: {
                status,
                needsReview:
                  false,
              },
            },
            {
              new:
                true,
            }
          ).lean();

        if (
          !question
        ) {
          return res
            .status(404)
            .json({
              error:
                'Question not found',
            });
        }

        return res.json({
          message:
            `Question marked ${status}.`,
          question,
        });
      } catch (
        error
      ) {
        console.error(
          'Question moderation failed:',
          error
        );

        return res
          .status(500)
          .json({
            error:
              'Failed to moderate extracted question',
          });
      }
    }
  );

  return router;
};
