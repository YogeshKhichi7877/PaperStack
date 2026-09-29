const express = require('express');
const mongoose = require('mongoose');

const { buildAcademicContext } = require('../services/academicContextService');

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
  const academic = await buildAcademicContext({
    questionId,
    includeSolutions: true,
    includeRelatedQuestions: true,
  });
  const question = academic.question;
  if (!question || question.status === 'rejected') {
    return null;
  }
  const approvedSolutions = academic.approvedSolutions || [];
  const candidateQuestions = academic.relatedQuestions || [];

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
    academic,
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
