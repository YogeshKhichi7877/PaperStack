const { normalizeBranchList, resolveSubject } = require('./subjectService');

function toIdString(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value.toString === 'function') return value.toString();
  return String(value);
}

function buildBasePaperMetadata(paper = {}) {
  const subject = resolveSubject({
    subject: paper.subject || paper.normalizedSubject,
    subjectCode: paper.subjectCode,
    shortCode: paper.shortCode,
    branch: paper.branch,
    semester: paper.semester,
  });

  return {
    subjectKey: subject.key,
    subjectCode: subject.code || String(paper.subjectCode || '').trim().toUpperCase(),
    subjectShortCode: subject.shortCode || '',
    subjectName: subject.name || paper.subject || 'Unknown Subject',
    branches: normalizeBranchList(paper.branch || subject.branches),
    semesters: [Number(paper.semester)].filter(Number.isInteger),
    examType: String(paper.examType || '').trim(),
    year: Number(paper.year) || null,
    contributorUserId: paper.contributorUserId || null,
    contributorName: paper.contributedByName || paper.contributedBy || paper.uploadedBy || '',
    topics: Array.isArray(paper.topics) ? paper.topics : [],
    units: Array.isArray(paper.units) ? paper.units : [],
  };
}

function buildQuestionPaperResource(paper = {}) {
  const id = toIdString(paper._id);
  const common = buildBasePaperMetadata(paper);

  return {
    title: paper.title || `${common.subjectName} ${common.examType || 'Question Paper'}`.trim(),
    kind: 'question_paper',
    ...common,
    fileUrl: paper.filePath || paper.paperUrl || '',
    filePublicId: paper.filePublicId || paper.paperPublicId || '',
    originalFileName: paper.originalFileName || '',
    mimeType: paper.mimeType || 'application/pdf',
    fileSize: Number(paper.fileSize) || null,
    legacyPaperId: paper._id || null,
    legacySourceKey: id ? `paper:${id}:question_paper` : '',
    sourceType: 'legacy_paper',
    status: paper.reviewStatus && paper.reviewStatus !== 'approved' ? 'pending' : 'active',
    visibility: 'public',
    views: Number(paper.views || 0),
    downloads: Number(paper.downloads || 0),
    metadata: {
      uploadMode: paper.uploadMode || 'legacy',
      extractionConfidence: Number(paper.extractionConfidence || 0),
      extractionWarnings: Array.isArray(paper.extractionWarnings) ? paper.extractionWarnings : [],
      approvedAt: paper.approvedAt || null,
    },
  };
}

function buildSolutionResource(paper = {}, parentResourceId = null) {
  const id = toIdString(paper._id);
  if (!paper.solutionPath && !paper.solutionUrl) return null;

  const common = buildBasePaperMetadata(paper);
  return {
    title: `${paper.title || common.subjectName} - Solution`,
    kind: 'solution',
    ...common,
    fileUrl: paper.solutionPath || paper.solutionUrl || '',
    filePublicId: paper.solutionPublicId || '',
    originalFileName: '',
    mimeType: 'application/pdf',
    fileSize: null,
    parentResourceId,
    legacyPaperId: paper._id || null,
    legacySourceKey: id ? `paper:${id}:solution` : '',
    sourceType: 'legacy_solution',
    status: paper.reviewStatus && paper.reviewStatus !== 'approved' ? 'pending' : 'active',
    visibility: 'public',
    views: 0,
    downloads: 0,
    metadata: {
      sourcePaperTitle: paper.title || '',
    },
  };
}

module.exports = {
  buildBasePaperMetadata,
  buildQuestionPaperResource,
  buildSolutionResource,
  toIdString,
};
