const { resolveSubject, normalizeBranchList } = require('./subjectService');

function normalizeExamType(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  if (!normalized) return '';
  if (/\b(mid|midsem|mid semester|mse)\b/.test(normalized)) return 'Mid-Sem';
  if (/\b(end|endsem|end semester|ese)\b/.test(normalized)) return 'End-Sem';
  return String(value || '').trim();
}

function parseSemester(value) {
  const match = String(value ?? '').match(/[1-8]/);
  return match ? Number(match[0]) : null;
}

function paperBranches(paper = {}) {
  const direct = normalizeBranchList(paper.branch || []);
  if (direct.length) return direct;

  const source = String(paper.title || '').toUpperCase();
  const result = [];
  if (/\bCSE\b/.test(source)) result.push('CSE');
  if (/\bECE\b/.test(source)) result.push('ECE');
  return result;
}

function paperSubjectKey(paper = {}) {
  return resolveSubject({
    subject: paper.subject || paper.normalizedSubject || paper.title,
    subjectCode: paper.subjectCode,
    shortCode: paper.shortCode,
    branch: paper.branch,
    semester: paper.semester,
  }).key;
}

function branchMatches(expectedBranch, branches) {
  const expected = String(expectedBranch || '').trim().toUpperCase();
  return branches.map((item) => String(item).trim().toUpperCase()).includes(expected);
}

function slotKey({ branch, semester, subjectKey, year, examType }) {
  return [
    String(branch || '').toUpperCase(),
    `SEM${Number(semester) || ''}`,
    String(subjectKey || '').toUpperCase(),
    Number(year) || '',
    normalizeExamType(examType),
  ].join('|');
}

function indexAvailableSlots(papers = []) {
  const available = new Set();

  papers.forEach((paper) => {
    const subjectKey = paperSubjectKey(paper);
    const semester = parseSemester(paper.semester || paper.sem);
    const year = Number(paper.year);
    const examType = normalizeExamType(paper.examType || paper.type);
    const branches = paperBranches(paper);

    if (!subjectKey || !semester || !year || !examType || !branches.length) return;

    branches.forEach((branch) => {
      available.add(slotKey({
        branch,
        semester,
        subjectKey,
        year,
        examType,
      }));
    });
  });

  return available;
}

function percentage(available, expected) {
  if (!expected) return 0;
  return Math.round((available / expected) * 1000) / 10;
}

function contributionUrl(item) {
  const params = new URLSearchParams({
    branch: item.branch,
    semester: String(item.semester),
    subject: item.subject,
    subjectCode: item.subjectCode || '',
    examType: item.examType,
    year: String(item.year),
  });

  return `/contribute?${params.toString()}`;
}

function buildArchiveCompletion({
  papers = [],
  subjectCatalog = [],
  expectedYears = [],
  expectedExamTypes = [],
} = {}) {
  const years = [...new Set(expectedYears.map(Number).filter(Boolean))].sort((a, b) => b - a);
  const examTypes = [...new Set(expectedExamTypes.map(normalizeExamType).filter(Boolean))];
  const availableSlots = indexAvailableSlots(papers);

  const branchMap = new Map();
  const subjectRows = [];
  const missingSlots = [];
  const yearMap = new Map(years.map((year) => [year, { year, expected: 0, available: 0 }]));
  const examMap = new Map(examTypes.map((examType) => [examType, { examType, expected: 0, available: 0 }]));

  subjectCatalog.forEach((catalogEntry) => {
    const branch = String(catalogEntry.branch || '').toUpperCase();
    const semester = Number(catalogEntry.semester);

    if (!branchMap.has(branch)) {
      branchMap.set(branch, {
        branch,
        expected: 0,
        available: 0,
        semesters: new Map(),
      });
    }

    const branchEntry = branchMap.get(branch);
    if (!branchEntry.semesters.has(semester)) {
      branchEntry.semesters.set(semester, {
        semester,
        expected: 0,
        available: 0,
        subjectCount: 0,
      });
    }
    const semesterEntry = branchEntry.semesters.get(semester);

    (catalogEntry.subjects || []).forEach((subject) => {
      const resolved = resolveSubject({
        subject: subject.name,
        subjectCode: subject.code,
        shortCode: subject.shortCode,
        branch,
        semester,
      });

      let expected = 0;
      let available = 0;
      const subjectMissing = [];
      const availableYears = new Set();

      years.forEach((year) => {
        examTypes.forEach((examType) => {
          expected += 1;
          branchEntry.expected += 1;
          semesterEntry.expected += 1;

          const yearEntry = yearMap.get(year);
          if (yearEntry) yearEntry.expected += 1;

          const examEntry = examMap.get(examType);
          if (examEntry) examEntry.expected += 1;

          const slot = {
            branch,
            semester,
            subjectKey: resolved.key,
            subject: resolved.name,
            subjectCode: resolved.code || subject.code || '',
            shortCode: resolved.shortCode || subject.shortCode || '',
            year,
            examType,
          };

          const exists = availableSlots.has(slotKey(slot));

          if (exists) {
            available += 1;
            branchEntry.available += 1;
            semesterEntry.available += 1;
            availableYears.add(year);
            if (yearEntry) yearEntry.available += 1;
            if (examEntry) examEntry.available += 1;
          } else {
            const missing = {
              ...slot,
              contributionUrl: contributionUrl(slot),
            };
            subjectMissing.push(missing);
            missingSlots.push(missing);
          }
        });
      });

      semesterEntry.subjectCount += 1;

      subjectRows.push({
        branch,
        semester,
        subjectKey: resolved.key,
        subject: resolved.name,
        subjectCode: resolved.code || subject.code || '',
        shortCode: resolved.shortCode || subject.shortCode || '',
        expected,
        available,
        missing: expected - available,
        completionPct: percentage(available, expected),
        availableYears: [...availableYears].sort((a, b) => b - a),
        missingSlots: subjectMissing,
      });
    });
  });

  const branches = [...branchMap.values()]
    .map((entry) => ({
      branch: entry.branch,
      expected: entry.expected,
      available: entry.available,
      missing: entry.expected - entry.available,
      completionPct: percentage(entry.available, entry.expected),
      semesters: [...entry.semesters.values()]
        .map((semester) => ({
          ...semester,
          missing: semester.expected - semester.available,
          completionPct: percentage(semester.available, semester.expected),
        }))
        .sort((a, b) => a.semester - b.semester),
    }))
    .sort((a, b) => a.branch.localeCompare(b.branch));

  const yearsSummary = [...yearMap.values()].map((entry) => ({
    ...entry,
    missing: entry.expected - entry.available,
    completionPct: percentage(entry.available, entry.expected),
  }));

  const examTypesSummary = [...examMap.values()].map((entry) => ({
    ...entry,
    missing: entry.expected - entry.available,
    completionPct: percentage(entry.available, entry.expected),
  }));

  const totalExpected = branches.reduce((sum, item) => sum + item.expected, 0);
  const totalAvailable = branches.reduce((sum, item) => sum + item.available, 0);
  const uniqueSubjectKeys = new Set(subjectRows.map((item) => item.subjectKey)).size;

  const semesters = branches
    .flatMap((branch) => branch.semesters.map((semester) => ({
      branch: branch.branch,
      ...semester,
    })))
    .sort((a, b) => a.branch.localeCompare(b.branch) || a.semester - b.semester);

  const rankedSubjects = [...subjectRows].sort((a, b) => {
    if (a.completionPct !== b.completionPct) return a.completionPct - b.completionPct;
    if (a.missing !== b.missing) return b.missing - a.missing;
    return a.subject.localeCompare(b.subject);
  });

  return {
    generatedAt: new Date().toISOString(),
    trackedYears: years,
    trackedExamTypes: examTypes,
    summary: {
      expectedSlots: totalExpected,
      availableSlots: totalAvailable,
      missingSlots: totalExpected - totalAvailable,
      completionPct: percentage(totalAvailable, totalExpected),
      uploadedPapersChecked: papers.length,
      uniqueSubjectsTracked: uniqueSubjectKeys,
      branchesTracked: branches.length,
    },
    branches,
    semesters,
    subjects: rankedSubjects,
    years: yearsSummary,
    examTypes: examTypesSummary,
    missingSlots,
  };
}

module.exports = {
  buildArchiveCompletion,
  indexAvailableSlots,
  normalizeExamType,
  parseSemester,
  percentage,
  slotKey,
};
