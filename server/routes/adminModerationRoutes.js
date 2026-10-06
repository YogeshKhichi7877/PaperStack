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

        const edits = {};
        if (req.body?.questionText !== undefined) {
          const questionText = String(req.body.questionText).normalize('NFC').trim();
          if (questionText.length > 30000 || !require('../services/questionExtractionRules').isQuestionText(questionText)) return res.status(400).json({ error: 'Enter a complete exam question.' });
          const { normalizeQuestionText, hashQuestionText } = require('../services/questionService');
          Object.assign(edits, { questionText, normalizedText: normalizeQuestionText(questionText), textHash: hashQuestionText(questionText) });
        }
        if (req.body?.marks !== undefined) {
          const marks = req.body.marks === null || req.body.marks === '' ? null : Number(req.body.marks);
          if (marks !== null && (!Number.isFinite(marks) || marks < 0 || marks > 200)) return res.status(400).json({ error: 'Check the question marks.' });
          edits.marks = marks;
        }
        if (status !== 'rejected') {
          const existing = await Question.findById(req.params.questionId).select('paperId').lean();
          if (existing?.paperId) {
            const paper = await require('../models/Paper').findById(existing.paperId).select('importBatchId processing.metadata').lean();
            const metadata = paper?.processing?.metadata;
            if (paper?.importBatchId && (metadata?.missing?.length || metadata?.conflicts?.length || metadata?.uncertain?.length)) return res.status(409).json({ error: 'Approve the detected paper metadata before approving its questions.' });
          }
        }
        const question =
          await Question.findByIdAndUpdate(
            req.params.questionId,
            {
              $set: {
                ...edits,
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

        if (Object.keys(edits).length) await require('../services/semanticAiAnswerService').invalidateQuestionAnswers([question._id]);
        await require('../services/questionExtractionService').syncPaperQuestionReview(question.paperId);
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
