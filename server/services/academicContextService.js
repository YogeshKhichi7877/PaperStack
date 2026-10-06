const Paper = require('../models/Paper');
const Question = require('../models/Question');
const QuestionSolution = require('../models/QuestionSolution');
const Resource = require('../models/Resource');
const StudyActivity = require('../models/StudyActivity');

function plain(value) {
  if (!value) return null;
  return typeof value.toObject === 'function' ? value.toObject() : value;
}

function compactQuestion(value) {
  const question = plain(value);
  if (!question) return null;
  const sourcePaper = question.paperId && typeof question.paperId === 'object'
    ? question.paperId : question.paper;
  return {
    _id: String(question._id || ''),
    paperId: String(question.paperId?._id || question.paperId || ''),
    questionLabel: question.questionLabel || '',
    questionText: question.questionText || '',
    subject: question.subject || '',
    subjectCode: question.subjectCode || '',
    subjectKey: question.subjectKey || '',
    branch: question.branch || '',
    semester: question.semester ?? null,
    examType: question.examType || '',
    year: question.year ?? null,
    marks: question.marks ?? null,
    questionType: question.questionType || '',
    difficulty: question.difficulty || 'unknown',
    primaryTopic: question.primaryTopic || '',
    topics: Array.isArray(question.topics) ? question.topics : [],
    status: question.status || '',
    sourceLocation: question.sourceLocation || {},
    extraction: question.extraction || {},
    ...(sourcePaper ? { paper: compactPaper(sourcePaper) } : {}),
  };
}

function compactPaper(value) {
  const paper = plain(value);
  if (!paper) return null;
  return {
    _id: String(paper._id || ''),
    title: paper.title || '',
    subject: paper.subject || '',
    subjectCode: paper.subjectCode || '',
    branch: paper.branch || '',
    semester: paper.semester ?? null,
    examType: paper.examType || '',
    year: paper.year ?? null,
    filePath: paper.filePath || '',
    solutionPath: paper.solutionPath || '',
    questionCount: Number(paper.questionCount || 0),
  };
}

function compactSolution(value) {
  const solution = plain(value);
  return {
    _id: String(solution?._id || ''),
    questionId: String(solution?.questionId || ''),
    answerText: String(solution?.answerText || ''),
    authorName: String(solution?.authorName || 'Student'),
    helpfulCount: Number(solution?.helpfulCount || 0),
    approvedAt: solution?.approvedAt || null,
  };
}

function compactResource(value) {
  const resource = plain(value);
  return {
    _id: String(resource?._id || ''),
    title: String(resource?.title || ''),
    kind: String(resource?.kind || ''),
    fileUrl: String(resource?.fileUrl || ''),
    contentText: String(resource?.contentText || '').slice(0, 4000),
    topics: Array.isArray(resource?.topics) ? resource.topics : [],
  };
}

async function defaultLoaders() {
  return {
    loadQuestion: async (id) => Question.findOne({ _id: id, status: { $ne: 'rejected' }, needsReview: { $ne: true } }).populate('paperId', '_id title filePath solutionPath').lean(),
    loadPaper: async (id) => Paper.findById(id).lean(),
    loadSolutions: async (questionId) => QuestionSolution.find({ questionId, status: 'approved' })
      .sort({ helpfulCount: -1, approvedAt: 1 }).limit(5).lean(),
    loadRelated: async (question) => Question.find({
      _id: { $ne: question._id }, subjectCode: question.subjectCode, status: { $ne: 'rejected' }, needsReview: { $ne: true },
    }).sort({ year: -1, sequence: 1 }).limit(180).populate('paperId', '_id title filePath solutionPath').lean(),
    loadResources: async (subject) => Resource.find({
      status: 'active',
      ...(subject.subjectKey ? { subjectKey: subject.subjectKey } : { subjectCode: subject.subjectCode }),
    }).sort({ year: -1, createdAt: -1 }).limit(12).lean(),
    loadTopicStats: async (subject) => Question.aggregate([
      { $match: { subjectCode: subject.subjectCode, status: { $ne: 'rejected' }, needsReview: { $ne: true } } },
      { $project: { topic: '$primaryTopic', marks: 1, year: 1 } },
      { $match: { topic: { $nin: ['', null] } } },
      { $group: { _id: '$topic', questionCount: { $sum: 1 }, totalMarks: { $sum: { $ifNull: ['$marks', 0] } }, years: { $addToSet: '$year' } } },
      { $sort: { questionCount: -1, _id: 1 } },
      { $limit: 30 },
    ]),
    loadArchiveStats: async (subject) => Question.aggregate([
      { $match: { subjectCode: subject.subjectCode, status: { $ne: 'rejected' }, needsReview: { $ne: true } } },
      { $group: { _id: null, questionCount: { $sum: 1 }, years: { $addToSet: '$year' }, papers: { $addToSet: '$paperId' } } },
    ]),
    loadStudentContext: async (userId) => StudyActivity.find({ userId }).sort({ dayKey: -1 }).limit(30).lean(),
  };
}

async function buildAcademicContext(options = {}, dependencies = {}) {
  const loaders = { ...(await defaultLoaders()), ...dependencies };
  const context = {};
  let question = options.questionId ? await loaders.loadQuestion(options.questionId) : null;
  let paper = options.paperId ? await loaders.loadPaper(options.paperId) : plain(question?.paperId);
  if (question) context.question = compactQuestion(question);
  if (paper) context.paper = compactPaper(paper);

  const subject = {
    subject: question?.subject || paper?.subject || '',
    subjectCode: String(options.subjectId || question?.subjectCode || paper?.subjectCode || '').toUpperCase(),
    subjectKey: question?.subjectKey || '',
    branch: question?.branch || paper?.branch || '',
    semester: question?.semester ?? paper?.semester ?? null,
  };
  if (subject.subjectCode || subject.subject) context.subject = subject;

  if (question && options.includeSolutions) {
    context.approvedSolutions = (await loaders.loadSolutions(question._id)).map(compactSolution);
  }
  if (question && options.includeRelatedQuestions) {
    context.relatedQuestions = (await loaders.loadRelated(question)).map(compactQuestion);
  }
  if ((subject.subjectCode || subject.subjectKey) && options.includeResources) {
    context.resources = (await loaders.loadResources(subject)).map(compactResource);
  }
  if (subject.subjectCode && options.includeTopicStats) {
    context.topicStats = (await loaders.loadTopicStats(subject)).map((row) => ({
      topic: String(row._id || ''), questionCount: Number(row.questionCount || 0),
      totalMarks: Number(row.totalMarks || 0), years: (row.years || []).filter(Boolean).sort((a, b) => b - a),
    }));
  }
  if (subject.subjectCode && options.includeArchiveStats) {
    const stats = (await loaders.loadArchiveStats(subject))[0] || {};
    context.archiveStats = {
      questionCount: Number(stats.questionCount || 0),
      paperCount: Array.isArray(stats.papers) ? stats.papers.length : 0,
      years: (stats.years || []).filter(Boolean).sort((a, b) => b - a),
    };
  }
  if (options.userId && options.includeStudentContext) {
    const activity = await loaders.loadStudentContext(options.userId);
    context.studentContext = {
      activeDays: activity.length,
      recentCategories: [...new Set(activity.flatMap((item) => item.categories || []))],
    };
  }
  if (options.examType) context.examType = String(options.examType);
  return context;
}

module.exports = {
  buildAcademicContext,
  compactPaper,
  compactQuestion,
  compactResource,
  compactSolution,
};
