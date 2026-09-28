const {
  clusterQuestions,
  normalizeText,
  normalizeThreshold,
  tokensFor,
} = require('./pyqIntelligenceService');

const TOPIC_NOISE_WORDS = new Set([
  'algorithm', 'algorithms', 'answer', 'answers', 'brief', 'briefly',
  'calculate', 'calculation', 'calculations', 'compare', 'comparison',
  'compute', 'consider', 'derive', 'describe', 'determine', 'difference',
  'differentiate', 'discuss', 'draw', 'explain', 'find', 'following',
  'given', 'illustrate', 'list', 'mention', 'note', 'notes', 'show',
  'solve', 'state', 'steps', 'using', 'write',
]);

function cleanTopicLabel(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTopicKey(value) {
  return cleanTopicLabel(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCaseTopic(value) {
  const small = new Set(['and', 'or', 'of', 'the', 'in', 'on', 'for', 'to']);

  return cleanTopicLabel(value)
    .split(' ')
    .map((word, index) => {
      const lower = word.toLowerCase();
      if (index > 0 && small.has(lower)) return lower;
      if (/^[A-Z0-9]{2,}$/.test(word)) return word;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

function deriveFallbackTopic(questionText) {
  const normalized = normalizeText(questionText);
  if (!normalized) return '';

  const rawTokens = normalized
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length > 1)
    .filter((token) => !TOPIC_NOISE_WORDS.has(token));

  if (!rawTokens.length) return '';

  // Preserve word order but remove duplicate noise. The first meaningful
  // concept phrase is usually the clearest local fallback for an exam question.
  const unique = [];
  const seen = new Set();

  rawTokens.forEach((token) => {
    if (!seen.has(token)) {
      seen.add(token);
      unique.push(token);
    }
  });

  const phrase = unique.slice(0, 6).join(' ');
  return phrase ? titleCaseTopic(phrase) : '';
}

function extractQuestionTopics(question = {}) {
  const metadataTopics = [
    question.primaryTopic,
    ...(Array.isArray(question.topics) ? question.topics : []),
  ]
    .map(cleanTopicLabel)
    .filter(Boolean);

  const uniqueMetadata = [];
  const seen = new Set();

  metadataTopics.forEach((topic) => {
    const key = normalizeTopicKey(topic);
    if (key && !seen.has(key)) {
      seen.add(key);
      uniqueMetadata.push({
        key,
        label: titleCaseTopic(topic),
        source: 'metadata',
      });
    }
  });

  if (uniqueMetadata.length) return uniqueMetadata;

  const derived = deriveFallbackTopic(question.questionText);
  const key = normalizeTopicKey(derived);

  return key
    ? [{
        key,
        label: derived,
        source: 'derived',
      }]
    : [];
}

function questionId(value) {
  return String(value?._id || value || '');
}

function round1(value) {
  return Math.round(Number(value || 0) * 10) / 10;
}

function safeRatio(part, total) {
  if (!total) return 0;
  return Math.max(0, Math.min(1, part / total));
}

function scoreBand(score) {
  if (score >= 75) return 'strong';
  if (score >= 50) return 'moderate';
  if (score >= 25) return 'developing';
  return 'limited';
}

function publicQuestion(question = {}) {
  const populatedPaper =
    question.paperId &&
    typeof question.paperId === 'object' &&
    question.paperId._id
      ? question.paperId
      : null;

  return {
    _id: question._id,
    paperId: populatedPaper?._id || question.paperId,
    questionLabel: question.questionLabel || question.questionNumber || '',
    questionText: question.questionText || '',
    marks: question.marks ?? null,
    unit: question.unit ?? null,
    year: question.year ?? null,
    examType: question.examType || '',
    sourceLocation: question.sourceLocation || {},
    paper: populatedPaper
      ? {
          _id: populatedPaper._id,
          title: populatedPaper.title || '',
          filePath: populatedPaper.filePath || '',
        }
      : null,
  };
}

function buildImportantTopics(
  questions = [],
  {
    repeatThreshold = 0.72,
    limit = 30,
  } = {}
) {
  const usable = (questions || []).filter(
    (question) =>
      question &&
      question.status !== 'rejected' &&
      cleanTopicLabel(question.questionText).length >= 8
  );

  const threshold = normalizeThreshold(repeatThreshold);
  const repeatClusters = clusterQuestions(usable, threshold);

  const repeatedQuestionMap = new Map();

  repeatClusters.forEach((cluster) => {
    (cluster.questions || []).forEach((question) => {
      const id = questionId(question);
      if (!id) return;

      repeatedQuestionMap.set(id, {
        clusterSize: cluster.occurrenceCount || cluster.questions.length,
        distinctYearCount: cluster.distinctYearCount || 0,
        matchType: cluster.matchType || 'similar',
      });
    });
  });

  const topics = new Map();

  usable.forEach((question) => {
    const labels = extractQuestionTopics(question);

    labels.forEach((topic) => {
      if (!topics.has(topic.key)) {
        topics.set(topic.key, {
          key: topic.key,
          label: topic.label,
          metadataCount: 0,
          derivedCount: 0,
          questionIds: new Set(),
          years: new Set(),
          examTypes: new Set(),
          units: new Set(),
          totalMarks: 0,
          marksKnownCount: 0,
          repeatedQuestionIds: new Set(),
          repeatClusterSizes: [],
          questions: [],
        });
      }

      const entry = topics.get(topic.key);
      const id = questionId(question);

      if (topic.source === 'metadata') entry.metadataCount += 1;
      else entry.derivedCount += 1;

      if (id) entry.questionIds.add(id);
      if (question.year) entry.years.add(Number(question.year));
      if (question.examType) entry.examTypes.add(question.examType);
      if (question.unit !== null && question.unit !== undefined) {
        entry.units.add(Number(question.unit));
      }

      const marks = Number(question.marks);
      if (Number.isFinite(marks) && marks >= 0) {
        entry.totalMarks += marks;
        entry.marksKnownCount += 1;
      }

      if (id && repeatedQuestionMap.has(id)) {
        entry.repeatedQuestionIds.add(id);
        entry.repeatClusterSizes.push(
          repeatedQuestionMap.get(id).clusterSize
        );
      }

      entry.questions.push(question);
    });
  });

  let rows = [...topics.values()]
    .filter((entry) => entry.questionIds.size > 0)
    .map((entry) => ({
      key: entry.key,
      topic: entry.label,
      source:
        entry.metadataCount > 0 && entry.derivedCount > 0
          ? 'mixed'
          : entry.metadataCount > 0
            ? 'metadata'
            : 'derived',
      occurrences: entry.questionIds.size,
      years: [...entry.years].sort((a, b) => b - a),
      examTypes: [...entry.examTypes].sort(),
      units: [...entry.units].sort((a, b) => a - b),
      totalMarks: round1(entry.totalMarks),
      averageMarks: entry.marksKnownCount
        ? round1(entry.totalMarks / entry.marksKnownCount)
        : null,
      marksKnownCount: entry.marksKnownCount,
      repeatedInstances: entry.repeatedQuestionIds.size,
      largestRepeatCluster: entry.repeatClusterSizes.length
        ? Math.max(...entry.repeatClusterSizes)
        : 0,
      questions: entry.questions
        .sort((a, b) => Number(b.year || 0) - Number(a.year || 0))
        .slice(0, 12)
        .map(publicQuestion),
    }));

  const maxOccurrences = Math.max(1, ...rows.map((row) => row.occurrences));
  const maxYears = Math.max(1, ...rows.map((row) => row.years.length));
  const maxTotalMarks = Math.max(0, ...rows.map((row) => row.totalMarks));
  const maxRepeated = Math.max(0, ...rows.map((row) => row.repeatedInstances));
  const examUniverse = new Set(
    usable.map((question) => question.examType).filter(Boolean)
  );
  const maxExamTypes = Math.max(1, examUniverse.size);

  rows = rows.map((row) => {
    const frequency = 35 * safeRatio(row.occurrences, maxOccurrences);
    const yearSpread = 25 * safeRatio(row.years.length, maxYears);
    const marks = maxTotalMarks > 0
      ? 20 * safeRatio(row.totalMarks, maxTotalMarks)
      : 0;
    const repeatSupport = maxRepeated > 0
      ? 15 * safeRatio(row.repeatedInstances, maxRepeated)
      : 0;
    const examCoverage = 5 * safeRatio(
      row.examTypes.length,
      maxExamTypes
    );

    const score = round1(
      frequency +
      yearSpread +
      marks +
      repeatSupport +
      examCoverage
    );

    return {
      ...row,
      score,
      signal: scoreBand(score),
      scoreBreakdown: {
        frequency: round1(frequency),
        yearSpread: round1(yearSpread),
        marks: round1(marks),
        repeatSupport: round1(repeatSupport),
        examCoverage: round1(examCoverage),
      },
    };
  });

  rows.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    if (a.years.length !== b.years.length) return b.years.length - a.years.length;
    if (a.occurrences !== b.occurrences) return b.occurrences - a.occurrences;
    return a.topic.localeCompare(b.topic);
  });

  rows = rows.slice(0, Math.max(1, Math.min(Number(limit) || 30, 100)));

  const years = [...new Set(
    usable.map((question) => Number(question.year)).filter(Boolean)
  )].sort((a, b) => b - a);

  const examTypes = [...new Set(
    usable.map((question) => question.examType).filter(Boolean)
  )].sort();

  return {
    methodologyVersion: 'important-topics-v1',
    repeatThreshold: round1(threshold * 100),
    summary: {
      questionsAnalyzed: usable.length,
      topicsIdentified: rows.length,
      metadataBackedTopics: rows.filter(
        (row) => row.source === 'metadata' || row.source === 'mixed'
      ).length,
      derivedOnlyTopics: rows.filter((row) => row.source === 'derived').length,
      repeatBackedTopics: rows.filter((row) => row.repeatedInstances > 0).length,
      yearsCovered: years.length,
      examTypesCovered: examTypes.length,
    },
    years,
    examTypes,
    topics: rows,
  };
}

module.exports = {
  buildImportantTopics,
  cleanTopicLabel,
  deriveFallbackTopic,
  extractQuestionTopics,
  normalizeTopicKey,
  scoreBand,
  titleCaseTopic,
};
