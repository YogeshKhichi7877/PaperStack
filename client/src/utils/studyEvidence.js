function historyKey() {
  return `paperstack_mock_history_${localStorage.getItem('username') || 'guest'}`;
}

export function saveMockEvidence(mock, result) {
  if (!mock?.mockId || !mock?.subject?.subjectCode || !Array.isArray(result?.items)) return;
  try {
    const key = historyKey();
    const previous = JSON.parse(localStorage.getItem(key) || '[]');
    const byId = new Map((mock.questions || []).map((question) => [String(question._id), question]));
    const record = {
      mockId: mock.mockId,
      subjectCode: mock.subject.subjectCode,
      examType: mock.examType || '',
      evaluatedAt: result.evaluatedAt || new Date().toISOString(),
      percentage: Number(result.percentage),
      items: result.items.map((item) => {
        const question = byId.get(String(item.questionId)) || {};
        return {
          questionId: String(item.questionId || ''),
          topic: question.primaryTopic || question.topics?.[0] || '',
          accuracy: Number(item.estimatedAccuracy),
          missingPoints: Array.isArray(item.missingPoints) ? item.missingPoints.slice(0, 4).map(String) : [],
        };
      }),
    };
    const list = Array.isArray(previous) ? previous.filter((item) => item.mockId !== mock.mockId) : [];
    localStorage.setItem(key, JSON.stringify([record, ...list].slice(0, 10)));
  } catch {
    // Browsers with blocked storage still retain the in-memory evaluation.
  }
}

export function readMockEvidence(subjectCode) {
  try {
    const parsed = JSON.parse(localStorage.getItem(historyKey()) || '[]');
    return (Array.isArray(parsed) ? parsed : [])
      .filter((item) => item.subjectCode === subjectCode)
      .sort((a, b) => String(b.evaluatedAt).localeCompare(String(a.evaluatedAt)));
  } catch {
    return [];
  }
}

export function mockWeaknesses(history = []) {
  const stats = new Map();
  for (const attempt of history) {
    for (const item of attempt.items || []) {
      if (!item.topic || !Number.isFinite(item.accuracy)) continue;
      const key = item.topic.toLowerCase().trim();
      const row = stats.get(key) || { topic: item.topic, total: 0, count: 0, questionId: item.questionId };
      row.total += item.accuracy;
      row.count += 1;
      stats.set(key, row);
    }
  }
  return [...stats.values()].map((row) => ({
    topic: row.topic,
    accuracy: Math.round(row.total / row.count),
    attempts: row.count,
    questionId: row.questionId,
  })).sort((a, b) => a.accuracy - b.accuracy);
}

export function mockMistakes(history = []) {
  const seen = new Set();
  const mistakes = [];
  for (const attempt of history) {
    for (const item of attempt.items || []) {
      if (item.accuracy >= 70) continue;
      for (const point of item.missingPoints || []) {
        const text = String(point || '').trim();
        if (!text || seen.has(text.toLowerCase())) continue;
        seen.add(text.toLowerCase());
        mistakes.push({ text, topic: item.topic, questionId: item.questionId });
        if (mistakes.length >= 8) return mistakes;
      }
    }
  }
  return mistakes;
}
