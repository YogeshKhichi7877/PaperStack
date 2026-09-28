function paperTrendScore({
  views = 0,
  downloads = 0,
} = {}) {
  return (
    Number(views || 0) +
    Number(downloads || 0) * 3
  );
}

function normalizeTopic(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueTopics(question = {}) {
  const values = [
    question.primaryTopic,
    ...(Array.isArray(question.topics) ? question.topics : []),
  ]
    .map(normalizeTopic)
    .filter(Boolean);

  return [...new Set(values)];
}

function aggregateSubjectTrends(papers = []) {
  const map = new Map();

  papers.forEach((paper) => {
    const key = String(
      paper.subjectCode ||
      paper.subject ||
      'Unknown'
    );

    const current = map.get(key) || {
      subjectCode: paper.subjectCode || '',
      subject: paper.subject || key,
      score: 0,
      views: 0,
      downloads: 0,
      papers: 0,
    };

    current.score += Number(paper.trendScore || 0);
    current.views += Number(paper.recentViews || 0);
    current.downloads += Number(paper.recentDownloads || 0);
    current.papers += 1;

    map.set(key, current);
  });

  return [...map.values()].sort(
    (a, b) =>
      b.score - a.score ||
      a.subject.localeCompare(b.subject)
  );
}

function aggregateTopicTrends({
  papers = [],
  questions = [],
} = {}) {
  const paperScore = new Map(
    papers.map((paper) => [
      String(paper._id),
      Number(paper.trendScore || 0),
    ])
  );

  const paperTopics = new Map();

  questions.forEach((question) => {
    const key = String(
      question.paperId?._id ||
      question.paperId ||
      ''
    );

    if (!paperScore.has(key)) return;

    if (!paperTopics.has(key)) {
      paperTopics.set(key, new Set());
    }

    uniqueTopics(question).forEach((topic) =>
      paperTopics.get(key).add(topic)
    );
  });

  const totals = new Map();

  paperTopics.forEach((topics, paperId) => {
    const score = paperScore.get(paperId) || 0;

    topics.forEach((topic) => {
      const key = topic.toLowerCase();

      const current = totals.get(key) || {
        topic,
        score: 0,
        papers: 0,
      };

      current.score += score;
      current.papers += 1;

      totals.set(key, current);
    });
  });

  return [...totals.values()].sort(
    (a, b) =>
      b.score - a.score ||
      a.topic.localeCompare(b.topic)
  );
}

function periodDays(value) {
  return value === '30d'
    ? 30
    : 7;
}

function startDayKey(
  period,
  now = new Date()
) {
  const days = periodDays(period);

  const date = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );

  date.setUTCDate(
    date.getUTCDate() - (days - 1)
  );

  return date.toISOString().slice(0, 10);
}

module.exports = {
  aggregateSubjectTrends,
  aggregateTopicTrends,
  normalizeTopic,
  paperTrendScore,
  periodDays,
  startDayKey,
  uniqueTopics,
};
