const VALID_STATUSES = ['pending', 'approved', 'rejected'];

function cleanText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim();
}

function sanitizeAnswerText(value) {
  const text = cleanText(value);

  if (text.length < 20) {
    const error = new Error(
      'Solution must contain at least 20 characters.'
    );
    error.statusCode = 400;
    throw error;
  }

  if (text.length > 12000) {
    const error = new Error(
      'Solution cannot exceed 12000 characters.'
    );
    error.statusCode = 400;
    throw error;
  }

  return text;
}

function sanitizeModerationNote(value) {
  return cleanText(value).slice(0, 500);
}

function canAuthorEdit(solution = {}) {
  return ['pending', 'rejected'].includes(
    String(solution.status || '')
  );
}

function normalizeModerationInput(body = {}) {
  const status = String(body.status || '').trim().toLowerCase();

  if (!['approved', 'rejected'].includes(status)) {
    const error = new Error(
      'Status must be approved or rejected.'
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    status,
    moderationNote: sanitizeModerationNote(
      body.moderationNote
    ),
  };
}

function publicSolution(solution = {}) {
  return {
    _id: solution._id,
    questionId: solution.questionId,
    paperId: solution.paperId,
    authorName: solution.authorName || 'Student',
    answerText: solution.answerText || '',
    helpfulCount: Number(solution.helpfulCount || 0),
    status: solution.status || 'pending',
    approvedAt: solution.approvedAt || null,
    createdAt: solution.createdAt,
    updatedAt: solution.updatedAt,
  };
}

function ownSolution(solution = {}) {
  return {
    ...publicSolution(solution),
    moderationNote: solution.moderationNote || '',
    canEdit: canAuthorEdit(solution),
  };
}

function adminSolution(solution = {}) {
  const question =
    solution.questionId &&
    typeof solution.questionId === 'object'
      ? solution.questionId
      : null;

  return {
    ...ownSolution(solution),
    authorUserId: solution.authorUserId,
    question: question
      ? {
          _id: question._id,
          questionLabel: question.questionLabel || '',
          questionText: question.questionText || '',
          subject: question.subject || '',
          subjectCode: question.subjectCode || '',
          year: question.year ?? null,
          examType: question.examType || '',
        }
      : null,
  };
}

function statusCounts(rows = []) {
  return rows.reduce(
    (acc, row) => {
      const status = VALID_STATUSES.includes(row.status)
        ? row.status
        : 'pending';

      acc.total += 1;
      acc[status] += 1;
      return acc;
    },
    {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    }
  );
}

module.exports = {
  VALID_STATUSES,
  adminSolution,
  canAuthorEdit,
  cleanText,
  normalizeModerationInput,
  ownSolution,
  publicSolution,
  sanitizeAnswerText,
  sanitizeModerationNote,
  statusCounts,
};
