const express = require('express');
const mongoose = require('mongoose');

const Question = require('../models/Question');
const QuestionSolution = require('../models/QuestionSolution');

const {
  answerSelectedQuestion,
  publicQuestion,
  publicSolution,
  questionAiEnabled,
  rankSimilarQuestions,
} = require('../services/questionAssistantService');

const router = express.Router();

function validObjectId(value) {
  return mongoose.Types.ObjectId.isValid(
    String(value || '')
  );
}

async function loadContext(questionId) {
  const question = await Question.findById(questionId)
    .populate(
      'paperId',
      '_id title filePath solutionPath'
    )
    .lean();

  if (!question || question.status === 'rejected') {
    return null;
  }

  const approvedSolutions = await QuestionSolution.find({
    questionId: question._id,
    status: 'approved',
  })
    .sort({
      helpfulCount: -1,
      approvedAt: 1,
    })
    .limit(5)
    .lean();

  const candidateQuestions = await Question.find({
    _id: { $ne: question._id },
    subjectCode: question.subjectCode,
    status: { $ne: 'rejected' },
  })
    .sort({
      year: -1,
      sequence: 1,
    })
    .limit(180)
    .populate(
      'paperId',
      '_id title filePath solutionPath'
    )
    .lean();

  const similarQuestions =
    rankSimilarQuestions(
      question,
      candidateQuestions,
      6
    );

  return {
    question,
    approvedSolutions,
    candidateQuestions,
    similarQuestions,
  };
}

router.get('/:questionId/context', async (req, res) => {
  try {
    if (!validObjectId(req.params.questionId)) {
      return res.status(400).json({
        error: 'Invalid question id',
      });
    }

    const context =
      await loadContext(
        req.params.questionId
      );

    if (!context) {
      return res.status(404).json({
        error: 'Question not found',
      });
    }

    res.json({
      aiAvailable:
        questionAiEnabled(),
      question:
        publicQuestion(
          context.question
        ),
      approvedSolutions:
        context.approvedSolutions
          .map(publicSolution),
      similarQuestions:
        context.similarQuestions
          .map(publicQuestion),
    });
  } catch (error) {
    console.error(
      'Question assistant context failed:',
      error
    );

    res.status(500).json({
      error:
        'Failed to load question assistant context',
    });
  }
});

router.post('/:questionId/query', async (req, res) => {
  try {
    if (!validObjectId(req.params.questionId)) {
      return res.status(400).json({
        error: 'Invalid question id',
      });
    }

    const query =
      String(
        req.body?.query || ''
      ).trim();

    if (!query || query.length > 1200) {
      return res.status(400).json({
        error: 'Question must be between 1 and 1200 characters',
      });
    }

    const context =
      await loadContext(
        req.params.questionId
      );

    if (!context) {
      return res.status(404).json({
        error: 'Question not found',
      });
    }

    const result =
      await answerSelectedQuestion({
        query,
        question:
          context.question,
        approvedSolutions:
          context.approvedSolutions,
        candidateQuestions:
          context.candidateQuestions,
        useAi: true,
      });

    res.json({
      query,
      ...result,
    });
  } catch (error) {
    console.error(
      'Question assistant query failed:',
      error
    );

    res.status(500).json({
      error:
        'Failed to answer this question',
    });
  }
});

module.exports = router;
