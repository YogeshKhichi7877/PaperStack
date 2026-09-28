export const OFFICIAL_BRANCHES = Object.freeze([
  { key: 'CSE', short: 'CSE', name: 'Computer Science & Engineering' },
  { key: 'CSE (AI-ML)', short: 'AI-ML', name: 'Artificial Intelligence & Machine Learning' },
  { key: 'Cyber Security', short: 'CYBER', name: 'Cyber Security' },
  { key: 'Mathematics and Computing', short: 'MnC', name: 'Mathematics and Computing' },
  { key: 'ECE', short: 'ECE', name: 'Electronics & Communication Engineering' },
]);

const key = (value) => String(value || '').toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]/g, '');
const aliases = new Map([
  ['cse', 'CSE'], ['computerscience', 'CSE'], ['computerscienceandengineering', 'CSE'],
  ['cseaiml', 'CSE (AI-ML)'], ['aiml', 'CSE (AI-ML)'], ['computerscienceaiml', 'CSE (AI-ML)'],
  ['cybersecurity', 'Cyber Security'], ['cyber', 'Cyber Security'], ['csecyber', 'Cyber Security'],
  ['csecybersecurity', 'Cyber Security'],
  ['mathematicsandcomputing', 'Mathematics and Computing'], ['mathsandcomputing', 'Mathematics and Computing'],
  ['mnc', 'Mathematics and Computing'],
  ['ece', 'ECE'], ['electronicsandcommunicationengineering', 'ECE'],
]);

export const normalizeBranch = (value) => aliases.get(key(value)) || null;

export const normalizeBranchList = (value) => {
  if (Array.isArray(value)) return [...new Set(value.flatMap(normalizeBranchList))];
  const raw = String(value || '').trim();
  if (!raw) return [];
  const direct = normalizeBranch(raw);
  return direct ? [direct] : [...new Set(raw.split(/\s*(?:&|\/|,)\s*/).map(normalizeBranch).filter(Boolean))];
};
