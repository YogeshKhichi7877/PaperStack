function countByStatus(rows = []) {
  return rows.reduce((result, row) => {
    const key = String(row._id || row.status || 'unknown');
    result[key] = Number(row.count || row.value || 0);
    return result;
  }, {});
}

function sumStatusCounts(counts = {}) {
  return Object.values(counts).reduce(
    (sum, value) => sum + Number(value || 0),
    0
  );
}

function dashboardLevel(xp = 0) {
  const value = Math.max(0, Number(xp || 0));
  if (value >= 2500) return 'Archive Legend';
  if (value >= 1200) return 'Campus Builder';
  if (value >= 500) return 'Archive Contributor';
  if (value >= 100) return 'Contributor';
  return 'Explorer';
}

function impactSummary({
  contributionCounts = {},
  solutionCounts = {},
  bookmarkCount = 0,
  requestCount = 0,
  verificationCount = 0,
  contributorProfile = {},
} = {}) {
  return {
    contributionTotal: sumStatusCounts(contributionCounts),
    approvedContributions: Number(contributionCounts.approved || 0),
    pendingContributions: Number(contributionCounts.pending || 0),
    correctionsNeeded: Number(contributionCounts.needs_correction || 0),
    rejectedContributions: Number(contributionCounts.rejected || 0),
    solutionsSubmitted: sumStatusCounts(solutionCounts),
    approvedSolutions: Number(solutionCounts.approved || 0),
    pendingSolutions: Number(solutionCounts.pending || 0),
    bookmarkCount: Number(bookmarkCount || 0),
    requestCount: Number(requestCount || 0),
    verificationCount: Number(verificationCount || 0),
    xp: Number(contributorProfile.xp || 0),
    rank: contributorProfile.rank ?? null,
    impactViews: Number(contributorProfile.impactViews || 0),
    impactDownloads: Number(contributorProfile.impactDownloads || 0),
    level: dashboardLevel(contributorProfile.xp),
  };
}

function sanitizeBookmark(paper = {}) {
  return {
    _id: String(paper._id || ''),
    title: paper.title || 'Question Paper',
    subject: paper.subject || '',
    subjectCode: paper.subjectCode || '',
    branch: paper.branch || '',
    semester: paper.semester ?? null,
    year: paper.year ?? null,
    examType: paper.examType || '',
    filePath: paper.filePath || '',
    solutionPath: paper.solutionPath || '',
    views: Number(paper.views || 0),
    downloads: Number(paper.downloads || 0),
  };
}

function sanitizeRequest(request = {}) {
  return {
    _id: String(request._id || ''),
    subject: request.subject || '',
    subjectCode: request.subjectCode || '',
    branch: request.branch || '',
    semester: request.semester ?? null,
    year: request.year ?? null,
    examType: request.examType || '',
    status: request.status || 'open',
    requestCount: Number(request.requestCount || 0),
    createdAt: request.createdAt || null,
    updatedAt: request.updatedAt || null,
  };
}

module.exports = {
  countByStatus,
  dashboardLevel,
  impactSummary,
  sanitizeBookmark,
  sanitizeRequest,
  sumStatusCounts,
};
