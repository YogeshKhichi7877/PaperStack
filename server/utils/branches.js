const OFFICIAL_BRANCHES = Object.freeze([
  'CSE',
  'CSE (AI-ML)',
  'Cyber Security',
  'Mathematics and Computing',
  'ECE',
]);

function branchKey(value) {
  return String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]/g, '');
}

const ALIASES = new Map();
const QUERY_ALIASES = new Map();
function register(canonical, values) {
  values.forEach((value) => ALIASES.set(branchKey(value), canonical));
  QUERY_ALIASES.set(canonical, values);
}
register('CSE', ['CSE', 'Computer Science', 'Computer Science and Engineering']);
register('CSE (AI-ML)', ['CSE (AI-ML)', 'CSE AI ML', 'CSE AIML', 'AIML', 'AI-ML', 'Computer Science AI ML']);
register('Cyber Security', ['Cyber Security', 'CyberSecurity', 'Cyber', 'CSE Cyber', 'CSE Cyber Security']);
register('Mathematics and Computing', ['Mathematics and Computing', 'Maths and Computing', 'MNC', 'MnC', 'Mathematics & Computing']);
register('ECE', ['ECE', 'Electronics and Communication Engineering']);

function normalizeBranch(value) {
  return ALIASES.get(branchKey(value)) || null;
}

function normalizeBranchList(value) {
  if (Array.isArray(value)) return [...new Set(value.flatMap(normalizeBranchList))];
  const raw = String(value || '').trim();
  if (!raw) return [];
  const direct = normalizeBranch(raw);
  if (direct) return [direct];
  return [...new Set(raw.split(/\s*(?:&|\/|,)\s*/).map(normalizeBranch).filter(Boolean))];
}

function branchQueryValues(value) {
  const canonical = normalizeBranch(value);
  if (!canonical) return [];
  const values = [...new Set([canonical, ...(QUERY_ALIASES.get(canonical) || [])])];
  if (canonical === 'CSE' || canonical === 'ECE') values.push('CSE & ECE');
  return values;
}

module.exports = { OFFICIAL_BRANCHES, normalizeBranch, normalizeBranchList, branchQueryValues };
