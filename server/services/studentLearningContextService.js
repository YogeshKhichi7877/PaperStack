const UserTopicMastery = require('../models/UserTopicMastery');
const QuestionAttempt = require('../models/QuestionAttempt');
const Question = require('../models/Question');
const UserNote = require('../models/UserNote');
const DailyLearningCheckin = require('../models/DailyLearningCheckin');

function inferLearningLevel(mastery) {
  const attempts = Number(mastery?.totalAttempts || 0);
  const score = Number(mastery?.masteryScore ?? 50);
  const confidence = Number(mastery?.masteryConfidence || 0);
  if (!attempts || confidence < 0.12 || score < 40) return 'BEGINNER';
  if (score < 65 || confidence < 0.35) return 'DEVELOPING';
  if (score < 82 || confidence < 0.55) return 'COMFORTABLE';
  return 'STRONG';
}

function compact(value, max = 280) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

async function buildStudentLearningContext({ userId, subjectCode, topicKey }, dependencies = {}) {
  const MasteryModel = dependencies.MasteryModel || UserTopicMastery;
  const AttemptModel = dependencies.AttemptModel || QuestionAttempt;
  const QuestionModel = dependencies.QuestionModel || Question;
  const NoteModel = dependencies.NoteModel || UserNote;
  const CheckinModel = dependencies.CheckinModel || DailyLearningCheckin;
  const code = String(subjectCode || '').trim().toUpperCase();
  const topic = String(topicKey || '').trim();
  const [mastery, attempts, doubts, checkins] = await Promise.all([
    MasteryModel.findOne({ userId, topicKey: topic }).lean(),
    AttemptModel.find({ userId, subjectCode: code, topicKeys: topic }).sort({ createdAt: -1 }).limit(12).lean(),
    NoteModel.find({ userId, subjectCode: code, topicKey: topic, type: 'DOUBT', status: { $in: ['OPEN', 'IMPROVING'] } }).sort({ createdAt: -1 }).limit(5).lean(),
    CheckinModel.find({ userId, subjectCode: code, 'topics.topicKey': topic }).sort({ createdAt: -1 }).limit(5).lean(),
  ]);
  const incorrect = attempts.filter((item) => Number(item.actualScore) < 0.7).slice(0, 5);
  const questionIds = incorrect.map((item) => item.questionId).filter(Boolean);
  const questions = questionIds.length
    ? await QuestionModel.find({ _id: { $in: questionIds } }).select('questionText primaryTopic').lean()
    : [];
  const questionById = new Map(questions.map((item) => [String(item._id), item]));
  return {
    subjectCode: code,
    topicKey: topic,
    mastery: mastery ? {
      score: mastery.masteryScore,
      confidence: mastery.masteryConfidence,
      status: mastery.status,
      attempts: mastery.totalAttempts,
      nextReviewAt: mastery.nextReviewAt,
    } : { score: 50, confidence: 0, status: 'NOT_PRACTICED', attempts: 0, nextReviewAt: null },
    learningLevel: inferLearningLevel(mastery),
    recentMistakes: incorrect.map((attempt) => ({
      question: compact(questionById.get(String(attempt.questionId))?.questionText),
      studentAnswer: compact(attempt.answer),
      score: attempt.actualScore,
    })),
    openDoubts: doubts.map((item) => compact(item.content, 400)),
    recentPractice: attempts.slice(0, 8).map((item) => ({ score: item.actualScore, difficulty: item.difficulty, at: item.createdAt })),
    classLearning: checkins.map((item) => compact(item.originalText, 400)),
  };
}

module.exports = { buildStudentLearningContext, compact, inferLearningLevel };
