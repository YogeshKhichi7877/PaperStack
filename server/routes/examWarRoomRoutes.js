const express = require('express');

const Question = require('../models/Question');
const QuestionSolution = require('../models/QuestionSolution');
const Resource = require('../models/Resource');
const { warAiBriefing } = require('../services/studyAiService');

const {
  buildExamWarRoom,
  clampMinutes,
} = require('../services/examWarRoomService');

const router = express.Router();

const CACHE_TTL_MS =
  3 * 60 * 1000;

const cache = new Map();

function cacheKey(
  subjectCode,
  examType,
  threshold,
  minutes
) {
  return [
    String(
      subjectCode || ''
    ).toUpperCase(),
    String(
      examType || ''
    ).toLowerCase(),
    Number(threshold) || 72,
    clampMinutes(minutes),
  ].join('|');
}

function getCached(key) {
  const item = cache.get(key);

  if (!item) {
    return null;
  }

  if (
    Date.now() -
      item.createdAt >
    CACHE_TTL_MS
  ) {
    cache.delete(key);
    return null;
  }

  return item.payload;
}

function setCached(
  key,
  payload
) {
  cache.set(
    key,
    {
      createdAt: Date.now(),
      payload,
    }
  );
}

router.get('/subjects', async (req, res) => {
  try {
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    const rows =
      await Question.aggregate([
        {
          $match: {
            status: {
              $ne: 'rejected',
            },
            subjectCode: {
              $nin: ['', null],
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
              subjectKey:
                '$subjectKey',
              shortCode:
                '$shortCode',
              branch:
                '$branch',
              semester:
                '$semester',
            },
            totalQuestions: {
              $sum: 1,
            },
            years: {
              $addToSet: '$year',
            },
            examTypes: {
              $addToSet:
                '$examType',
            },
          },
        },
        {
          $sort: {
            '_id.subject': 1,
          },
        },
      ]);

    res.json({
      subjects:
        rows.map((row) => ({
          subjectCode:
            row._id.subjectCode ||
            '',
          subject:
            row._id.subject ||
            '',
          subjectKey:
            row._id.subjectKey ||
            '',
          shortCode:
            row._id.shortCode ||
            '',
          branch:
            row._id.branch ||
            '',
          semester:
            row._id.semester ??
            null,
          totalQuestions:
            row.totalQuestions,
          years:
            row.years
              .filter(Boolean)
              .sort(
                (a, b) => b - a
              ),
          examTypes:
            row.examTypes
              .filter(Boolean)
              .sort(),
        })),
    });
  } catch (error) {
    console.error(
      'Exam War Room subjects failed:',
      error
    );

    res.status(500).json({
      error:
        'Failed to load Exam War Room subjects',
    });
  }
});

router.get(
  '/subject/:subjectCode',
  async (req, res) => {
    try {
      const subjectCode =
        String(
          req.params
            .subjectCode || ''
        )
          .trim()
          .toUpperCase();

      const examType =
        String(
          req.query.examType ||
          ''
        ).trim();

      const threshold =
        Number(
          req.query.threshold ||
          72
        );

      const minutes =
        clampMinutes(
          req.query.minutes ||
          60
        );

      if (!subjectCode) {
        return res.status(400).json({
          error:
            'Subject code is required',
        });
      }

      const key =
        cacheKey(
          subjectCode,
          examType,
          threshold,
          minutes
        );

      const cached =
        getCached(key);

      if (cached) {
        return res.json({
          ...cached,
          cached: true,
        });
      }

      const filter = {
        subjectCode,
        status: {
          $ne: 'rejected',
        },
      };

      if (examType) {
        filter.examType =
          examType;
      }

      filter.needsReview = { $ne: true };

      const questions =
        await Question.find(
          filter
        )
          .sort({
            year: -1,
            sequence: 1,
          })
          .limit(1200)
          .select('_id paperId questionNumber questionLabel questionText marks questionType difficulty unit primaryTopic topics sourceLocation subjectKey subject subjectCode shortCode branch semester examType year extraction status')
          .populate(
            'paperId',
            '_id title filePath solutionPath'
          )
          .lean();

      const questionIds =
        questions.map(
          (question) =>
            question._id
        );

      const solutionRows =
        questionIds.length
          ? await QuestionSolution.aggregate([
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
            ])
          : [];

      const solutionCounts =
        Object.fromEntries(
          solutionRows.map(
            (row) => [
              String(row._id),
              row.count,
            ]
          )
        );

      const [solutions, resources] = await Promise.all([
        questionIds.length
          ? QuestionSolution.find({ questionId: { $in: questionIds }, status: 'approved' })
              .sort({ helpfulCount: -1, approvedAt: 1 })
              .limit(80).select('questionId answerText').lean()
          : [],
        Resource.find({ subjectCode, status: 'active', visibility: 'public' })
          .sort({ views: -1 }).limit(12)
          .select('title kind fileUrl contentText').lean(),
      ]);

      const first =
        questions[0];

      const subject = {
        subjectCode,
        subject:
          first?.subject ||
          '',
        subjectKey:
          first?.subjectKey ||
          '',
        shortCode:
          first?.shortCode ||
          '',
        branch:
          first?.branch ||
          '',
        semester:
          first?.semester ??
          null,
      };

      const room =
        buildExamWarRoom(
          questions,
          {
            subject,
            examType,
            repeatThreshold:
              threshold,
            sessionMinutes:
              minutes,
            solutionCounts,
            solutions,
            resources,
          }
        );

      room.command.aiBriefing = await warAiBriefing(room);

      const payload = {
        ...room,
        generatedAt:
          new Date()
            .toISOString(),
        questionLimitApplied:
          questions.length >=
          1200,
        cached: false,
      };

      setCached(
        key,
        payload
      );

      res.json(payload);
    } catch (error) {
      console.error(
        'Exam War Room generation failed:',
        error
      );

      res.status(500).json({
        error:
          'Failed to build Exam War Room',
      });
    }
  }
);

router.post(
  '/cache/clear',
  (req, res) => {
    cache.clear();

    res.json({
      message:
        'Exam War Room cache cleared',
    });
  }
);

module.exports = router;
