const {
  normalizeSubjectKey,
  normalizeSubjectText,
  resolveSubject,
} = require('./subjectService');

function stripLegacyDisplaySuffix(value) {
  return String(value || '')
    .trim()
    .replace(/\s*\(([A-Za-z0-9&+._-]{1,16})\)\s*$/, '')
    .trim();
}

function resolveResourceSubjectKey(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.toLowerCase().startsWith('custom:')) {
    return normalizeSubjectKey(raw);
  }

  const cleaned = stripLegacyDisplaySuffix(raw);
  // Resolve the cleaned descriptive label first. This avoids legacy suffixes
  // such as (CG), (DS), or (CC) affecting catalog matching.
  const candidates = cleaned && normalizeSubjectText(cleaned) !== normalizeSubjectText(raw)
    ? [cleaned, raw]
    : [raw];

  for (const candidate of candidates) {
    const resolved = resolveSubject({ subject: candidate });
    if (resolved?.key && !String(resolved.key).startsWith('custom:')) {
      return resolved.key;
    }
  }

  const fallback = resolveSubject({ subject: cleaned || raw });
  if (fallback?.key) return fallback.key;

  return normalizeSubjectKey(raw);
}

module.exports = {
  resolveResourceSubjectKey,
  stripLegacyDisplaySuffix,
};
