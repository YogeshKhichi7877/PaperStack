const express = require('express');

const ResourceContribution =
  require('../models/ResourceContribution');

const {
  approveResourceContribution,
  updateResourceContributionStatus,
} = require('../services/resourceContributionService');

module.exports =
  function createAdminResourceContributionRoutes({
    authenticateAdmin,
  }) {
    if (
      typeof authenticateAdmin !==
      'function'
    ) {
      throw new Error(
        'Admin resource contribution routes require authenticateAdmin middleware.'
      );
    }

    const router =
      express.Router();

    router.use(
      authenticateAdmin
    );

    router.get(
      '/',
      async (
        req,
        res
      ) => {
        try {
          const status =
            String(
              req.query.status ||
              ''
            ).trim();

          const query =
            status
              ? {
                  status,
                }
              : {};

          const list =
            await ResourceContribution.find(
              query
            )
              .sort({
                createdAt: -1,
              })
              .limit(300)
              .lean();

          return res.json({
            contributions:
              list,
          });
        } catch (
          error
        ) {
          return res
            .status(500)
            .json({
              error:
                'Failed to load resource contributions.',
            });
        }
      }
    );

    router.patch(
      '/:id/:action',
      async (
        req,
        res
      ) => {
        try {
          const action =
            String(
              req.params.action ||
              ''
            );

          if (
            action ===
            'approve'
          ) {
            const result =
              await approveResourceContribution({
                contributionId:
                  req.params.id,
                admin:
                  req.admin,
                adminNote:
                  req.body?.adminNote ||
                  '',
              });

            return res.json({
              success:
                true,
              message:
                `Resource approved. ${result.contribution.pointsAwarded || 0} points awarded.`,
              ...result,
            });
          }

          if (
            ![
              'reject',
              'needs-correction',
            ].includes(
              action
            )
          ) {
            return res
              .status(400)
              .json({
                error:
                  'Invalid resource moderation action.',
              });
          }

          const adminNote =
            String(
              req.body?.adminNote ||
              ''
            ).trim();

          if (
            !adminNote
          ) {
            return res
              .status(400)
              .json({
                error:
                  'Admin note is required for rejection or correction.',
              });
          }

          const status =
            action ===
            'reject'
              ? 'rejected'
              : 'needs_correction';

          const contribution =
            await updateResourceContributionStatus({
              contributionId:
                req.params.id,
              status,
              admin:
                req.admin,
              adminNote,
            });

          return res.json({
            success:
              true,
            message:
              status ===
              'rejected'
                ? 'Resource contribution rejected.'
                : 'Resource contribution marked for correction.',
            contribution,
          });
        } catch (
          error
        ) {
          const status =
            Number(
              error.statusCode ||
              500
            );

          if (
            status >=
            500
          ) {
            console.error(
              'Resource moderation failed:',
              error
            );
          }

          return res
            .status(
              status
            )
            .json({
              error:
                status >=
                  500
                  ? 'Resource moderation failed.'
                  : error.message,
            });
        }
      }
    );

    return router;
  };
