const Question = require('../models/Question');
const { FLAT_SUBJECT_CATALOG, resolveSubject } = require('./subjectService');

const TOPIC_ALIASES = new Map([
  ['semaphores', 'semaphore'],
  ['mutexes', 'mutex'],
  ['deadlocks', 'deadlock'],
  ['process synchronisation', 'process synchronization'],
  ['bankers algorithm', 'banker algorithm'],
  ["banker's algorithm", 'banker algorithm'],
  ['virtual memories', 'virtual memory'],
]);

function normalizeTopic(value) {
  const normalized = String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return TOPIC_ALIASES.get(normalized) || normalized;
}

function topicKey(subjectCode, name) {
  const slug = normalizeTopic(name).replace(/\s+/g, '-');
  return `${String(subjectCode || 'GENERAL').trim().toUpperCase()}:${slug}`;
}

function inferSubject(text, input = {}) {
  if (input.subjectCode || input.subjectName) return resolveSubject(input);
  const haystack = String(text || '').toLowerCase();
  const ranked = FLAT_SUBJECT_CATALOG.map((subject) => ({
    subject,
    score: [subject.name, subject.code, subject.shortCode, ...(subject.aliases || [])]
      .filter(Boolean)
      .reduce((best, alias) => {
        const needle = String(alias).toLowerCase();
        if (needle.length <= 2) return best;
        return Math.max(best, haystack.includes(needle) ? needle.length : 0);
      }, 0),
  })).sort((a, b) => b.score - a.score);
  return ranked[0]?.score ? ranked[0].subject : resolveSubject(input);
}

async function listCanonicalTopics(subjectCode, dependencies = {}) {
  const Model = dependencies.QuestionModel || Question;
  const code = String(subjectCode || '').trim().toUpperCase();
  if (!code) return [];
  const rows = await Model.find({
    subjectCode: code,
    status: { $ne: 'rejected' },
    needsReview: { $ne: true },
  }).select('primaryTopic topics topicKeys').limit(1500).lean();
  const grouped = new Map();
  for (const row of rows) {
    for (const raw of [row.primaryTopic, ...(row.topics || [])].filter(Boolean)) {
      const normalized = normalizeTopic(raw);
      if (!normalized) continue;
      const key = topicKey(code, normalized);
      const current = grouped.get(key) || { topicKey: key, name: String(raw).trim(), questionCount: 0 };
      current.questionCount += 1;
      if (String(raw).trim().length > current.name.length) current.name = String(raw).trim();
      grouped.set(key, current);
    }
  }
  return [...grouped.values()].sort((a, b) => b.questionCount - a.questionCount || a.name.localeCompare(b.name));
}

function localTopicMatches(text, topics) {
  const input = normalizeTopic(text);
  const inputTokens = new Set(input.split(' ').filter((token) => token.length > 2));
  return topics.map((topic) => {
    const candidate = normalizeTopic(topic.name);
    const tokens = candidate.split(' ').filter((token) => token.length > 2);
    const overlap = tokens.length ? tokens.filter((token) => inputTokens.has(token)).length / tokens.length : 0;
    const exactPhrase = candidate.length >= 4 && input.includes(candidate);
    const confidence = exactPhrase ? 0.98 : overlap >= 0.8 ? 0.88 : overlap >= 0.5 ? 0.68 : 0;
    return { ...topic, confidence };
  }).filter((topic) => topic.confidence > 0).sort((a, b) => b.confidence - a.confidence).slice(0, 8);
}

module.exports = { inferSubject, listCanonicalTopics, localTopicMatches, normalizeTopic, topicKey };
