const ISSUE_LABELS = {
  wrong_subject: 'Wrong subject',
  wrong_branch: 'Wrong branch',
  wrong_semester: 'Wrong semester',
  wrong_year: 'Wrong year',
  wrong_exam_type: 'Wrong exam type',
  unreadable_pdf: 'PDF unreadable',
  duplicate: 'Duplicate paper',
  solution_issue: 'Solution issue',
  other: 'Other issue',
};

const VALID_ISSUE_TYPES = Object.keys(ISSUE_LABELS);

function sanitizeIssueTypes(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(
    value
      .map((item) => String(item || '').trim())
      .filter((item) => VALID_ISSUE_TYPES.includes(item))
  )];
}

function percentage(part, total) {
  if (!total) return null;
  return Math.round((part / total) * 100);
}

function isCleanVerification(item = {}) {
  return (
    item.metadataCorrect !== false &&
    item.pdfReadable !== false &&
    sanitizeIssueTypes(item.issueTypes).length === 0
  );
}

function buildVerificationSummary(verifications = []) {
  const totalResponses = verifications.length;
  const metadataResponses = verifications.filter((item) => typeof item.metadataCorrect === 'boolean');
  const readableResponses = verifications.filter((item) => typeof item.pdfReadable === 'boolean');

  const metadataCorrectCount = metadataResponses.filter((item) => item.metadataCorrect === true).length;
  const readableCount = readableResponses.filter((item) => item.pdfReadable === true).length;
  const cleanCount = verifications.filter(isCleanVerification).length;
  const issueCount = verifications.filter((item) => !isCleanVerification(item)).length;

  const issueCounts = {};
  verifications.forEach((item) => {
    sanitizeIssueTypes(item.issueTypes).forEach((type) => {
      issueCounts[type] = (issueCounts[type] || 0) + 1;
    });
  });

  let status = 'unverified';

  if (totalResponses > 0) {
    const issueRatio = issueCount / totalResponses;
    const cleanRatio = cleanCount / totalResponses;

    if (issueRatio >= 0.34 && issueCount >= 2) {
      status = 'needs-review';
    } else if (
      totalResponses >= 3 &&
      cleanRatio >= 0.75 &&
      (metadataResponses.length === 0 || metadataCorrectCount / metadataResponses.length >= 0.75) &&
      (readableResponses.length === 0 || readableCount / readableResponses.length >= 0.75)
    ) {
      status = 'verified';
    } else {
      status = 'collecting';
    }
  }

  const statusLabels = {
    unverified: 'Unverified',
    collecting: 'Collecting confirmations',
    verified: 'Community verified',
    'needs-review': 'Needs review',
  };

  const issueBreakdown = Object.entries(issueCounts)
    .map(([type, count]) => ({
      type,
      label: ISSUE_LABELS[type] || type,
      count,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    status,
    statusLabel: statusLabels[status],
    totalResponses,
    cleanCount,
    issueCount,
    cleanPercentage: percentage(cleanCount, totalResponses),
    metadataCorrectPercentage: percentage(metadataCorrectCount, metadataResponses.length),
    pdfReadablePercentage: percentage(readableCount, readableResponses.length),
    issueBreakdown,
  };
}

function normalizeVerificationInput(body = {}) {
  const metadataCorrect = typeof body.metadataCorrect === 'boolean'
    ? body.metadataCorrect
    : null;
  const pdfReadable = typeof body.pdfReadable === 'boolean'
    ? body.pdfReadable
    : null;
  const issueTypes = sanitizeIssueTypes(body.issueTypes);
  const note = String(body.note || '').trim().slice(0, 500);

  if (
    metadataCorrect === null &&
    pdfReadable === null &&
    issueTypes.length === 0 &&
    !note
  ) {
    const error = new Error('Choose at least one verification option.');
    error.statusCode = 400;
    throw error;
  }

  return {
    metadataCorrect,
    pdfReadable,
    issueTypes,
    note,
  };
}

module.exports = {
  ISSUE_LABELS,
  VALID_ISSUE_TYPES,
  buildVerificationSummary,
  isCleanVerification,
  normalizeVerificationInput,
  sanitizeIssueTypes,
};
