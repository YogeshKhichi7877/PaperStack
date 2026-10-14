// Model confidence is not evidence of completeness. Check the readable source
// words, values and part labels before permitting AI/OCR to replace source text.
function canonical(value) {
  return String(value || '').normalize('NFC')
    .replace(/\\(?:leq?|geq?|times|cdot|div|pm|neq?|infty|int|sum|sqrt)\b/g, token => ({
      '\\le': '≤', '\\leq': '≤', '\\ge': '≥', '\\geq': '≥', '\\times': '×', '\\cdot': '×',
      '\\div': '÷', '\\pm': '±', '\\ne': '≠', '\\neq': '≠', '\\infty': '∞', '\\int': '∫', '\\sum': '∑', '\\sqrt': '√',
    })[token])
    .replace(/\[\s*\d+(?:\s*\+\s*\d+)*(?:\s*marks?)?\s*\]|\(\s*\d+\s*marks?\s*\)|\b\d+\s*marks?\b/g, '')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/g, char => String('⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉'.indexOf(char) % 10));
}
function bag(tokens) {
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);
  return counts;
}
function coverage(source, target) {
  if (!source.length) return 1;
  const counts = bag(target);
  let found = 0;
  for (const token of source) if (counts.get(token) > 0) { found++; counts.set(token, counts.get(token) - 1); }
  return found / source.length;
}
function preservesSource(source, target) {
  const before = canonical(source), after = canonical(target);
  const words = value => (value.match(/\p{L}{2,}/gu) || []).map(word => word.toLowerCase());
  const values = value => value.match(/\d+(?:\.\d+)?|[≤≥≠±∫∑√∞×÷=<>+*/^-]|(?<![A-Za-z])[A-Za-z](?![A-Za-z])/gu) || [];
  const labels = value => (value.toLowerCase().match(/\([a-zivxlcdm\d]+\)/g) || []);
  return coverage(words(before), words(after)) >= 0.92 &&
    coverage(values(before), values(after)) === 1 &&
    coverage(labels(before), labels(after)) === 1;
}
module.exports = { preservesSource };
