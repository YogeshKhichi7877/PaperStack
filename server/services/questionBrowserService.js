const { publicQuestion } = require('./questionService');
const { branchQueryValues } = require('../utils/branches');

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toInteger(value, { min = null, max = null } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  if (min !== null && parsed < min) return null;
  if (max !== null && parsed > max) return null;
  return parsed;
}

function toNumber(value, { min = null, max = null } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (min !== null && parsed < min) return null;
  if (max !== null && parsed > max) return null;
  return parsed;
}

function normalizeBrowserQuery(query = {}) {
  return {
    q: String(query.q || '').trim(),
    subjectKey: String(query.subjectKey || '').trim(),
    subjectCode: String(query.subjectCode || '').trim().toUpperCase(),
    branch: String(query.branch || '').trim(),
    semester: toInteger(query.semester, { min: 1, max: 8 }),
    year: toInteger(query.year, { min: 1900, max: 2200 }),
    examType: String(query.examType || '').trim(),
    marks: toNumber(query.marks, { min: 0, max: 100 }),
    unit: toInteger(query.unit, { min: 1, max: 20 }),
    questionType: String(query.questionType || '').trim(),
    difficulty: String(query.difficulty || '').trim().toLowerCase(),
    topic: String(query.topic || '').trim(),
    needsReview:
      query.needsReview === 'true'
        ? true
        : query.needsReview === 'false'
          ? false
          : null,
    sort: String(query.sort || 'latest').trim().toLowerCase(),
    page: toInteger(query.page, { min: 1 }) || 1,
    limit: toInteger(query.limit, { min: 1, max: 100 }) || 24,
  };
}

function buildQuestionFilter(query = {}) {
  const filters = normalizeBrowserQuery(query);
  const filter = {
    status: { $ne: 'rejected' },
    needsReview: { $ne: true },
  };

  if (filters.q) {
    filter.$text = { $search: filters.q };
  }

  if (filters.subjectKey) filter.subjectKey = filters.subjectKey;
  if (filters.subjectCode) filter.subjectCode = filters.subjectCode;
  if (filters.branch) filter.branch = { $in: branchQueryValues(filters.branch) };
  if (filters.semester !== null) filter.semester = filters.semester;
  if (filters.year !== null) filter.year = filters.year;
  if (filters.examType) filter.examType = filters.examType;
  if (filters.marks !== null) filter.marks = filters.marks;
  if (filters.unit !== null) filter.unit = filters.unit;
  if (filters.questionType) filter.questionType = filters.questionType;

  if (
    filters.difficulty &&
    ['unknown', 'easy', 'medium', 'hard'].includes(filters.difficulty)
  ) {
    filter.difficulty = filters.difficulty;
  }

  // Public browsing cannot opt into unpublished review candidates.

  if (filters.topic) {
    const topicRegex = new RegExp(escapeRegex(filters.topic), 'i');
    filter.$or = [
      { primaryTopic: topicRegex },
      { topics: topicRegex },
    ];
  }

  return filter;
}

function buildQuestionSort(sort = 'latest') {
  switch (String(sort || '').toLowerCase()) {
    case 'oldest':
      return { year: 1, sequence: 1, createdAt: 1 };
    case 'marks-high':
      return { marks: -1, year: -1, sequence: 1 };
    case 'marks-low':
      return { marks: 1, year: -1, sequence: 1 };
    case 'question-order':
      return { subjectCode: 1, year: -1, sequence: 1 };
    case 'latest':
    default:
      return { year: -1, createdAt: -1, sequence: 1 };
  }
}

function browserQuestion(question = {}) {
  const populatedPaper =
    question.paperId &&
    typeof question.paperId === 'object' &&
    question.paperId._id
      ? question.paperId
      : null;

  const source = {
    ...question,
    paperId: populatedPaper?._id || question.paperId,
  };

  const serialized = publicQuestion(source);

  return {
    ...serialized,
    paper: populatedPaper
      ? {
          _id: populatedPaper._id,
          title: populatedPaper.title || '',
          filePath: populatedPaper.filePath || '',
          solutionPath: populatedPaper.solutionPath || '',
          questionExtractionStatus:
            populatedPaper.questionExtractionStatus || 'not_started',
        }
      : null,
  };
}

module.exports = {
  browserQuestion,
  buildQuestionFilter,
  buildQuestionSort,
  escapeRegex,
  normalizeBrowserQuery,
  toInteger,
  toNumber,
};
