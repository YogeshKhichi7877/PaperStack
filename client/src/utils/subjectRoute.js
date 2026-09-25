function stripLegacySubjectSuffix(value) {
  return String(value || '')
    .trim()
    .replace(/\s*\(([A-Za-z0-9&+._-]{1,16})\)\s*$/, '')
    .trim();
}

export function getSubjectRouteKey(source = {}) {
  const explicitKey = source.subjectKey || source.subjectCode || source.shortCode || '';
  if (String(explicitKey || '').trim()) return String(explicitKey).trim();

  const legacyName = source.subject || source.subjectName || '';
  return stripLegacySubjectSuffix(legacyName);
}

export function getSubjectHubPath(source = {}) {
  const key = getSubjectRouteKey(source);
  return key ? `/subject/${encodeURIComponent(key)}` : '/';
}

export { stripLegacySubjectSuffix };
