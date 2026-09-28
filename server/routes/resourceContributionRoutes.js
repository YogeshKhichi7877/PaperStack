const express = require('express');
const multer = require('multer');

const {
  RESOURCE_TYPES,
} = require('../data/resourceTypes');

const {
  resourcePointRules,
} = require('../utils/resourceContributionPoints');

const {
  createResourceContribution,
  getOwnResourceContributions,
} = require('../services/resourceContributionService');
const { notifyAdminUpload } = require('../services/adminUploadNotification');

const upload =
  multer({
    storage:
      multer.memoryStorage(),
    limits: {
      fileSize:
        20 *
        1024 *
        1024,
    },
  });

module.exports =
  function createResourceContributionRoutes({
    authenticate,
  }) {
    if (
      typeof authenticate !==
      'function'
    ) {
      throw new Error(
        'Resource contribution routes require authenticate middleware.'
      );
    }

    const router =
      express.Router();

    router.get(
      '/config',
      (
        req,
        res
      ) => {
        return res.json({
          resourceTypes:
            RESOURCE_TYPES.filter(
              (item) =>
                item.value !==
                'question_paper'
            ),
          points:
            resourcePointRules(),
          acceptedFileTypes: [
            'PDF',
            'Images',
            'DOC/DOCX',
            'PPT/PPTX',
            'XLS/XLSX',
            'TXT/CSV',
            'ZIP',
          ],
          maxFileMb:
            20,
        });
      }
    );

    router.get(
      '/mine',
      authenticate,
      async (
        req,
        res
      ) => {
        try {
          const userId =
            req.user._id ||
            req.user.id;

          return res.json({
            contributions:
              await getOwnResourceContributions(
                userId
              ),
          });
        } catch (
          error
        ) {
          console.error(
            'Resource contribution history failed:',
            error
          );

          return res
            .status(500)
            .json({
              error:
                'Failed to load your resource contributions.',
            });
        }
      }
    );

    router.post(
      '/',
      authenticate,
      upload.single(
        'file'
      ),
      async (
        req,
        res
      ) => {
        try {
          const contribution =
            await createResourceContribution({
              body:
                req.body ||
                {},
              file:
                req.file,
              user:
                req.user,
            });

          notifyAdminUpload({ kind: 'resource', title: contribution.title, contributor: contribution.contributorName }).catch((error) => console.warn('Admin resource notification failed:', error.message));

          return res
            .status(201)
            .json({
              success:
                true,
              message:
                'Resource submitted for admin review. Points are awarded after approval.',
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
              'Resource contribution failed:',
              error
            );
          }

          return res
            .status(
              status
            )
            .json({
              success:
                false,
              error:
                status >=
                  500
                  ? 'Resource contribution failed.'
                  : error.message,
              duplicateType:
                error.duplicateType,
            });
        }
      }
    );

    return router;
  };
