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

function descriptiveAliases(candidate) {
  const code = normalizeSubjectText(candidate.code);
  const shortCode = normalizeSubjectText(candidate.shortCode);

  return [candidate.name, ...(candidate.aliases || [])]
    .filter(Boolean)
    .map(normalizeSubjectText)
    .filter(Boolean)
    // Codes such as IC, AI, DS and CG are useful for exact matching, but must
    // never participate in substring matching (e.g. "graphics" contains "ic").
    .filter((value) => value !== code && value !== shortCode);
}

function phraseIncludes(haystack, needle) {
  if (!haystack || !needle) return false;
  // Do not use partial matching for very short tokens/codes.
  if (needle.length < 4) return false;
  return haystack === needle || haystack.includes(needle);
}

function scoreSubjectCandidate(candidate, input) {
  const normalizedCode = String(input.subjectCode || '').trim().toUpperCase();
  const normalizedShortCode = String(input.shortCode || '').trim().toUpperCase();
  const normalizedSubject = normalizeSubjectText(input.subject || input.subjectName);
  const branches = normalizeBranchList(input.branch || input.branches);
  const semester = Number(input.semester || input.semesters?.[0]) || null;

  let score = 0;

  // Explicit structured metadata is strongest.
  if (normalizedCode && candidate.code === normalizedCode) score += 120;
  if (normalizedShortCode && candidate.shortCode === normalizedShortCode) score += 110;

  if (normalizedSubject) {
    const candidateCode = normalizeSubjectText(candidate.code);
    const candidateShortCode = normalizeSubjectText(candidate.shortCode);
    const names = descriptiveAliases(candidate);

    // A subject field may itself contain only CS502 or CG.
    if (candidateCode && normalizedSubject === candidateCode) score += 100;
    if (candidateShortCode && normalizedSubject === candidateShortCode) score += 95;

    // Exact descriptive names/aliases are preferred.
    if (names.includes(normalizedSubject)) {
      score += 80;
    } else if (
      names.some((name) =>
        phraseIncludes(normalizedSubject, name) ||
        (normalizedSubject.length >= 4 && phraseIncludes(name, normalizedSubject))
      )
    ) {
      // Handles legacy labels such as "Computer Graphics (CG)" after
      // normalization, without allowing short-code collisions.
      score += 40;
    }
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
