const { normalizeTopicKey } = require('./importantTopicsService');

function compact(value, limit = 420) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, limit);
}

function sourceId(value) {
  return String(value?._id || value || '');
}

function extractFormulas(text = '', source = {}) {
  const result = [];
  const regex = /\\\[([\s\S]{1,240}?)\\\]|\\\(([\s\S]{1,240}?)\\\)|\$([^$\n]{1,240})\$/g;
  let match;
  while ((match = regex.exec(String(text))) && result.length < 12) {
    const latex = (match[1] || match[2] || match[3] || '').trim();
    if (latex && !result.some((item) => item.latex === latex)) {
      result.push({ latex, ...source });
    }
  }
  return result;
}

function buildRevisionWorkspace(sheet, { questions = [], solutions = [], resources = [] } = {}) {
  const solutionByQuestion = new Map();
  for (const solution of solutions) {
    const key = sourceId(solution.questionId);
    if (key && !solutionByQuestion.has(key) && solution.answerText) {
      solutionByQuestion.set(key, compact(solution.answerText, 1200));
    }
  }

  const practice = sheet.mustPracticeQuestions || [];
  const mustRevise = (sheet.priorityTopics || []).slice(0, 10).map((topic) => {
    const question = practice.find((item) =>
      normalizeTopicKey(item.matchedTopic || item.primaryTopic) === normalizeTopicKey(topic.topic)
    );
    return {
      key: normalizeTopicKey(topic.topic),
      topic: topic.topic,
      occurrences: Number(topic.occurrences || 0),
      years: topic.years || [],
      questionId: question ? sourceId(question) : '',
    };
  });

  const formulas = [];
  for (const question of questions) {
    const id = sourceId(question);
    const answer = solutionByQuestion.get(id);
    if (!answer) continue;
    formulas.push(...extractFormulas(answer, { questionId: id, source: 'approved solution' }));
  }
  for (const resource of resources) {
    if (!resource.contentText) continue;
    formulas.push(...extractFormulas(resource.contentText, {
      resourceId: sourceId(resource), source: 'approved resource',
      url: resource.fileUrl || '',
    }));
  }

  const definitions = [];
  const algorithms = [];
  const rapidRecall = [];
  for (const question of practice) {
    const id = sourceId(question);
    const answer = solutionByQuestion.get(id) || '';
    const item = {
      questionId: id,
      prompt: compact(question.questionText, 280),
      answer: answer ? compact(answer, 520) : '',
      topic: question.matchedTopic || question.primaryTopic || '',
    };
    rapidRecall.push(item);
    if (answer && /\b(define|what is|state the meaning)\b/i.test(item.prompt)) {
      definitions.push({ ...item, answer: compact(answer, 320) });
    }
    if (answer && /\b(algorithm|procedure|steps)\b/i.test(item.prompt)) {
      algorithms.push(item);
    }
  }

  const seenFormula = new Set();
  const uniqueFormulas = formulas.filter((item) => {
    if (seenFormula.has(item.latex)) return false;
    seenFormula.add(item.latex);
    return true;
  }).slice(0, 20);

  return {
    mustRevise,
    formulas: uniqueFormulas,
    definitions: definitions.slice(0, 10),
    algorithms: algorithms.slice(0, 8),
    commonMistakes: [],
    rapidRecall: rapidRecall.slice(0, 12),
    resources: resources.slice(0, 8).map((resource) => ({
      id: sourceId(resource), title: compact(resource.title, 120),
      url: resource.fileUrl || '', kind: resource.kind || '',
    })),
    lastFiveMinutes: {
      formulas: uniqueFormulas.slice(0, 5),
      definitions: definitions.slice(0, 4),
      facts: mustRevise.slice(0, 5),
    },
    aiBriefing: '',
    aiRecallNotes: [],
    methodology: 'Recall material comes from extracted archive questions, approved solutions, and active resources. An empty bank means no verified source text is available yet.',
  };
}

function parseRevisionAi(text, validIds, sourceAnswers = new Map(), resourceUrls = new Map()) {
  try {
    const data = JSON.parse(String(text).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, ''));
    const valid = (rows) => (Array.isArray(rows) ? rows : [])
      .filter((row) => validIds.has(String(row.sourceId || '')))
      .map((row) => ({ sourceId: String(row.sourceId), text: compact(row.text, 240) }))
      .filter((row) => row.text)
      .slice(0, 5);
    const formulas = (Array.isArray(data.formulas) ? data.formulas : [])
      .filter((row) => {
        const answer = sourceAnswers.get(String(row.sourceId || '')) || '';
        const expression = String(row.sourceExpression || '').trim();
        return (validIds.has(String(row.sourceId || '')) || resourceUrls.has(String(row.sourceId || '')))
          && expression.length >= 3
          && answer.includes(expression)
          && typeof row.latex === 'string'
          && row.latex.trim().length >= 3;
      })
      .map((row) => resourceUrls.has(String(row.sourceId))
        ? { resourceId: String(row.sourceId), url: resourceUrls.get(String(row.sourceId)),
            latex: row.latex.trim().slice(0, 320), source: 'approved resource (AI-formatted)' }
        : { questionId: String(row.sourceId), latex: row.latex.trim().slice(0, 320),
            source: 'approved solution (AI-formatted)' })
      .slice(0, 8);
    return { briefing: compact(data.briefing, 400), notes: valid(data.notes), mistakes: valid(data.mistakes), formulas };
  } catch {
    return { briefing: '', notes: [], mistakes: [], formulas: [] };
  }
}

module.exports = { buildRevisionWorkspace, compact, extractFormulas, parseRevisionAi };
