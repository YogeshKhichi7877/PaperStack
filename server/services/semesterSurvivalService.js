const { buildArchiveCompletion } = require('./archiveCompletionService');
const { buildRevisionSheet } = require('./revisionSheetService');
const { normalizeBranch: canonicalBranch } = require('../utils/branches');

function normalizeBranch(value) {
  return canonicalBranch(value) || 'CSE';
}

function normalizeExamType(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  const normalized = text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (/\b(mid|midsem|mid semester|mse)\b/.test(normalized)) return 'Mid-Sem';
  if (/\b(end|endsem|end semester|ese)\b/.test(normalized)) return 'End-Sem';
  return text;
}

function clampSemester(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(1, Math.min(8, Math.round(numeric)));
}

function stringId(value) {
  return String(value?._id || value || '');
}

function resourceKindCounts(resources = []) {
  return resources.reduce((counts, resource) => {
    const kind = String(resource.kind || 'other');
    counts[kind] = Number(counts[kind] || 0) + 1;
    return counts;
  }, {});
}

function subjectCatalogEntry(subjectCatalog = [], branch, semester) {
  return (
    subjectCatalog.find(
      (entry) =>
        String(entry.branch || '').toUpperCase() === branch &&
        Number(entry.semester) === semester
    ) || { branch, semester, subjects: [] }
  );
}

function matchingResource(resource, subject) {
  const resourceCode = String(resource.subjectCode || '').trim().toUpperCase();
  const subjectCode = String(subject.code || '').trim().toUpperCase();

  if (resourceCode && subjectCode && resourceCode === subjectCode) return true;

  const resourceKey = String(resource.subjectKey || '').trim().toUpperCase();
  return Boolean(resourceKey && resourceKey === subjectCode);
}

function matchingQuestion(question, subject) {
  return (
    String(question.subjectCode || '').trim().toUpperCase() ===
    String(subject.code || '').trim().toUpperCase()
  );
}

function supportBand(score) {
  if (score >= 75) return 'strong';
  if (score >= 50) return 'usable';
  if (score >= 25) return 'limited';
  return 'sparse';
}

function archiveSupportScore({
  completionPct = 0,
  questionCount = 0,
  solutionReadyCount = 0,
  resourceKinds = 0,
}) {
  const archive = Math.max(0, Math.min(1, Number(completionPct || 0) / 100)) * 45;
  const questions = Math.max(0, Math.min(1, Number(questionCount || 0) / 12)) * 25;
  const solutions = questionCount > 0
    ? Math.max(0, Math.min(1, Number(solutionReadyCount || 0) / Number(questionCount))) * 15
    : 0;
  const diversity = Math.max(0, Math.min(1, Number(resourceKinds || 0) / 4)) * 15;

  return Math.round(archive + questions + solutions + diversity);
}

function contributionUrl(slot = {}) {
  const params = new URLSearchParams({
    branch: slot.branch || '',
    semester: String(slot.semester || ''),
    subject: slot.subject || '',
    subjectCode: slot.subjectCode || '',
    examType: slot.examType || '',
    year: String(slot.year || ''),
  });

  return `/contribute?${params.toString()}`;
}

function buildSemesterSurvivalPack({
  branch = 'CSE',
  semester = 1,
  examType = '',
  papers = [],
  resources = [],
  questions = [],
  solutionCounts = {},
  subjectCatalog = [],
  expectedYears = [],
  expectedExamTypes = [],
} = {}) {
  const normalizedBranch = normalizeBranch(branch);
  const normalizedSemester = clampSemester(semester);
  const normalizedExamType = normalizeExamType(examType);

  const catalogEntry = subjectCatalogEntry(
    subjectCatalog,
    normalizedBranch,
    normalizedSemester
  );

  const completion = buildArchiveCompletion({
    papers,
    subjectCatalog,
    expectedYears,
    expectedExamTypes,
  });

  const archiveRows = new Map(
    completion.subjects
      .filter(
        (row) =>
          row.branch === normalizedBranch &&
          Number(row.semester) === normalizedSemester
      )
      .map((row) => [
        String(row.subjectCode || row.subjectKey || '').trim().toUpperCase(),
        row,
      ])
  );

  const subjects = (catalogEntry.subjects || []).map((subject) => {
    const code = String(subject.code || '').trim().toUpperCase();

    const subjectResources = resources.filter((resource) =>
      matchingResource(resource, subject)
    );

    const subjectQuestions = questions
      .filter((question) => matchingQuestion(question, subject))
      .filter(
        (question) =>
          !normalizedExamType ||
          normalizeExamType(question.examType) === normalizedExamType
      );

    const subjectSolutionCounts = {};
    let solutionReadyCount = 0;

    subjectQuestions.forEach((question) => {
      const count = Number(solutionCounts[stringId(question)] || 0);
      subjectSolutionCounts[stringId(question)] = count;
      if (count > 0) solutionReadyCount += 1;
    });

    const revision = buildRevisionSheet(subjectQuestions, {
      subject: {
        subjectCode: code,
        subject: subject.name,
        shortCode: subject.shortCode || '',
        branch: normalizedBranch,
        semester: normalizedSemester,
      },
      examType: normalizedExamType,
      topicLimit: 8,
      practiceLimit: 5,
      solutionCounts: subjectSolutionCounts,
    });

    const kinds = resourceKindCounts(subjectResources);
    const kindCount = Object.keys(kinds).length;

    const archive = archiveRows.get(code) || {
      expected: 0,
      available: 0,
      completionPct: 0,
      missingSlots: [],
      availableYears: [],
    };

    const missingSlots = (archive.missingSlots || [])
      .filter(
        (slot) =>
          !normalizedExamType ||
          normalizeExamType(slot.examType) === normalizedExamType
      )
      .map((slot) => ({
        ...slot,
        contributionUrl: slot.contributionUrl || contributionUrl(slot),
      }));

    const supportScore = archiveSupportScore({
      completionPct: archive.completionPct,
      questionCount: subjectQuestions.length,
      solutionReadyCount,
      resourceKinds: kindCount,
    });

    return {
      subjectCode: code,
      shortCode: subject.shortCode || '',
      subject: subject.name || code,
      aliases: subject.aliases || [],
      branch: normalizedBranch,
      semester: normalizedSemester,
      archive: {
        expected: Number(archive.expected || 0),
        available: Number(archive.available || 0),
        missing: missingSlots.length,
        completionPct: Number(archive.completionPct || 0),
        availableYears: archive.availableYears || [],
      },
      resources: {
        total: subjectResources.length,
        byKind: kinds,
        kindsAvailable: kindCount,
      },
      questions: {
        total: subjectQuestions.length,
        years: [
          ...new Set(
            subjectQuestions
              .map((question) => Number(question.year))
              .filter(Boolean)
          ),
        ].sort((a, b) => b - a),
        solutionsReady: solutionReadyCount,
      },
      intelligence: {
        topTopics: (revision.priorityTopics || []).slice(0, 4),
        repeatedClusters: Number(revision.summary?.repeatedClusters || 0),
        mustPractice: (revision.mustPracticeQuestions || []).slice(0, 3),
      },
      supportScore,
      supportBand: supportBand(supportScore),
      missingSlots: missingSlots.slice(0, 8),
      links: {
        subjectHub: `/subject/${encodeURIComponent(code)}`,
        questions: `/questions?subjectCode=${encodeURIComponent(code)}${normalizedExamType ? `&examType=${encodeURIComponent(normalizedExamType)}` : ''}`,
        revision: `/revision-sheets?subjectCode=${encodeURIComponent(code)}${normalizedExamType ? `&examType=${encodeURIComponent(normalizedExamType)}` : ''}`,
        warRoom: `/exam-war-room?subjectCode=${encodeURIComponent(code)}${normalizedExamType ? `&examType=${encodeURIComponent(normalizedExamType)}` : ''}`,
        ask: `/ask-paperstack?subjectCode=${encodeURIComponent(code)}${normalizedExamType ? `&examType=${encodeURIComponent(normalizedExamType)}` : ''}`,
        mocks: `/mock-exams?subjectCode=${encodeURIComponent(code)}${normalizedExamType ? `&examType=${encodeURIComponent(normalizedExamType)}` : ''}`,
        contribute: `/contribute?branch=${encodeURIComponent(normalizedBranch)}&semester=${encodeURIComponent(normalizedSemester)}&subject=${encodeURIComponent(subject.name || code)}&subjectCode=${encodeURIComponent(code)}`,
      },
    };
  });

  subjects.sort((a, b) => {
    if (a.supportScore !== b.supportScore) return a.supportScore - b.supportScore;
    return a.subject.localeCompare(b.subject);
  });

  const totalQuestions = subjects.reduce(
    (sum, subject) => sum + subject.questions.total,
    0
  );
  const totalResources = subjects.reduce(
    (sum, subject) => sum + subject.resources.total,
    0
  );
  const totalSolutions = subjects.reduce(
    (sum, subject) => sum + subject.questions.solutionsReady,
    0
  );
  const availableSlots = subjects.reduce(
    (sum, subject) => sum + subject.archive.available,
    0
  );
  const expectedSlots = subjects.reduce(
    (sum, subject) => sum + subject.archive.expected,
    0
  );
  const missingSlots = subjects.flatMap((subject) =>
    subject.missingSlots.map((slot) => ({
      ...slot,
      subjectSupportScore: subject.supportScore,
    }))
  );

  const completionPct = expectedSlots
    ? Math.round((availableSlots / expectedSlots) * 1000) / 10
    : 0;

  const averageSupport = subjects.length
    ? Math.round(
        subjects.reduce((sum, subject) => sum + subject.supportScore, 0) /
          subjects.length
      )
    : 0;

  return {
    version: 'semester-survival-v1',
    generatedAt: new Date().toISOString(),
    scope: {
      branch: normalizedBranch,
      semester: normalizedSemester,
      examType: normalizedExamType,
      trackedYears: expectedYears,
      trackedExamTypes: expectedExamTypes,
    },
    summary: {
      subjects: subjects.length,
      archiveCompletionPct: completionPct,
      availableSlots,
      expectedSlots,
      missingSlots: missingSlots.length,
      totalResources,
      extractedQuestions: totalQuestions,
      questionsWithSolutions: totalSolutions,
      averageArchiveSupport: averageSupport,
    },
    subjects,
    missionOrder: subjects.map((subject) => ({
      subjectCode: subject.subjectCode,
      subject: subject.subject,
      supportScore: subject.supportScore,
      supportBand: subject.supportBand,
      reason:
        subject.archive.missing > 0
          ? `${subject.archive.missing} archive slot${subject.archive.missing === 1 ? '' : 's'} missing`
          : subject.questions.total < 5
            ? 'Limited extracted-question coverage'
            : subject.questions.solutionsReady === 0
              ? 'No approved question solutions yet'
              : 'Archive support is comparatively stronger',
    })),
    missingSlots: missingSlots
      .sort(
        (a, b) =>
          Number(b.year || 0) - Number(a.year || 0) ||
          String(a.subject).localeCompare(String(b.subject))
      )
      .slice(0, 30),
    methodology: {
      supportScore:
        'Archive support combines paper-slot completion, extracted-question coverage, approved-solution coverage, and resource-type diversity. It measures PaperStack archive support, not a student’s academic ability.',
      missionOrder:
        'Subjects with weaker archive support are surfaced first so students can identify where PaperStack has less material and where contributions would help.',
      disclaimer:
        'Historical PYQ/topic evidence is for revision planning only and does not predict future exam questions.',
    },
  };
}

module.exports = {
  archiveSupportScore,
  buildSemesterSurvivalPack,
  clampSemester,
  contributionUrl,
  matchingQuestion,
  matchingResource,
  normalizeBranch,
  normalizeExamType,
  resourceKindCounts,
  supportBand,
};
