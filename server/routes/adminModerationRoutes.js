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

        const existing = await Question.findById(req.params.questionId)
          .select('+answerKey paperId questionType options status needsReview')
          .lean();
        if (!existing) return res.status(404).json({ error: 'Question not found' });

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
        if (req.body?.questionType !== undefined) {
          const questionType = String(req.body.questionType).trim().toLowerCase();
          if (!['mcq', 'objective', 'numerical', 'conceptual', 'short_answer', 'scenario', 'unknown'].includes(questionType)) return res.status(400).json({ error: 'Choose a supported question type.' });
          edits.questionType = questionType;
        }
        if (req.body?.options !== undefined) {
          if (!Array.isArray(req.body.options) || req.body.options.length > 10) return res.status(400).json({ error: 'Question options must be a list of at most 10 values.' });
          edits.options = req.body.options.map((item) => String(item).trim().slice(0, 1000)).filter(Boolean);
        }
        if (req.body?.answerKey !== undefined) edits.answerKey = String(req.body.answerKey).trim().slice(0, 2000);
        if (req.body?.questionRating !== undefined) {
          const questionRating = Number(req.body.questionRating);
          if (!Number.isFinite(questionRating) || questionRating < 500 || questionRating > 2500) return res.status(400).json({ error: 'Question rating must be between 500 and 2500.' });
          edits.questionRating = Math.round(questionRating);
        }
        if (req.body?.ratingEligible !== undefined) {
          const effectiveType = edits.questionType || existing.questionType;
          const effectiveAnswer = edits.answerKey !== undefined ? edits.answerKey : existing.answerKey;
          const effectiveOptions = edits.options !== undefined ? edits.options : existing.options;
          if (req.body.ratingEligible === true && !['mcq', 'objective', 'numerical'].includes(effectiveType)) return res.status(400).json({ error: 'Only objective questions can affect academic rating.' });
          if (req.body.ratingEligible === true && !effectiveAnswer) return res.status(400).json({ error: 'A reviewed answer key is required before enabling rating.' });
          if (req.body.ratingEligible === true && effectiveType === 'mcq' && !effectiveOptions.includes(effectiveAnswer)) return res.status(400).json({ error: 'The MCQ answer key must match one of its options.' });
          edits.ratingEligible = req.body.ratingEligible === true;
        }
        if (status === 'rejected') edits.ratingEligible = false;
        if (status !== 'rejected') {
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

        if (Object.keys(edits).length) await require('../services/semanticAiAnswerService').invalidateQuestionAnswers([question._id]);
        if (question.paperId) await require('../services/questionExtractionService').syncPaperQuestionReview(question.paperId);
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
