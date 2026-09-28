const express = require('express');
const mongoose = require('mongoose');

const Question = require('../models/Question');
const QuestionSolution = require('../models/QuestionSolution');

const {
  evaluateBatchWithMode,
  evaluationAiEnabled,
  evaluationAiModel,
} = require('../services/mockEvaluationAiService');

const router = express.Router();

router.get('/status', (req, res) => {
  res.json({
    aiAvailable: evaluationAiEnabled(),
    aiModel: evaluationAiEnabled()
      ? evaluationAiModel()
      : null,
  });
});

router.post('/evaluate', async (req, res) => {
  try {
    const answers = Array.isArray(req.body?.answers)
      ? req.body.answers
      : [];

    const mode = req.body?.mode === 'ai'
      ? 'ai'
      : 'local';

    if (!answers.length) {
      return res.status(400).json({
        error: 'At least one mock answer is required.',
      });
    }

    if (answers.length > 30) {
      return res.status(400).json({
        error: 'A maximum of 30 questions can be evaluated at once.',
      });
    }

    const cleanAnswers = answers
      .map((item) => ({
        questionId: String(item?.questionId || ''),
        answerText: String(item?.answerText || '').slice(0, 12000),
      }))
      .filter((item) =>
        mongoose.Types.ObjectId.isValid(item.questionId)
      );

    if (!cleanAnswers.length) {
      return res.status(400).json({
        error: 'No valid question IDs were provided.',
      });
    }

    const objectIds = cleanAnswers.map(
      (item) => new mongoose.Types.ObjectId(item.questionId)
    );

    const questions = await Question.find({
      _id: { $in: objectIds },
      status: { $ne: 'rejected' },
    })
      .lean();

    const questionById = new Map(
      questions.map((question) => [
        String(question._id),
        question,
      ])
    );

    const solutionRows = await QuestionSolution.find({
      questionId: { $in: objectIds },
      status: 'approved',
    })
      .sort({
        helpfulCount: -1,
        approvedAt: 1,
      })
      .lean();

    const solutionsByQuestion = new Map();

    solutionRows.forEach((solution) => {
      const key = String(solution.questionId);

      if (!solutionsByQuestion.has(key)) {
        solutionsByQuestion.set(key, []);
      }

      solutionsByQuestion.get(key).push(solution);
    });

    const items = cleanAnswers
      .map((answer) => {
        const question = questionById.get(answer.questionId);

        if (!question) {
          return null;
        }

        return {
          question,
          answerText: answer.answerText,
          approvedSolutions:
            solutionsByQuestion.get(answer.questionId) || [],
        };
      })
      .filter(Boolean);

    if (!items.length) {
      return res.status(404).json({
        error: 'No matching PaperStack questions were found.',
      });
    }

    const evaluation = await evaluateBatchWithMode(
      items,
      mode
    );

    res.json({
      mockId: String(req.body?.mockId || ''),
      requestedMode: mode,
      aiAvailable: evaluationAiEnabled(),
      evaluatedAt: new Date().toISOString(),
      disclaimer:
        'Scores are PaperStack practice estimates, not official IIIT Surat grades.',
      ...evaluation,
    });
  } catch (error) {
    console.error(
      'Mock evaluation failed:',
      error
    );

    res.status(500).json({
      error: 'Failed to evaluate mock answers',
    });
  }
});

module.exports = router;
