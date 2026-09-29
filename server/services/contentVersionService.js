const crypto = require('node:crypto');

function canonicalize(value) {
  if (value === null || value === undefined) return value ?? null;
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }
  return typeof value === 'string' ? value.normalize('NFKC').trim() : value;
}

function buildContentVersion(value) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function questionContentVersion(question = {}, solutions = []) {
  return buildContentVersion({
    question: {
      id: String(question._id || ''),
      text: question.questionText || '',
      subjectCode: question.subjectCode || '',
      marks: question.marks ?? null,
      topics: question.topics || [],
      status: question.status || '',
      updatedAt: question.updatedAt || null,
    },
    approvedSolutions: (solutions || []).map((solution) => ({
      id: String(solution._id || ''),
      answerText: solution.answerText || '',
      updatedAt: solution.updatedAt || solution.approvedAt || null,
    })),
  });
}

module.exports = {
  buildContentVersion,
  canonicalize,
  questionContentVersion,
};
