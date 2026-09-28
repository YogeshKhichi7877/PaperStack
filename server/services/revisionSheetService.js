const {
  buildImportantTopics,
  normalizeTopicKey,
} = require('./importantTopicsService');

const {
  buildSubjectIntelligence,
} = require('./pyqIntelligenceService');
const { buildRevisionWorkspace } = require('./revisionWorkspaceService');

function stringId(value) {
  return String(value?._id || value || '');
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function publicQuestion(question = {}, solutionCounts = {}) {
  const populatedPaper =
    question.paperId &&
    typeof question.paperId === 'object' &&
    question.paperId._id
      ? question.paperId
      : null;

  const id = stringId(question);

  return {
    _id: question._id,
    paperId: populatedPaper?._id || question.paperId,
    questionLabel: question.questionLabel || question.questionNumber || '',
    questionText: question.questionText || '',
    marks: question.marks ?? null,
    questionType: question.questionType || 'unknown',
    unit: question.unit ?? null,
    primaryTopic: question.primaryTopic || '',
    topics: Array.isArray(question.topics) ? question.topics : [],
    year: question.year ?? null,
    examType: question.examType || '',
    sourceLocation: question.sourceLocation || {},
    approvedSolutionCount: Number(solutionCounts[id] || 0),
    paper: populatedPaper
      ? {
          _id: populatedPaper._id,
          title: populatedPaper.title || '',
          filePath: populatedPaper.filePath || '',
          solutionPath: populatedPaper.solutionPath || '',
        }
      : null,
  };
}

function topicMatchesQuestion(topic, question) {
  const key = normalizeTopicKey(topic);
  if (!key) return false;

  const explicit = [
    question.primaryTopic,
    ...(Array.isArray(question.topics) ? question.topics : []),
  ]
    .map(normalizeTopicKey)
    .filter(Boolean);

  if (explicit.includes(key)) return true;

  const haystack = normalizeTopicKey(question.questionText);
  const topicTokens = key.split(' ').filter(Boolean);

  if (!haystack || !topicTokens.length) return false;

  return topicTokens.every((token) => haystack.includes(token));
}

function buildMustPracticeQuestions({
  questions = [],
  importantTopics = [],
  repeatClusters = [],
  solutionCounts = {},
  limit = 12,
}) {
  const repeatedIds = new Set();

  (repeatClusters || []).forEach((cluster) => {
    (cluster.questions || []).forEach((question) => {
      repeatedIds.add(stringId(question));
    });
  });

  const topTopics = (importantTopics || []).slice(0, 10);

  const ranked = (questions || []).map((question) => {
    let bestTopicScore = 0;
    let matchedTopic = '';

    topTopics.forEach((topic) => {
      if (
        topicMatchesQuestion(topic.topic, question) &&
        Number(topic.score || 0) > bestTopicScore
      ) {
        bestTopicScore = Number(topic.score || 0);
        matchedTopic = topic.topic;
      }
    });

    const marks = Number(question.marks);
    const marksScore = Number.isFinite(marks)
      ? Math.min(15, Math.max(0, marks) * 2)
      : 0;

    const repeatBonus = repeatedIds.has(stringId(question))
      ? 20
      : 0;

    const solutionBonus =
      Number(solutionCounts[stringId(question)] || 0) > 0
        ? 5
        : 0;

    const score =
      (bestTopicScore * 0.60) +
      marksScore +
      repeatBonus +
      solutionBonus;

    return {
      question,
      revisionScore: round1(score),
      matchedTopic,
      repeatBacked: repeatBonus > 0,
    };
  });

  ranked.sort((a, b) => {
    if (a.revisionScore !== b.revisionScore) {
      return b.revisionScore - a.revisionScore;
    }

    const aMarks = Number(a.question.marks || 0);
    const bMarks = Number(b.question.marks || 0);

    if (aMarks !== bMarks) return bMarks - aMarks;

    return Number(b.question.year || 0) - Number(a.question.year || 0);
  });

  const selected = [];
  const seenText = new Set();

  for (const item of ranked) {
    const textKey = String(item.question.questionText || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();

    if (!textKey || seenText.has(textKey)) continue;

    seenText.add(textKey);

    selected.push({
      ...publicQuestion(item.question, solutionCounts),
      revisionScore: item.revisionScore,
      matchedTopic: item.matchedTopic,
      repeatBacked: item.repeatBacked,
    });

    if (selected.length >= limit) break;
  }

  return selected;
}

function buildRevisionSheet(
  questions = [],
  {
    subject = {},
    examType = '',
    repeatThreshold = 0.72,
    topicLimit = 12,
    practiceLimit = 12,
    solutionCounts = {},
    solutions = [],
    resources = [],
  } = {}
) {
  const usable = (questions || []).filter(
    (question) =>
      question &&
      question.status !== 'rejected' &&
      String(question.questionText || '').trim()
  );

  const topicAnalysis = buildImportantTopics(
    usable,
    {
      repeatThreshold,
      limit: topicLimit,
    }
  );

  const intelligence = buildSubjectIntelligence(
    usable,
    {
      threshold: repeatThreshold,
    }
  );

  const priorityTopics = (topicAnalysis.topics || [])
    .slice(0, topicLimit)
    .map((topic) => ({
      topic: topic.topic,
      score: topic.score,
      signal: topic.signal,
      occurrences: topic.occurrences,
      years: topic.years,
      examTypes: topic.examTypes,
      units: topic.units,
      totalMarks: topic.totalMarks,
      averageMarks: topic.averageMarks,
      repeatedInstances: topic.repeatedInstances,
      source: topic.source,
      scoreBreakdown: topic.scoreBreakdown,
    }));

  const repeatedClusters = (intelligence.clusters || [])
    .slice(0, 8)
    .map((cluster) => ({
      representativeQuestionId: cluster.representativeQuestionId,
      representativeText: cluster.representativeText,
      occurrenceCount: cluster.occurrenceCount,
      distinctYearCount: cluster.distinctYearCount,
      years: cluster.years,
      examTypes: cluster.examTypes,
      marks: cluster.marks,
      matchType: cluster.matchType,
      averageSimilarity: cluster.averageSimilarity,
      questions: cluster.questions.slice(0, 6),
    }));

  const mustPracticeQuestions = buildMustPracticeQuestions({
    questions: usable,
    importantTopics: priorityTopics,
    repeatClusters: intelligence.clusters || [],
    solutionCounts,
    limit: practiceLimit,
  });

  const years = [...new Set(
    usable.map((question) => Number(question.year)).filter(Boolean)
  )].sort((a, b) => b - a);

  const examTypes = [...new Set(
    usable.map((question) => question.examType).filter(Boolean)
  )].sort();

  const marksKnown = usable.filter(
    (question) =>
      question.marks !== null &&
      question.marks !== undefined &&
      Number.isFinite(Number(question.marks))
  );

  const totalKnownMarks = marksKnown.reduce(
    (sum, question) => sum + Number(question.marks || 0),
    0
  );

  const questionsWithApprovedSolutions = usable.filter(
    (question) => Number(solutionCounts[stringId(question)] || 0) > 0
  ).length;

  const sheet = {
    version: 'revision-sheet-v1',
    subject: {
      subjectCode: subject.subjectCode || usable[0]?.subjectCode || '',
      subject: subject.subject || usable[0]?.subject || '',
      subjectKey: subject.subjectKey || usable[0]?.subjectKey || '',
      shortCode: subject.shortCode || usable[0]?.shortCode || '',
      branch: subject.branch || usable[0]?.branch || '',
      semester: subject.semester ?? usable[0]?.semester ?? null,
    },
    scope: {
      examType: examType || '',
      years,
      examTypes,
    },
    summary: {
      questionsAnalyzed: usable.length,
      yearsCovered: years.length,
      examTypesCovered: examTypes.length,
      topicsIncluded: priorityTopics.length,
      repeatedClusters: repeatedClusters.length,
      repeatedQuestionInstances:
        intelligence.summary?.repeatedQuestionInstances || 0,
      marksKnownCount: marksKnown.length,
      totalKnownMarks: round1(totalKnownMarks),
      questionsWithApprovedSolutions,
    },
    priorityTopics,
    repeatedClusters,
    mustPracticeQuestions,
    checklist: priorityTopics.slice(0, 10).map((topic) => ({
      key: normalizeTopicKey(topic.topic),
      topic: topic.topic,
      score: topic.score,
    })),
    methodology: {
      topicScore:
        'Historical Revision Score from frequency, year spread, marks, repeated-PYQ support, and exam coverage.',
      practiceSelection:
        'Must-practice questions favor strong topic evidence, repeated-PYQ support, marks, and approved-solution availability.',
      disclaimer:
        'This sheet summarizes the papers currently in PaperStack. It is revision evidence, not a prediction of future exam questions.',
    },
  };

  sheet.workspace = buildRevisionWorkspace(sheet, { questions: usable, solutions, resources });
  return sheet;
}

module.exports = {
  buildMustPracticeQuestions,
  buildRevisionSheet,
  publicQuestion,
  topicMatchesQuestion,
};
