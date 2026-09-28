const express =
  require('express');

const Question =
  require('../models/Question');

const QuestionSolution =
  require('../models/QuestionSolution');

const {
  generateMockWithMode,
  mockAiEnabled,
  mockAiModel,
} = require(
  '../services/mockExamAiService'
);

const router =
  express.Router();

router.get(
  '/subjects',
  async (
    req,
    res
  ) => {
    try {
      const rows =
        await Question.aggregate([
          {
            $match: {
              status: {
                $ne:
                  'rejected',
              },
              subjectCode: {
                $nin: [
                  '',
                  null,
                ],
              },
            },
          },
          {
            $group: {
              _id: {
                subjectCode:
                  '$subjectCode',
                subject:
                  '$subject',
                branch:
                  '$branch',
                semester:
                  '$semester',
              },
              totalQuestions: {
                $sum: 1,
              },
              examTypes: {
                $addToSet:
                  '$examType',
              },
              years: {
                $addToSet:
                  '$year',
              },
            },
          },
          {
            $sort: {
              '_id.subject':
                1,
            },
          },
        ]);

      res.json({
        aiAvailable:
          mockAiEnabled(),
        aiModel:
          mockAiEnabled()
            ? mockAiModel()
            : null,
        subjects:
          rows.map(
            (
              row
            ) => ({
              subjectCode:
                row._id
                  .subjectCode ||
                '',
              subject:
                row._id
                  .subject ||
                '',
              branch:
                row._id
                  .branch ||
                '',
              semester:
                row._id
                  .semester ??
                null,
              totalQuestions:
                row
                  .totalQuestions,
              examTypes:
                row
                  .examTypes
                  .filter(
                    Boolean
                  )
                  .sort(),
              years:
                row
                  .years
                  .filter(
                    Boolean
                  )
                  .sort(
                    (
                      a,
                      b
                    ) =>
                      b - a
                  ),
            })
          ),
      });
    } catch (
      error
    ) {
      console.error(
        'Mock exam subjects failed:',
        error
      );

      res
        .status(500)
        .json({
          error:
            'Failed to load mock-exam subjects',
        });
    }
  }
);

router.post(
  '/generate',
  async (
    req,
    res
  ) => {
    try {
      const subjectCode =
        String(
          req.body
            ?.subjectCode ||
          ''
        )
          .trim()
          .toUpperCase();

      const examType =
        String(
          req.body
            ?.examType ||
          ''
        ).trim();

      const totalMarks =
        Number(
          req.body
            ?.totalMarks ||
          25
        );

      const durationMinutes =
        Number(
          req.body
            ?.durationMinutes ||
          60
        );

      const strategy =
        [
          'balanced',
          'repeat-focused',
          'broad-coverage',
        ].includes(
          req.body
            ?.strategy
        )
          ? req.body
              .strategy
          : 'balanced';

      const mode =
        req.body
          ?.mode ===
        'ai'
          ? 'ai'
          : 'local';

      const seed =
        String(
          req.body
            ?.seed ||
          Date.now()
        );

      if (
        !subjectCode
      ) {
        return res
          .status(400)
          .json({
            error:
              'Subject code is required',
          });
      }

      const filter = {
        subjectCode,
        status: {
          $ne:
            'rejected',
        },
      };

      if (
        examType
      ) {
        filter.examType =
          examType;
      }

      const questions =
        await Question.find(
          filter
        )
          .sort({
            year: -1,
            sequence: 1,
          })
          .limit(1500)
          .populate(
            'paperId',
            '_id title filePath solutionPath'
          )
          .lean();

      if (
        !questions.length
      ) {
        return res
          .status(404)
          .json({
            error:
              'No extracted questions are available for this subject/exam filter.',
          });
      }

      const questionIds =
        questions.map(
          (
            question
          ) =>
            question._id
        );

      const solutionRows =
        await QuestionSolution.aggregate([
          {
            $match: {
              questionId: {
                $in:
                  questionIds,
              },
              status:
                'approved',
            },
          },
          {
            $group: {
              _id:
                '$questionId',
              count: {
                $sum: 1,
              },
            },
          },
        ]);

      const solutionCounts =
        Object.fromEntries(
          solutionRows.map(
            (
              row
            ) => [
              String(
                row._id
              ),
              row.count,
            ]
          )
        );

      const enriched =
        questions.map(
          (
            question
          ) => ({
            ...question,
            approvedSolutionCount:
              solutionCounts[
                String(
                  question._id
                )
              ] ||
              0,
          })
        );

      const first =
        enriched[0];

      const mock =
        await generateMockWithMode(
          enriched,
          {
            subject: {
              subjectCode,
              subject:
                first
                  ?.subject ||
                '',
              branch:
                first
                  ?.branch ||
                '',
              semester:
                first
                  ?.semester ??
                null,
            },
            examType,
            totalMarks,
            durationMinutes,
            strategy,
            seed,
            mode,
          }
        );

      res.json({
        generatedAt:
          new Date()
            .toISOString(),
        questionLimitApplied:
          questions
            .length >=
          1500,
        aiAvailable:
          mockAiEnabled(),
        ...mock,
      });
    } catch (
      error
    ) {
      console.error(
        'Mock exam generation failed:',
        error
      );

      res
        .status(500)
        .json({
          error:
            'Failed to generate mock exam',
        });
    }
  }
);

module.exports =
  router;
