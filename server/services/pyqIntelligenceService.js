const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'define', 'describe',
  'do', 'does', 'explain', 'for', 'from', 'give', 'how', 'in', 'is', 'it',
  'list', 'of', 'on', 'or', 'state', 'the', 'to', 'what', 'when', 'where',
  'which', 'why', 'with', 'write', 'briefly', 'short', 'note', 'notes'
]);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/^\s*(?:question|ques|q)\s*\d+(?:\s*[\(\[]?[a-z0-9]+[\)\]]?)?\s*[:.\-)]*\s*/i, '')
    .replace(/\[\s*\d+(?:\.\d+)?\s*(?:marks?|m)?\s*\]\s*$/i, '')
    .replace(/\(\s*\d+(?:\.\d+)?\s*marks?\s*\)\s*$/i, '')
    .replace(/\b\d+(?:\.\d+)?\s*marks?\b/gi, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokensFor(value) {
  const normalized = normalizeText(value);
  if (!normalized) return [];

  const tokens = normalized
    .split(' ')
    .map((token) => token.trim())
    .filter(Boolean)
    .filter((token) => token.length > 1)
    .filter((token) => !STOP_WORDS.has(token));

  return [...new Set(tokens)];
}

function jaccardSimilarity(tokensA, tokensB) {
  const a = new Set(tokensA || []);
  const b = new Set(tokensB || []);

  if (!a.size && !b.size) return 1;
  if (!a.size || !b.size) return 0;

  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection += 1;
  });

  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function containmentSimilarity(tokensA, tokensB) {
  const a = new Set(tokensA || []);
  const b = new Set(tokensB || []);

  if (!a.size || !b.size) return 0;

  let intersection = 0;
  a.forEach((token) => {
    if (b.has(token)) intersection += 1;
  });

  return intersection / Math.min(a.size, b.size);
}

function bigrams(value) {
  const normalized = normalizeText(value).replace(/\s+/g, ' ');
  if (normalized.length < 2) return normalized ? [normalized] : [];

  const result = [];
  for (let index = 0; index < normalized.length - 1; index += 1) {
    result.push(normalized.slice(index, index + 2));
  }
  return result;
}

function diceSimilarity(textA, textB) {
  const a = bigrams(textA);
  const b = bigrams(textB);

  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;

  const counts = new Map();
  a.forEach((item) => counts.set(item, (counts.get(item) || 0) + 1));

  let intersection = 0;
  b.forEach((item) => {
    const count = counts.get(item) || 0;
    if (count > 0) {
      intersection += 1;
      counts.set(item, count - 1);
    }
  });

  return (2 * intersection) / (a.length + b.length);
}

function questionSimilarity(a, b) {
  const textA = normalizeText(a?.questionText || a?.text || a);
  const textB = normalizeText(b?.questionText || b?.text || b);

  if (!textA || !textB) return 0;
  if (textA === textB) return 1;

  const tokensA = tokensFor(textA);
  const tokensB = tokensFor(textB);

  if (!tokensA.length || !tokensB.length) return 0;

  const jaccard = jaccardSimilarity(tokensA, tokensB);
  const containment = containmentSimilarity(tokensA, tokensB);
  const dice = diceSimilarity(textA, textB);

  // Short questions need stricter matching to avoid false positives.
  const shortestTokenCount = Math.min(tokensA.length, tokensB.length);
  const shortPenalty = shortestTokenCount <= 3 ? 0.08 : shortestTokenCount <= 5 ? 0.03 : 0;

  const weighted =
    (jaccard * 0.45) +
    (containment * 0.35) +
    (dice * 0.20) -
    shortPenalty;

  return Math.max(0, Math.min(1, weighted));
}

function roundedPercent(value) {
  return Math.round(Number(value || 0) * 1000) / 10;
}

function normalizeThreshold(value, fallback = 0.72) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;

  const asRatio = numeric > 1 ? numeric / 100 : numeric;
  return Math.max(0.55, Math.min(0.95, asRatio));
}

function questionPublicView(question = {}) {
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
    year: question.year ?? null,
    examType: question.examType || '',
    branch: question.branch || '',
    semester: question.semester ?? null,
    sourceLocation: question.sourceLocation || {},
    primaryTopic: question.primaryTopic || '',
    topics: question.topics || [],
    extraction: {
      source: question.extraction?.source || 'unknown',
      confidence: question.extraction?.confidence ?? null,
    },
    paper: populatedPaper
      ? {
          _id: populatedPaper._id,
          title: populatedPaper.title || '',
          filePath: populatedPaper.filePath || '',
        }
      : null,
  };
}

function clusterQuestions(questions = [], thresholdInput = 0.72) {
  const threshold = normalizeThreshold(thresholdInput);
  const usable = (questions || [])
    .filter((question) => normalizeText(question.questionText).length >= 12)
    .map((question, index) => ({
      question,
      index,
      normalized: normalizeText(question.questionText),
      tokens: tokensFor(question.questionText),
    }));

  const parent = usable.map((_, index) => index);

  function find(index) {
    let current = index;
    while (parent[current] !== current) {
      parent[current] = parent[parent[current]];
      current = parent[current];
    }
    return current;
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootB] = rootA;
  }

  for (let i = 0; i < usable.length; i += 1) {
    for (let j = i + 1; j < usable.length; j += 1) {
      const left = usable[i];
      const right = usable[j];

      // Fast rejection: if token counts differ too much, only continue when
      // the shorter set is plausibly contained in the longer question.
      const minTokens = Math.min(left.tokens.length, right.tokens.length);
      const maxTokens = Math.max(left.tokens.length, right.tokens.length);

      if (minTokens < 2) continue;
      if (maxTokens > minTokens * 3.5) continue;

      const similarity = questionSimilarity(left.question, right.question);
      const strictThreshold = minTokens <= 3
        ? Math.max(threshold, 0.90)
        : minTokens <= 5
          ? Math.max(threshold, 0.80)
          : threshold;

      if (similarity >= strictThreshold) {
        union(i, j);
      }
    }
  }

  const groups = new Map();

  usable.forEach((item, index) => {
    const root = find(index);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(item.question);
  });

  return [...groups.values()]
    .filter((group) => group.length >= 2)
    .map((group) => {
      const years = [...new Set(group.map((item) => Number(item.year)).filter(Boolean))]
        .sort((a, b) => b - a);
      const examTypes = [...new Set(group.map((item) => item.examType).filter(Boolean))];
      const marks = [...new Set(group.map((item) => item.marks).filter((value) => value !== null && value !== undefined))]
        .sort((a, b) => a - b);

      const pairSimilarities = [];
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          pairSimilarities.push(questionSimilarity(group[i], group[j]));
        }
      }

      const averageSimilarity = pairSimilarities.length
        ? pairSimilarities.reduce((sum, value) => sum + value, 0) / pairSimilarities.length
        : 1;

      const representative = [...group].sort((a, b) => {
        const aLength = String(a.questionText || '').length;
        const bLength = String(b.questionText || '').length;
        return bLength - aLength;
      })[0];

      const exact =
        new Set(group.map((item) => normalizeText(item.questionText))).size === 1;

      return {
        representativeQuestionId: representative._id,
        representativeText: representative.questionText,
        occurrenceCount: group.length,
        distinctYearCount: years.length,
        years,
        examTypes,
        marks,
        matchType: exact ? 'exact' : 'similar',
        averageSimilarity: roundedPercent(averageSimilarity),
        questions: group
          .map(questionPublicView)
          .sort((a, b) => Number(b.year || 0) - Number(a.year || 0)),
      };
    })
    .sort((a, b) => {
      if (a.distinctYearCount !== b.distinctYearCount) {
        return b.distinctYearCount - a.distinctYearCount;
      }
      if (a.occurrenceCount !== b.occurrenceCount) {
        return b.occurrenceCount - a.occurrenceCount;
      }
      return b.averageSimilarity - a.averageSimilarity;
    });
}

function buildSubjectIntelligence(questions = [], { threshold = 0.72 } = {}) {
  const usable = (questions || []).filter(
    (question) => question && question.status !== 'rejected'
  );

  const clusters = clusterQuestions(usable, threshold);
  const repeatedQuestionIds = new Set();

  clusters.forEach((cluster) => {
    cluster.questions.forEach((question) => {
      repeatedQuestionIds.add(String(question._id));
    });
  });

  const years = [...new Set(usable.map((item) => Number(item.year)).filter(Boolean))]
    .sort((a, b) => b - a);

  const examTypes = [...new Set(usable.map((item) => item.examType).filter(Boolean))];

  const repeatRate = usable.length
    ? (repeatedQuestionIds.size / usable.length) * 100
    : 0;

  const exactClusters = clusters.filter((cluster) => cluster.matchType === 'exact').length;
  const similarClusters = clusters.length - exactClusters;

  const topicCounts = new Map();
  usable.forEach((question) => {
    const topics = [
      question.primaryTopic,
      ...(Array.isArray(question.topics) ? question.topics : []),
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);

    [...new Set(topics)].forEach((topic) => {
      topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1);
    });
  });

  const topicSignals = [...topicCounts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count || a.topic.localeCompare(b.topic))
    .slice(0, 15);

  return {
    threshold: roundedPercent(normalizeThreshold(threshold)),
    summary: {
      totalQuestions: usable.length,
      repeatedQuestionInstances: repeatedQuestionIds.size,
      repeatedClusters: clusters.length,
      exactClusters,
      similarClusters,
      repeatRate: Math.round(repeatRate * 10) / 10,
      yearsCovered: years.length,
      examTypesCovered: examTypes.length,
    },
    years,
    examTypes,
    clusters,
    topicSignals,
  };
}

module.exports = {
  buildSubjectIntelligence,
  clusterQuestions,
  containmentSimilarity,
  diceSimilarity,
  jaccardSimilarity,
  normalizeText,
  normalizeThreshold,
  questionSimilarity,
  tokensFor,
};
