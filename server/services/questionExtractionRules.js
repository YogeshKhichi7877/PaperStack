const { PAGE_BREAK, scanQuestionBlocks } = require('./questionBlocksService');
// Compatibility normalization (NFKC) would flatten mathematical superscripts.
const cleanLine = (v) => String(v || '').normalize('NFC').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
const cleanPdfText = (v) => String(v || '').normalize('NFC').replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim();
function extractMarks(text) {
  const value = cleanPdfText(text);
  const m = value.match(/(?:\[\s*(\d+(?:\.\d+)?(?:\s*\+\s*\d+(?:\.\d+)?)*)\s*(?:marks?|m)?\s*\]|\(\s*(\d+(?:\.\d+)?)\s*(?:marks?|m)\s*\)|\b(\d+(?:\.\d+)?)\s*(?:marks?|m))\s*$/i);
  if (!m) return { text: value, marks: null };
  const marks = (m[1] || m[2] || m[3]).split('+').reduce((s, x) => s + Number(x.trim()), 0);
  return marks > 0 && marks <= 100 ? { text: value.slice(0, m.index).trim(), marks } : { text: value, marks: null };
}
function classifyQuestionType(text) {
  const s = String(text || '').toLowerCase();
  if (/\b(write|develop|implement)\b.{0,30}\b(program|code|function|class)\b/.test(s)) return 'coding';
  if (/\b(draw|sketch|diagram|illustrate|plot|construct)\b/.test(s)) return 'diagram';
  if (/\b(derive|prove|show that|deduce)\b/.test(s)) return 'derivation';
  if (/\b(calculate|compute|evaluate|determine|find|solve)\b/.test(s) && /\d|=|matrix|probability|coordinate/.test(s)) return 'numerical';
  if (/\b(define|explain|describe|discuss|differentiate|compare|what|why|state|write short note)\b/.test(s)) return 'theory';
  if (/\balgorithm\b/.test(s)) return 'algorithm';
  return 'unknown';
}
function isQuestionText(text) {
  const v = cleanLine(text);
  const meaningful = /\p{L}/u.test(v) || /\d.*[=+×÷√∫∑≤≥±?]/u.test(v);
  return v.length >= 2 && meaningful && !/^(?:page\s*\d+|\d+|end of (?:paper|question paper)|(?:total|max(?:imum)?)\s*marks\s*:?\s*\d+|(?:subject|course|semester|time|date)\s*:.*)$/i.test(v);
}
function questionFromBlock(block) {
  const segments = [];
  let segment = { part: '', lines: [] };
  for (const line of block.lines) {
    if (line.part) { segments.push(segment); segment = { part: line.part, lines: [] }; }
    segment.lines.push(line.text);
  }
  segments.push(segment);
  const entries = segments.map(s => {
    const text = s.lines.join('\n');
    // Marks columns often align with the first line, followed by wrapped prose
    // or a figure. They need not be at the end of the whole subpart.
    const explicit = [...text.matchAll(/\[\s*(\d+(?:\s*\+\s*\d+)*)\s*marks?\s*\]/gi)]
      .map(m => m[1].split('+').reduce((sum, value) => sum + Number(value), 0));
    const lineMarks = s.lines.map(line => extractMarks(line).marks).filter(value => value != null);
    const annotations = explicit.length ? explicit : lineMarks;
    return { ...s, text, marks: annotations.length === 1 ? annotations[0] : null,
      ambiguous: annotations.length > 1 };
  });
  const parentMarks = entries.find(s => !s.part)?.marks ?? null;
  const parts = entries.filter(s => s.part);
  // Prefer an explicit parent total. Otherwise sum sibling totals, never count
  // both (a)'s marks and the marks on (a)(i)/(a)(ii).
  function total(prefix = '') {
    const children = parts.filter(s => s.part.startsWith(prefix) && !s.part.slice(prefix.length).includes('-'));
    const names = new Set(parts.filter(s => s.part.startsWith(prefix)).map(s => s.part.slice(prefix.length).split('-')[0]));
    let sum = 0;
    for (const name of names) {
      const own = children.find(s => s.part === prefix + name);
      const nested = parts.some(s => s.part.startsWith(prefix + name + '-'));
      const marks = own?.marks ?? (nested ? total(prefix + name + '-') : null);
      if (marks == null) return null;
      sum += marks;
    }
    return names.size ? sum : null;
  }
  const partTotal = block.internalChoice ? null : total();
  const instructionMarks = block.instructions.match(/each question (?:carries|is (?:of|worth))\s+(\d+)\s*marks?/i);
  const marks = parentMarks ?? (parts.length ? partTotal : extractMarks(block.lines.map(l => l.text).join('\n')).marks) ??
    (instructionMarks ? Number(instructionMarks[1]) : null);
  const rawText = block.lines.map((l, i) => `${l.part && i ? '\n' : ''}${l.text}`).join('\n').trim();
  // Retain every subpart mark in the body. Only a single un-parted question's
  // final mark annotation can safely be removed for display.
  const questionText = parts.length ? rawText : extractMarks(rawText).text;
  if (!isQuestionText(questionText)) return null;
  const incompletePart = parts.some(s => !s.text.replace(/^(?:\([^)]+\))+\s*/, '').trim());
  const ambiguous = block.ambiguous || incompletePart || block.internalChoice || entries.some(s => s.ambiguous) ||
    (parentMarks != null && partTotal != null && parentMarks !== partTotal);
  const confidence = Math.min(98, block.strength - (marks == null ? 12 : 0) - (ambiguous ? 20 : 0));
  return { questionNumber: block.number, questionLabel: `Q${block.number}`, questionKey: `q${block.number}`,
    part: '', parentQuestionKey: '', section: block.section, questionText, rawText,
    marks, confidence, source: 'rule', needsReview: confidence < 90 || marks == null || ambiguous,
    pageNumber: block.pageStart, pageStart: block.pageStart, pageEnd: block.pageEnd,
    charStart: block.charStart, charEnd: block.charEnd,
    questionType: classifyQuestionType(questionText), choiceGroup: block.choiceGroup,
    choiceInstructions: block.instructions,
    hasVisualContext: /\b(?:figure|diagram|circuit|graph)\b|\b(?:following|given)\s+table/i.test(questionText),
    mergedPartKeys: [...new Set(block.parts.map(part => `q${block.number}-${part}`.toLowerCase()))] };
}
function dedupeQuestions(questions) {
  const keys = new Map(), texts = new Set(), sections = new Map();
  return questions.filter((item) => {
    const text = `${item.section || ''}:${item.questionKey}:${cleanLine(item.questionText).toLowerCase()}`;
    if (!text || texts.has(text)) return false;
    texts.add(text);
    const originalKey = item.questionKey;
    if (sections.has(originalKey) && sections.get(originalKey) !== item.section) {
      item.questionKey += `-${String(item.section || 'unsectioned').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      // Legacy child keys are section-ambiguous; do not retire them automatically.
      item.mergedPartKeys = [];
    }
    if (!sections.has(originalKey)) sections.set(originalKey, item.section);
    const count = (keys.get(item.questionKey) || 0) + 1;
    keys.set(item.questionKey, count);
    if (count > 1) { item.questionKey += `-alternative-${count}`; if (!item.choiceGroup) item.needsReview = true; }
    return true;
  }).map((item, i) => ({ ...item, sequence: i + 1 }));
}
function buildOverallConfidence(questions) {
  return questions.length ? Math.round(questions.reduce((s, q) => s + q.confidence, 0) / questions.length) : 0;
}
function extractQuestionsFromText(rawText) {
  const { blocks, text } = scanQuestionBlocks(rawText);
  const textLength = text.split(PAGE_BREAK).join('').trim().length;
  const questions = dedupeQuestions(blocks.map(questionFromBlock).filter(Boolean)), warnings = [];
  const introductory = text.slice(0, blocks[0]?.charStart ?? text.length);
  const countPattern = '(\\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)';
  const expected = introductory.match(new RegExp(`out of\\s+${countPattern}\\b|total(?:\\s+of)?\\s+${countPattern}\\s+questions?\\b`, 'i'));
  const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
  const expectedValue = expected?.[1] || expected?.[2];
  const expectedQuestionCount = expectedValue ? Number(expectedValue) || numberWords.indexOf(expectedValue.toLowerCase()) : null;
  const incomplete = expectedQuestionCount > new Set(questions.map(q => `${q.section}:${q.questionNumber}`)).size;
  if (incomplete) {
    warnings.push(`The instructions refer to ${expectedQuestionCount} questions, but fewer were found. Check for missing pages or labels.`);
    for (const question of questions) question.needsReview = true;
  }
  const tops = new Map();
  for (const q of questions) {
    const previous = tops.get(q.section);
    if (/^\d+$/.test(q.questionNumber) && previous && Number(q.questionNumber) > previous + 1) {
      q.needsReview = true; q.confidence = Math.min(q.confidence, 75);
      warnings.push('Question numbering has a gap; check for missed boundaries.');
    }
    tops.set(q.section, Number(q.questionNumber));
  }
  if (!questions.length) warnings.push('No reliable question boundaries were detected.');
  if (textLength < 180) warnings.push('Very little PDF text was extracted; the paper may be scanned.');
  if (questions.some((q) => q.needsReview)) warnings.push('Uncertain boundaries or missing marks require review.');
  return { questions, confidence: buildOverallConfidence(questions), warnings, textLength, incomplete, expectedQuestionCount };
}
module.exports = { PAGE_BREAK, cleanPdfText, extractMarks, classifyQuestionType,
  isQuestionText, dedupeQuestions, buildOverallConfidence, extractQuestionsFromText };
