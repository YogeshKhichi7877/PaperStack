const PAGE_BREAK = '[[PAPERSTACK_PAGE_BREAK]]';
// Compatibility normalization (NFKC) would flatten mathematical superscripts.
const cleanLine = (v) => String(v || '').normalize('NFC').replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').trim();
const cleanPdfText = (v) => String(v || '').normalize('NFC').replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').trim();
function parseSection(line) {
  const m = cleanLine(line).match(/^(?:section|part)\s*[-–—:]?\s*([A-Z0-9]+)(?:\s*[-–—:].*)?$/i);
  return m ? `Section ${m[1].toUpperCase()}` : '';
}
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
  return v.length >= 10 && /\p{L}/u.test(v) && !/^(?:page\s*\d+|\d+|end of (?:paper|question paper)|(?:total|max(?:imum)?)\s*marks\s*:?\s*\d+|(?:subject|course|semester|time|date)\s*:.*)$/i.test(v);
}
function normalizeQuestionCandidate(c) {
  const combined = cleanPdfText(c.lines.join('\n'));
  const r = extractMarks(combined);
  if (!isQuestionText(r.text)) return null;
  const confidence = Math.min(98, c.markerStrength - (r.marks === null ? 12 : 0) - (c.ambiguous ? 20 : 0));
  const prefix = '';
  return { questionNumber: String(c.number), questionLabel: `Q${c.number}${c.part ? `(${c.part.replace(/-/g, ')(')})` : ''}`,
    questionKey: `${prefix}q${c.number}${c.part ? `-${c.part}` : ''}`, part: c.part || '', parentQuestionKey: c.parentQuestionKey || '',
    sequence: c.sequence, section: c.section || '', questionText: r.text, rawText: combined, marks: r.marks,
    pageNumber: c.pageNumber, pageStart: c.pageNumber, pageEnd: c.pageEnd, questionType: classifyQuestionType(r.text), charStart: c.charStart, charEnd: c.charEnd,
    source: 'rule', confidence, choiceGroup: c.choiceGroup || '', choiceInstructions: c.choiceInstructions || '',
    hasVisualContext: /\b(?:figure|diagram|circuit|graph|table)\s+(?:below|above|shown|given)|\b(?:following|given)\s+(?:figure|diagram|circuit|graph|table)/i.test(r.text),
    needsReview: confidence < 90 || r.marks === null || Boolean(c.ambiguous) };
}
function dedupeQuestions(questions) {
  const keys = new Map(), texts = new Set();
  return questions.filter((item) => {
    const text = cleanLine(item.questionText).toLowerCase();
    if (!text || texts.has(text)) return false;
    texts.add(text);
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
  const text = cleanPdfText(rawText), lines = text.split('\n').map(cleanLine).filter(Boolean);
  const textLength = text.split(PAGE_BREAK).join('').trim().length;
  const counts = new Map();
  for (const line of lines) counts.set(line, (counts.get(line) || 0) + 1);
  let page = 1, sawPage = false, section = '', top = null, current = null;
  let stem = [], stemPage = null, nestedStem = [], nestedPage = null, alphabeticPart = '', pendingChoice = '', instructions = '', offset = 0;
  const candidates = [];
  const flush = () => { if (current) { const q = normalizeQuestionCandidate(current); if (q) candidates.push(q); } current = null; };
  for (const line of lines) {
    const location = Math.max(offset, text.indexOf(line, offset));
    offset = location + line.length;
    // A physical page boundary is not a question boundary.
    if (line === PAGE_BREAK) { page += sawPage ? 1 : 0; sawPage = true; continue; }
    if (/^(?:page\s*)?\d+(?:\s*(?:of|\/)\s*\d+)?$|^end of (?:paper|question paper)$/i.test(line)) continue;
    if (counts.get(line) > 1 && /^(?:.*examination|.*institute|.*university|subject\s*:|course\s*:|time\s*:|maximum marks)/i.test(line)) continue;
    const sec = parseSection(line);
    if (sec) { flush(); section = sec; top = null; stem = []; nestedStem = []; alphabeticPart = ''; instructions = ''; continue; }
    if (/^(?:instructions?\s*:?\s*)?(?:attempt|answer)\s+(?:any|all|only)\b/i.test(line)) { instructions = line; continue; }
    if (/^(?:\(?OR\)?|alternatively)\s*[:.]?$/i.test(line)) {
      pendingChoice = (current ? current.choiceGroup : candidates.at(-1)?.choiceGroup) || `${section || 'paper'}-q${top || candidates.length + 1}-or-${candidates.length + 1}`;
      if (current) current.choiceGroup = pendingChoice; else if (candidates.length) candidates[candidates.length - 1].choiceGroup = pendingChoice;
      flush(); continue;
    }
    let m = line.match(/^(?:q(?:uestion)?\s*\.?\s*)(\d{1,3})\s*(?:\(\s*([a-z]|[ivxlcdm]{1,6})\s*\))?\s*[.:)–—-]*\s*(.*)$/i);
    let strength = 98, number, part = '', rest, kind = 'top';
    if (!m) m = line.match(/^(\d{1,3})\s*\(\s*([a-z]|[ivxlcdm]{1,6})\s*\)\s*[.:–—-]*\s*(.*)$/i);
    if (m) { number = m[1]; part = (m[2] || '').toLowerCase(); rest = m[3]; }
    else {
      m = line.match(/^(?:\((\d{1,2})\)|(\d{1,2})[.)])\s*(.*)$/);
      if (m) { number = m[1] || m[2]; rest = m[3]; strength = 94; }
      else {
        m = line.match(/^([A-Z])[.)]\s+(.+)$/);
        if (m && (top === null || /^[A-Z]$/.test(String(top)))) { number = m[1]; rest = m[2]; strength = 92; }
        else {
          m = line.match(/^(?:\(\s*([a-z]|[ivxlcdm]{1,6})\s*\)|([a-z]|[ivxlcdm]{1,6})[.)])\s*(.*)$/i);
          if (m && top !== null) {
            number = top; part = (m[1] || m[2]).toLowerCase(); rest = m[3]; kind = 'sub'; strength = 96;
            if (/^[ivxlcdm]+$/.test(part) && alphabeticPart && alphabeticPart !== 'i') part = `${alphabeticPart}-${part}`;
          } else m = null;
        }
      }
    }
    if (m) {
      // Carry shared main/lettered stems into answerable children without saving a duplicate stem record.
      if (kind === 'sub' && current && !current.part) { stem = current.lines; stemPage = current.pageNumber; current = null; }
      else if (kind === 'sub' && part.includes('-') && current && current.part === alphabeticPart) { nestedStem = current.lines; nestedPage = current.pageNumber; current = null; }
      else flush();
      if (kind === 'top' && number !== top) { stem = []; stemPage = null; nestedStem = []; alphabeticPart = ''; }
      top = number;
      if (part && !part.includes('-') && !/^[ivxlcdm]+$/.test(part)) { alphabeticPart = part; nestedStem = []; nestedPage = null; }
      const prefix = '';
      current = { number, part, section, sequence: candidates.length + 1, markerStrength: strength,
        pageNumber: (part.includes('-') ? nestedPage : stemPage) || (sawPage ? page : null),
        charStart: location, charEnd: offset, pageEnd: sawPage ? page : null,
        parentQuestionKey: part ? `${prefix}q${number}${part.includes('-') ? `-${alphabeticPart}` : ''}` : '',
        lines: [...(part.includes('-') && nestedStem.length ? nestedStem : stem), ...(rest ? [rest] : [])], choiceGroup: pendingChoice, choiceInstructions: instructions };
      pendingChoice = ''; continue;
    }
    if (current) { current.lines.push(line); current.pageEnd = sawPage ? page : null; current.charEnd = offset; }
  }
  flush();
  const questions = dedupeQuestions(candidates), warnings = [];
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
  return { questions, confidence: buildOverallConfidence(questions), warnings, textLength };
}
module.exports = { PAGE_BREAK, cleanPdfText, parseSection, extractMarks, classifyQuestionType,
  isQuestionText, normalizeQuestionCandidate, dedupeQuestions, buildOverallConfidence, extractQuestionsFromText };
