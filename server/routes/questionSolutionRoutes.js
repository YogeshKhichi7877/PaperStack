const express = require('express');
const mongoose = require('mongoose');

const Question = require('../models/Question');
const QuestionSolution = require('../models/QuestionSolution');
const QuestionSolutionVote = require('../models/QuestionSolutionVote');
const { notifyAdminUpload } = require('../services/adminUploadNotification');

const {
  canAuthorEdit,
  ownSolution,
  publicSolution,
  sanitizeAnswerText,
} = require('../services/questionSolutionService');

function validObjectId(value) {
  return mongoose.Types.ObjectId.isValid(
    String(value || '')
  );
}

module.exports = function createQuestionSolutionRoutes({
  authenticate,
}) {
  const router = express.Router();

  if (typeof authenticate !== 'function') {
    throw new Error(
      'Question solution routes require authenticate middleware.'
    );
  }

  router.get('/question/:questionId', async (req, res) => {
    try {
      if (!validObjectId(req.params.questionId)) {
        return res.status(400).json({
          error: 'Invalid question id',
        });
      }

      const question = await Question.findOne({ _id: req.params.questionId, status: { $ne: 'rejected' }, needsReview: { $ne: true } })
        .select(
          '_id paperId questionLabel questionText subject subjectCode year examType'
        )
        .lean();

      if (!question) {
        return res.status(404).json({
          error: 'Question not found',
        });
      }

      const solutions = await QuestionSolution.find({
        questionId: question._id,
        status: 'approved',
      })
        .sort({
          helpfulCount: -1,
          approvedAt: 1,
          createdAt: 1,
        })
        .lean();

      res.json({
        questionId: question._id,
        count: solutions.length,
        solutions: solutions.map(publicSolution),
      });
    } catch (error) {
      console.error(
        'Question solutions load failed:',
        error
      );

      res.status(500).json({
        error: 'Failed to load question solutions',
      });
    }
  });

  router.get(
    '/mine/:questionId',
    authenticate,
    async (req, res) => {
      try {
        if (!validObjectId(req.params.questionId)) {
          return res.status(400).json({
            error: 'Invalid question id',
          });
        }

        const userId = req.user?._id || req.user?.id;

        const solution = await QuestionSolution.findOne({
          questionId: req.params.questionId,
          authorUserId: userId,
        }).lean();

        res.json({
          solution: solution
            ? ownSolution(solution)
            : null,
        });
      } catch (error) {
        console.error(
          'My question solution failed:',
          error
        );

        res.status(500).json({
          error: 'Failed to load your solution',
        });
      }
    }
  );

  router.post(
    '/question/:questionId',
    authenticate,
    async (req, res) => {
      try {
        if (!validObjectId(req.params.questionId)) {
          return res.status(400).json({
            error: 'Invalid question id',
          });
        }

        const question = await Question.findOne({ _id: req.params.questionId, status: { $ne: 'rejected' }, needsReview: { $ne: true } })
          .select(
            '_id paperId questionLabel questionText'
          )
          .lean();

        if (!question) {
          return res.status(404).json({
            error: 'Question not found',
          });
        }

        const userId = req.user?._id || req.user?.id;

        if (!userId) {
          return res.status(401).json({
            error: 'User session is invalid',
          });
        }

        const answerText = sanitizeAnswerText(
          req.body?.answerText
        );

        const existing = await QuestionSolution.findOne({
          questionId: question._id,
          authorUserId: userId,
        });

        if (existing && !canAuthorEdit(existing)) {
          return res.status(409).json({
            error:
              'Your approved solution is locked. Ask an admin if it needs correction.',
          });
        }

        const authorName =
          String(
            req.user?.username ||
            req.user?.name ||
            'Student'
          )
            .trim()
            .slice(0, 100) || 'Student';

        const solution =
          await QuestionSolution.findOneAndUpdate(
            {
              questionId: question._id,
              authorUserId: userId,
            },
            {
              $set: {
                paperId: question.paperId,
                authorName,
                answerText,
                status: 'pending',
                moderationNote: '',
                approvedAt: null,
                approvedBy: null,
              },
              $setOnInsert: {
                helpfulCount: 0,
              },
            },
            {
              upsert: true,
              new: true,
              setDefaultsOnInsert: true,
            }
          );

        notifyAdminUpload({ kind: 'solution', title: question.questionLabel || 'Student answer', contributor: authorName }).catch((error) => console.warn('Admin solution notification failed:', error.message));

        res.status(existing ? 200 : 201).json({
          message: existing
            ? 'Solution updated and sent for review.'
            : 'Solution submitted for review.',
          solution: ownSolution(
            solution.toObject()
          ),
        });
      } catch (error) {
        const status = error.statusCode || 500;

        if (status >= 500) {
          console.error(
            'Question solution submit failed:',
            error
          );
        }

        res.status(status).json({
          error:
            status >= 500
              ? 'Failed to submit solution'
              : error.message,
        });
      }
    }
  );

  router.delete(
    '/mine/:questionId',
    authenticate,
    async (req, res) => {
      try {
        if (!validObjectId(req.params.questionId)) {
          return res.status(400).json({
            error: 'Invalid question id',
          });
        }

        const userId = req.user?._id || req.user?.id;

        const solution =
          await QuestionSolution.findOne({
            questionId: req.params.questionId,
            authorUserId: userId,
          });

        if (!solution) {
          return res.status(404).json({
            error: 'Solution not found',
          });
        }

        if (!canAuthorEdit(solution)) {
          return res.status(409).json({
            error:
              'Approved solutions cannot be deleted by the author.',
          });
        }

        await QuestionSolutionVote.deleteMany({
          solutionId: solution._id,
        });

        await solution.deleteOne();

        res.json({
          message: 'Solution deleted.',
        });
      } catch (error) {
        console.error(
          'Question solution delete failed:',
          error
        );

        res.status(500).json({
          error: 'Failed to delete solution',
        });
      }
    }
  );

  router.post(
    '/:solutionId/helpful',
    authenticate,
    async (req, res) => {
      try {
        if (!validObjectId(req.params.solutionId)) {
          return res.status(400).json({
            error: 'Invalid solution id',
          });
        }

        const solution =
          await QuestionSolution.findById(
            req.params.solutionId
          );

        if (!solution || solution.status !== 'approved') {
          return res.status(404).json({
            error: 'Approved solution not found',
          });
        }

        const userId = req.user?._id || req.user?.id;

        const existingVote =
          await QuestionSolutionVote.findOne({
            solutionId: solution._id,
            userId,
          });

        let helpful = false;

        if (existingVote) {
          await existingVote.deleteOne();
        } else {
          try {
            await QuestionSolutionVote.create({
              solutionId: solution._id,
              userId,
            });

            helpful = true;
          } catch (error) {
            if (error?.code !== 11000) throw error;
            helpful = true;
          }
        }

        const helpfulCount =
          await QuestionSolutionVote.countDocuments({
            solutionId: solution._id,
          });

        solution.helpfulCount = helpfulCount;
        await solution.save();

        res.json({
          helpful,
          helpfulCount,
        });
      } catch (error) {
        console.error(
          'Helpful solution vote failed:',
          error
        );

        res.status(500).json({
          error: 'Failed to update helpful vote',
        });
      }
    }
  );

  return router;
};
