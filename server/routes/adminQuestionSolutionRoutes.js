const express = require('express');
const mongoose = require('mongoose');

const QuestionSolution = require('../models/QuestionSolution');

const {
  adminSolution,
  normalizeModerationInput,
  statusCounts,
} = require('../services/questionSolutionService');

function validObjectId(value) {
  return mongoose.Types.ObjectId.isValid(
    String(value || '')
  );
}

module.exports = function createAdminQuestionSolutionRoutes({
  authenticateAdmin,
}) {
  const router = express.Router();

  if (typeof authenticateAdmin !== 'function') {
    throw new Error(
      'Admin question solution routes require authenticateAdmin middleware.'
    );
  }

  router.use(authenticateAdmin);

  router.get('/', async (req, res) => {
    try {
      const status = String(
        req.query.status || 'pending'
      ).trim().toLowerCase();

      const filter = {};

      if (
        ['pending', 'approved', 'rejected'].includes(status)
      ) {
        filter.status = status;
      }

      const limit = Math.max(
        1,
        Math.min(Number(req.query.limit) || 100, 200)
      );

      const [solutions, allStatuses] =
        await Promise.all([
          QuestionSolution.find(filter)
            .sort({
              createdAt: status === 'pending' ? 1 : -1,
            })
            .limit(limit)
            .populate(
              'questionId',
              '_id questionLabel questionText subject subjectCode year examType'
            )
            .lean(),

          QuestionSolution.find({})
            .select('status')
            .lean(),
        ]);

      res.json({
        status,
        stats: statusCounts(allStatuses),
        solutions: solutions.map(adminSolution),
      });
    } catch (error) {
      console.error(
        'Admin question solutions load failed:',
        error
      );

      res.status(500).json({
        error: 'Failed to load student solutions',
      });
    }
  });

  router.patch('/:solutionId', async (req, res) => {
    try {
      if (!validObjectId(req.params.solutionId)) {
        return res.status(400).json({
          error: 'Invalid solution id',
        });
      }

      const input = normalizeModerationInput(
        req.body || {}
      );

      const solution =
        await QuestionSolution.findById(
          req.params.solutionId
        );

      if (!solution) {
        return res.status(404).json({
          error: 'Solution not found',
        });
      }

      solution.status = input.status;
      solution.moderationNote =
        input.moderationNote;

      if (input.status === 'approved') {
        solution.approvedAt = new Date();
        solution.approvedBy =
          req.admin?._id ||
          req.admin?.id ||
          null;
      } else {
        solution.approvedAt = null;
        solution.approvedBy = null;
      }

      await solution.save();

      const populated =
        await QuestionSolution.findById(
          solution._id
        )
          .populate(
            'questionId',
            '_id questionLabel questionText subject subjectCode year examType'
          )
          .lean();

      res.json({
        message:
          input.status === 'approved'
            ? 'Solution approved.'
            : 'Solution rejected.',
        solution: adminSolution(populated),
      });
    } catch (error) {
      const status = error.statusCode || 500;

      if (status >= 500) {
        console.error(
          'Admin solution moderation failed:',
          error
        );
      }

      res.status(status).json({
        error:
          status >= 500
            ? 'Failed to moderate solution'
            : error.message,
      });
    }
  });

  return router;
};
