const express =
  require('express');

const Question =
  require('../models/Question');

const QuestionSolution =
  require('../models/QuestionSolution');
const GeneratedMock = require('../models/GeneratedMock');
const { generateNovelQuestions, novelQuestionAiEnabled: mockAiEnabled } = require('../services/mockNovelService');
const { generatePracticeMock } = require('../services/mockGenerationService');
const { clampNumber, publicQuestion } = require('../services/mockExamService');

const router =
  express.Router();

router.get(
  '/subjects',
  async (
    req,
    res
  ) => {
    try {
      res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
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

      const uniqueSubjects = new Map();
      for (const row of rows) {
        const code = String(row._id.subjectCode || '').trim().toUpperCase();
        if (!code) continue;
        const existing = uniqueSubjects.get(code);
        if (existing) {
          existing.totalQuestions += row.totalQuestions;
          existing.examTypes.push(...row.examTypes);
          existing.years.push(...row.years);
        } else {
          uniqueSubjects.set(code, {
            subjectCode: code,
            subject: row._id.subject || '',
            branch: row._id.branch || '',
            semester: row._id.semester ?? null,
            totalQuestions: row.totalQuestions,
            examTypes: [...row.examTypes],
            years: [...row.years],
          });
        }
      }

      res.json({
        aiAvailable:
          mockAiEnabled(),
        subjects:
          [...uniqueSubjects.values()].map((subject) => ({
            ...subject,
            examTypes: [...new Set(subject.examTypes.filter(Boolean))].sort(),
            years: [...new Set(subject.years.filter(Boolean))].sort((a, b) => b - a),
          })),
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
      const requestedMarks = clampNumber(totalMarks, 10, 100, 25);

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
      const mockType = ['pyq', 'mixed', 'new'].includes(req.body?.mockType)
        ? req.body.mockType : 'mixed';
      const difficulty = ['balanced', 'easy', 'hard'].includes(req.body?.difficulty)
        ? req.body.difficulty : 'balanced';
      const adaptiveTopics = Array.isArray(req.body?.adaptiveTopics)
        ? req.body.adaptiveTopics.slice(0, 12).map((item) => String(item).toLowerCase().trim())
        : [];


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

      if (mockType === 'new' && !mockAiEnabled()) {
        return res.status(503).json({
          error: 'Fresh Only requires AI question generation, which is unavailable right now. Try again later or choose PYQ + New.',
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

      filter.needsReview = { $ne: true };

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
            topicScore: adaptiveTopics.includes(String(question.primaryTopic || '').toLowerCase().trim())
              ? 100 : Number(question.topicScore || 0),
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

      const { mock, generated } = await generatePracticeMock(enriched, {
        subject: {
          subjectCode, subject: first?.subject || '', branch: first?.branch || '',
          semester: first?.semester ?? null,
        },
        examType, totalMarks: requestedMarks, durationMinutes, strategy, seed, mockType, difficulty,
      });
      if (generated.length) {
        await GeneratedMock.findOneAndUpdate(
          { mockId: mock.mockId },
          { mockId: mock.mockId, subjectCode, questions: generated,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
          { upsert: true, returnDocument: 'after' }
        );
      }

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
        .status(error.status || 500)
        .json({
          code: error.code || 'GENERATION_FAILED',
          error: error.status ? error.message : 'Failed to generate mock exam',
        });
    }
  }
);

router.post('/regenerate-question', async (req, res) => {
  try {
    const mockId = String(req.body?.mockId || '');
    const questionId = String(req.body?.questionId || '');
    const direction = ['similar', 'easier', 'harder', 'replace'].includes(req.body?.direction)
      ? req.body.direction : 'replace';
    const record = await GeneratedMock.findOne({ mockId });
    const current = record?.questions.find((item) => String(item._id) === questionId);
    if (!current) return res.status(404).json({ error: 'This generated mock question was not found.' });
    const source = await Question.findById(current.sourceQuestionId).lean();
    const template = source ? { ...source, marks: current.marks } : null;
    if (!template) return res.status(404).json({ error: 'The source concept is no longer available.' });
    let replacement;
    if (mockAiEnabled()) {
      for (let attempt = 0; attempt < 1 && !replacement; attempt += 1) {
        try {
          const candidates = await generateNovelQuestions([template], [template, ...record.questions], {
            subject: { subjectCode: record.subjectCode, subject: template.subject },
            examType: template.examType,
            direction, referenceQuestion: current.questionText, generationTimeoutMs: 50000,
            difficulty: direction === 'easier' ? 'easy' : direction === 'harder' ? 'hard' : current.difficulty,
          });
          replacement = candidates[0];
        } catch (error) {
          console.warn('Mock question replacement unavailable:', error.message);
          break;
        }
      }
    }
    if (!replacement) return res.json({ unchanged: true,
      message: mockAiEnabled()
        ? 'No reliable replacement was generated. Your current question is unchanged.'
        : 'AI question generation is unavailable. Your current question is unchanged.' });
    record.questions = record.questions.map((item) => String(item._id) === questionId ? replacement : item);
    record.markModified('questions');
    await record.save();
    res.json({ question: {
      ...publicQuestion(replacement, Number(req.body?.number) || 1),
      source: 'generated', aiGenerated: true, difficulty: replacement.difficulty,
    } });
  } catch (error) {
    console.error('Mock question regeneration failed:', error);
    res.status(500).json({ error: 'Could not replace this question.' });
  }
});

module.exports =
  router;
