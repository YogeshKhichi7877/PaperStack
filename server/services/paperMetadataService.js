const { FLAT_SUBJECT_CATALOG, normalizeSubjectCode, resolveSubject } = require('./subjectService');
const { analyzePdfWithAi } = require('./freeAiMetadataService');
const { normalizeBranch } = require('../utils/branches');

function metadataFromText(text, paper = {}, catalog = FLAT_SUBJECT_CATALOG) {
  const raw = String(text || '').slice(0, 5000);
  const questionStart = raw.search(/^\s*(?:Q\.?\s*\d|Question\s+\d|1[.)]\s)/im);
  const header = questionStart >= 0 ? raw.slice(0, questionStart) : raw;
  const codes = (header.match(/\b[A-Z]{2,6}\s*[- ]?\s*\d{3,4}\b/gi) || []).map(normalizeSubjectCode);
  const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
  const matched = catalog.filter((item) => codes.includes(normalizeSubjectCode(item.code)));
  if (!matched.length) matched.push(...catalog.filter((item) => [item.name, ...(item.aliases || [])].some((name) => name.length > 12 && normalizedHeader.includes(name.toLowerCase().replace(/[^a-z0-9]/g, '')))));
  const subject = matched.length === 1 ? matched[0] : null;
  const guesses = {};
  if (subject) {
    guesses.subject = subject.name; guesses.normalizedSubject = subject.name; guesses.subjectCode = subject.code;
    if (subject.branches.length === 1) guesses.branch = subject.branches[0];
    if (subject.semesters.length === 1) guesses.semester = subject.semesters[0];
  }
  if (!subject && codes.length === 1) guesses.subjectCode = codes[0];
  const branch = header.match(/(?:branch|department|programme|program)\s*[:.-]?\s*([^\n]+)/i);
  const detectedBranch = normalizeBranch(branch?.[1]);
  if (detectedBranch) guesses.branch = detectedBranch;
  const sem = header.match(/\b(?:semester|sem)\s*[:.-]?\s*(\d{1,2}|VIII|VII|VI|IV|V|III|II|I)\b/i);
  const roman = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };
  if (sem) { const value = Number(sem[1]) || roman[sem[1].toUpperCase()]; if (value >= 1 && value <= 8) guesses.semester = value; }
  const year = header.match(/\b(?:20\d{2})\b/);
  if (year) guesses.year = Number(year[0]);
  if (/\bmid[-\s]*(?:sem(?:ester)?|term)\b/i.test(header)) guesses.examType = 'Mid-Sem';
  else if (/\bend[-\s]*sem(?:ester)?\b|\bfinal examination\b/i.test(header)) guesses.examType = 'End-Sem';
  const marks = header.match(/\b(?:total|max(?:imum)?)\s*marks\s*[:=-]?\s*(\d{1,3})\b/i);
  if (marks) guesses.totalMarks = Number(marks[1]);
  const date = header.match(/\b(?:date\s*[:=-]?\s*)(\d{1,2}[/-]\d{1,2}[/-]\d{4})\b/i);
  if (date) guesses.examDate = date[1];
  // Approved metadata always wins. Record header conflicts for admin review.
  const approvedSubject = resolveSubject({ subject: paper.subject, subjectCode: paper.subjectCode });
  const conflicts = Object.keys(guesses).filter((key) => {
    if (['subject', 'normalizedSubject', 'subjectCode'].includes(key) && subject && approvedSubject.code === subject.code) return false;
    return paper[key] && String(paper[key]).toLowerCase() !== String(guesses[key]).toLowerCase();
  });
  const updates = Object.fromEntries(Object.entries(guesses).filter(([key]) => !paper[key]));
  if (subject && guesses.semester && !subject.semesters.includes(guesses.semester)) conflicts.push('semester');
  if (subject && guesses.branch && !subject.branches.includes(guesses.branch)) conflicts.push('branch');
  const missing = ['subject', 'subjectCode', 'branch', 'semester', 'examType', 'year'].filter((key) => !(paper[key] || updates[key]));
  const fields = Object.fromEntries(Object.entries(guesses).map(([key, value]) => [key, { value, confidence: conflicts.includes(key) ? 0.6 : 0.98 }]));
  if (paper.importBatchId && !missing.length) updates.title = `${paper.subject || updates.subject} · ${paper.examType || updates.examType} · ${paper.year || updates.year}`;
  return { updates, guesses, fields, conflicts, missing, confidence: conflicts.length ? 70 : missing.length ? 60 : 98, source: 'rule' };
}

async function extractPaperMetadata({ text, paper, buffer, allowAi }, analyze = analyzePdfWithAi) {
  const result = metadataFromText(text, paper);
  if (allowAi && result.missing.length && text.trim()) {
    try {
      const localMetadata = Object.fromEntries(['subject', 'subjectCode', 'branch', 'semester', 'year', 'examType', 'totalMarks', 'examDate']
        .map((key) => [key, result.updates[key] ?? paper[key]]).filter(([, value]) => value !== undefined));
      const ai = await analyze({ buffer, size: buffer.length, originalname: paper.originalFileName },
        { metadata: localMetadata, extraction: { textPreview: text.slice(0, 8000), fileHash: paper.fileHash } });
      if (ai.metadata) {
        // AI guesses are review suggestions, never overrides of approved fields.
        result.aiSuggestions = ai.metadata;
        result.source = 'hybrid';
        // Populate missing metadata for review, while keeping approved/rule fields.
        const suggestions = { subject: ai.metadata.subjectName, subjectCode: ai.metadata.subjectCode,
          branch: ai.metadata.branch, semester: ai.metadata.semester, year: ai.metadata.year, examType: ai.metadata.examType };
        for (const key of result.missing) if (suggestions[key]) {
          result.updates[key] = suggestions[key];
          result.fields[key] = { value: suggestions[key], confidence: 0.7 };
        }
        if (result.updates.subject) result.updates.normalizedSubject = result.updates.subject;
        result.uncertain = result.missing.filter((key) => Boolean(result.updates[key]));
        result.missing = result.missing.filter((key) => !result.updates[key]);
      }
    } catch { result.warning = 'Metadata AI fallback was unavailable.'; }
  }
  return result;
}

function classifyQuestions(questions, knownQuestions = []) {
  return questions.map((question) => {
    const text = question.questionText.toLowerCase();
    const matching = knownQuestions.filter((candidate) => (candidate.topics || []).some((topic) => topic.length > 3 && text.includes(topic.toLowerCase())));
    const topics = [...new Set([...(question.topics || []), ...matching.flatMap((q) => q.topics || []).filter((topic) => text.includes(topic.toLowerCase()))])];
    const units = [...new Set(matching.map((q) => q.unit).filter(Boolean))];
    return { ...question, topics, primaryTopic: question.primaryTopic || topics[0] || '',
      unit: units.length === 1 ? units[0] : null, difficulty: question.difficulty || 'unknown' };
  });
}
module.exports = { metadataFromText, extractPaperMetadata, classifyQuestions };
