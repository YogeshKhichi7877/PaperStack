const COMMON_ALIASES = {
  midpoint: ['mid point', 'mid-point'],
  midpont: ['midpoint', 'mid point'],
  'mid point': ['midpoint', 'mid-point'],
  'composite transform': ['composite transformation', 'combined transformation', 'transformation composition'],
  fnn: ['feedforward neural network', 'feed forward neural network'],
  cg: ['computer graphics'],
  'cse aiml': ['cse ai ml', 'cse artificial intelligence machine learning', 'aiml'],
  aiml: ['ai ml', 'artificial intelligence and machine learning', 'cse aiml'],
};

function normalize(value = '') {
  return String(value).normalize('NFKC').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function boundedEditDistance(left, right, maxDistance = 2) {
  const a = normalize(left);
  const b = normalize(right);
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let rowMin = current[0];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > maxDistance) return maxDistance + 1;
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return previous[b.length];
}

function expandAliases(query, catalog = []) {
  const normalized = normalize(query);
  const values = new Set([normalized]);
  Object.entries(COMMON_ALIASES).forEach(([key, aliases]) => {
    if (normalized.includes(key) || aliases.some((alias) => normalized.includes(normalize(alias)))) {
      values.add(key);
      aliases.forEach((alias) => values.add(normalize(alias)));
    }
  });
  catalog.forEach((subject) => {
    const names = [subject.code, subject.shortCode, subject.name, ...(subject.aliases || [])].filter(Boolean);
    const matched = names.some((name) => normalized.includes(normalize(name)) || normalize(name).includes(normalized));
    if (matched) names.forEach((name) => values.add(normalize(name)));
  });
  return [...values].filter(Boolean);
}

function fuzzyTokenScore(query, field) {
  const queryTokens = normalize(query).split(' ').filter((token) => token.length >= 3);
  const fieldTokens = normalize(field).split(' ').filter(Boolean);
  if (!queryTokens.length || !fieldTokens.length) return 0;
  let matched = 0;
  queryTokens.forEach((token) => {
    const allowed = token.length >= 7 ? 2 : 1;
    if (fieldTokens.some((candidate) => boundedEditDistance(token, candidate, allowed) <= allowed)) matched += 1;
  });
  return matched / queryTokens.length;
}

module.exports = { COMMON_ALIASES, boundedEditDistance, expandAliases, fuzzyTokenScore, normalize };
