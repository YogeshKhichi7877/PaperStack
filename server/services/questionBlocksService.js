// Source boundaries are shared by local extraction and AI batching. Never filter
// or reconstruct individual answers: a main question owns its entire source span.
const PAGE_BREAK = '[[PAPERSTACK_PAGE_BREAK]]';
const sectionOf = (line) => {
  const match = line.match(/^(?:section|part)\s*[-–—:]?\s*([A-Z0-9]+)(?:\s*[-–—:].*)?$/i);
  return match ? `Section ${match[1].toUpperCase()}` : '';
};
function mainMarker(line) {
  const match = line.match(/^(Q(?:uestion)?\s*[.\-–—:]?\s*)?(\d{1,3})\s*[.:]?\s*((?:\(\s*(?:[a-z]|[ivxlcdm]{1,6}|\d{1,2})\s*\))*)\s*([.:)–—-]*)\s*(.*)$/i);
  if (match && (match[1] || match[3] || match[4] || /^\d+[.:]/.test(line)) && (match[1] || match[3] || !/^\d+\.\d/.test(line))) {
    return { number: match[2], explicit: Boolean(match[1]), parts: [...match[3].matchAll(/\(\s*([^()]+?)\s*\)/g)].map(m => m[1].toLowerCase()),
      rest: match[5], strength: match[1] ? 98 : 94 };
  }
  return null;
}
function partMarker(line) {
  const match = line.match(/^(\(\s*(?:[a-z]|[ivxlcdm]{1,6}|\d{1,2})\s*\)(?:\s*\(\s*(?:[a-z]|[ivxlcdm]{1,6}|\d{1,2})\s*\))*|(?:[a-z]|[ivxlcdm]{1,6})[.)])\s*(.*)$/i);
  if (!match) return null;
  const parts = match[1].includes('(') ? [...match[1].matchAll(/\(\s*([^()]+?)\s*\)/g)].map(m => m[1].toLowerCase()) : [match[1].slice(0, -1).toLowerCase()];
  return { parts, rest: match[2] };
}
function scanQuestionBlocks(rawText) {
  const text = String(rawText || '').normalize('NFC').replace(/\u00a0/g, ' ').replace(/\r\n?/g, '\n');
  const sourceLines = text.split('\n');
  const explicitNumbering = sourceLines.some(line => /^\s*Q(?:uestion)?\s*[.\-–—:]?\s*\d/i.test(line));
  let page = null, section = '', instructions = '', offset = 0, current = null, pendingOr = false;
  const blocks = [];
  let instructionMode = false;
  const counts = new Map();
  for (const line of sourceLines) counts.set(line.trim(), (counts.get(line.trim()) || 0) + 1);
  const flush = () => { if (current) blocks.push(current); current = null; };
  const append = (line, body, part = '') => {
    current.lines.push({ text: body, part });
    current.sourceLines.push(line);
    current.pageEnd = page;
    current.charEnd = offset - 1;
  };
  for (const rawLine of sourceLines) {
    const line = rawLine.trim().replace(/\\(?:textbf|textit|emph)\{([^{}]*)\}/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1');
    const location = offset;
    offset += rawLine.length + 1;
    if (line === PAGE_BREAK || /^\[Physical page \d+\]$/.test(line)) {
      page = line === PAGE_BREAK ? (page || 0) + 1 : Number(line.match(/\d+/)[0]);
      if (current) current.sourceLines.push(`[Physical page ${page}]`);
      continue;
    }
    if (!line) continue;
    if (/^(?:instructions?|notes?)\s*:/i.test(line) && !current) {
      instructionMode = true;
      instructions += `${instructions ? '\n' : ''}${line}`;
      continue;
    }
    if (/^page\s*\d+(?:\s*(?:of|\/)\s*\d+)?$|^--\s*\d+\s*of\s*\d+\s*--$|^end of (?:paper|question paper)$/i.test(line)) continue;
    const nextSection = sectionOf(line);
    if (nextSection) { flush(); section = nextSection; instructions = ''; pendingOr = false; continue; }
    if (/^scanned (?:with|by)\b|^[*\s]*(?:all the best|best of luck)[*!\s]*$/i.test(line)) continue;
    if (/^(?:.*\b(?:institute|university)\b.*|(?:subject|course|time|maximum marks|total marks)\s*:.*)$/i.test(line) && counts.get(line) > 1) continue;
    const instructionText = line.replace(/^\d+[.)]\s*/, '');
    if (!current && (instructionMode || !/^\d+[.)]/.test(line)) && /^(?:attempt|answer)\s+(?:any|all|only)\b|^(?:each question|all questions|assume suitable|draw suitable diagrams|mention the question|the distribution of marks)/i.test(instructionText)) {
      instructions += `${instructions ? '\n' : ''}${instructionText}`;
      instructionMode = true;
      continue;
    }
    if (!current && /^(?:instructions?\s*:?\s*)?(?:attempt|answer)\s+(?:any|all|only)\b/i.test(line)) { instructions = line; continue; }
    if (/^(?:\(?OR\)?|alternatively)\s*[:.]?$/i.test(line) && current) { pendingOr = true; continue; }
    let marker = mainMarker(line);
    if (!marker && (!current || /^[A-Z]$/.test(current.number))) {
      const alpha = line.match(/^([A-Z])[.)]\s+(.+)$/);
      if (alpha) marker = { number: alpha[1], parts: [], rest: alpha[2], strength: 92, explicit: false };
    }
    // In Q-numbered papers, numbered working steps/options belong to the Q.
    // A switch to bare numbering is ambiguous; retain it and require review.
    if (marker && current && explicitNumbering && !marker.explicit && !marker.parts.length) {
      current.ambiguous = true;
      marker = null;
    }
    const sameParent = marker && current && marker.number === current.number && marker.parts.length;
    if (marker && !sameParent) {
      let choiceGroup = '';
      if (pendingOr && current) {
        choiceGroup = current.choiceGroup || `${section || 'paper'}-q${current.number}-or-${blocks.length + 1}`;
        current.choiceGroup = choiceGroup;
      }
      flush(); pendingOr = false;
      instructionMode = false;
      current = { number: marker.number, section, instructions, choiceGroup, strength: marker.strength,
        lines: [], sourceLines: [], pageStart: page, pageEnd: page, charStart: location, charEnd: offset,
        activeLetter: '', parts: [], ambiguous: false, internalChoice: false };
    }
    if (!current) continue;
    if (pendingOr) { append('OR', 'OR'); current.internalChoice = true; pendingOr = false; }
    const part = marker?.parts.length ? { parts: marker.parts, rest: marker.rest } : !marker ? partMarker(line) : null;
    let path = '';
    if (part) {
      let segments = part.parts;
      const label = segments[0];
      const nextLetter = current.activeLetter && label.length === 1 && label.charCodeAt(0) === current.activeLetter.charCodeAt(0) + 1;
      // (c) and (d) are ordinary lettered parts, not Roman 100 and 500.
      // (i) after (h) also continues the alphabetic sequence.
      const roman = /^[ivxlcdm]+$/.test(label) && (label.length > 1 || /^[ivx]$/.test(label)) && !nextLetter;
      if (segments.length === 1 && roman && current.activeLetter) segments = [current.activeLetter, ...segments];
      else if (/^[a-z]$/.test(label) && !roman) current.activeLetter = label;
      path = segments.join('-');
      if (current.parts.includes(path)) current.ambiguous = true;
      current.parts.push(path);
    }
    const body = marker ? `${marker.parts.map(p => `(${p})`).join('')} ${marker.rest}`.trim() : rawLine.trimEnd();
    append(line, body, path);
  }
  if (pendingOr && current) { current.lines.push({ text: 'OR', part: '' }); current.ambiguous = true; }
  flush();
  return { blocks, text };
}
module.exports = { PAGE_BREAK, scanQuestionBlocks };
