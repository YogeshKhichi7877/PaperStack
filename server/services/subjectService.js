const { SUBJECT_CATALOG } = require('../data/subjectCatalog');

function normalizeSubjectText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifySubject(value) {
  return normalizeSubjectText(value).replace(/\s+/g, '-');
}

function normalizeBranchList(value) {
  const raw = Array.isArray(value) ? value : [value];
  const result = new Set();

  raw.forEach((entry) => {
    String(entry || '')
      .toUpperCase()
      .split(/\s*&\s*|\s*\/\s*|\s*,\s*/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => result.add(item));
  });

  return Array.from(result);
}

function flattenSubjectCatalog() {
  const byCode = new Map();

  SUBJECT_CATALOG.forEach((catalogEntry) => {
    catalogEntry.subjects.forEach((subject) => {
      const code = String(subject.code || '').trim().toUpperCase();
      const key = code || `custom:${slugifySubject(subject.name)}`;
      const current = byCode.get(key) || {
        key,
        code,
        shortCode: String(subject.shortCode || '').trim().toUpperCase(),
        name: subject.name,
        aliases: new Set(),
        branches: new Set(),
        semesters: new Set(),
      };

      [subject.name, subject.code, subject.shortCode, ...(subject.aliases || [])]
        .filter(Boolean)
        .forEach((alias) => current.aliases.add(String(alias)));
      current.branches.add(catalogEntry.branch);
      current.semesters.add(Number(catalogEntry.semester));
      byCode.set(key, current);
    });
  });

  return Array.from(byCode.values()).map((item) => ({
    key: item.key,
    code: item.code,
    shortCode: item.shortCode,
    name: item.name,
    aliases: Array.from(item.aliases),
    branches: Array.from(item.branches).sort(),
    semesters: Array.from(item.semesters).sort((a, b) => a - b),
  }));
}

const FLAT_SUBJECT_CATALOG = flattenSubjectCatalog();

function scoreSubjectCandidate(candidate, input) {
  const normalizedCode = String(input.subjectCode || '').trim().toUpperCase();
  const normalizedShortCode = String(input.shortCode || '').trim().toUpperCase();
  const normalizedSubject = normalizeSubjectText(input.subject || input.subjectName);
  const branches = normalizeBranchList(input.branch || input.branches);
  const semester = Number(input.semester || input.semesters?.[0]) || null;

  let score = 0;
  if (normalizedCode && candidate.code === normalizedCode) score += 100;
  if (normalizedShortCode && candidate.shortCode === normalizedShortCode) score += 85;

  if (normalizedSubject) {
    const names = [candidate.name, candidate.code, candidate.shortCode, ...candidate.aliases]
      .filter(Boolean)
      .map(normalizeSubjectText);

    if (names.includes(normalizedSubject)) score += 70;
    else if (names.some((name) => name.includes(normalizedSubject) || normalizedSubject.includes(name))) score += 35;
  }

  if (branches.length && branches.some((branch) => candidate.branches.includes(branch))) score += 10;
  if (semester && candidate.semesters.includes(semester)) score += 10;

  return score;
}

function resolveSubject(input = {}) {
  const ranked = FLAT_SUBJECT_CATALOG
    .map((candidate) => ({ candidate, score: scoreSubjectCandidate(candidate, input) }))
    .sort((a, b) => b.score - a.score);

  if (ranked[0]?.score > 0) {
    return ranked[0].candidate;
  }

  const fallbackName = String(input.subject || input.subjectName || input.subjectCode || 'Unknown Subject').trim();
  const fallbackCode = String(input.subjectCode || '').trim().toUpperCase();
  return {
    key: fallbackCode || `custom:${slugifySubject(fallbackName || 'unknown-subject')}`,
    code: fallbackCode,
    shortCode: String(input.shortCode || '').trim().toUpperCase(),
    name: fallbackName || 'Unknown Subject',
    aliases: fallbackName ? [fallbackName] : [],
    branches: normalizeBranchList(input.branch || input.branches),
    semesters: [Number(input.semester)].filter(Number.isInteger),
  };
}

function normalizeSubjectKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.toLowerCase().startsWith('custom:')) {
    return `custom:${slugifySubject(raw.slice(7))}`;
  }
  return raw.toUpperCase();
}

module.exports = {
  FLAT_SUBJECT_CATALOG,
  flattenSubjectCatalog,
  normalizeSubjectText,
  normalizeBranchList,
  normalizeSubjectKey,
  resolveSubject,
  slugifySubject,
};
