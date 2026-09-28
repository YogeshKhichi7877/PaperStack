const PAGE_BREAK = '[[PAPERSTACK_PAGE_BREAK]]';

function cleanLine(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function cleanPdfText(value) {
  return String(value || '')
    .normalize('NFKC')
    .replace(/\u00a0/g, ' ')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n')
    .trim();
}

function parseSection(line) {
  const match = cleanLine(line).match(
    /^(?:section|part)\s*[-–—:]?\s*([A-Z0-9]+)(?:\s*[-–—:]\s*(.*))?$/i
  );
  if (!match) return '';
  return `Section ${String(match[1] || '').toUpperCase()}`;
}

function extractMarks(text) {
  let value = cleanLine(text);
  let marks = null;

  const patterns = [
    /(?:\[\s*|\(\s*)(\d+(?:\.\d+)?)\s*(?:marks?|mark|m)?\s*(?:\]|\))\s*$/i,
    /\b(\d+(?:\.\d+)?)\s*(?:marks?|mark)\s*$/i,
    /\b(\d+(?:\.\d+)?)\s*m\s*$/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (!match) continue;

    const numeric = Number(match[1]);
    if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 100) {
      marks = numeric;
      value = cleanLine(value.slice(0, match.index));
      break;
    }
  }

  return { text: value, marks };
}

function classifyQuestionType(text) {
  const source = String(text || '').toLowerCase();

  if (/\b(write|develop|implement)\b.{0,30}\b(program|code|function|class|algorithm)\b/.test(source)) {
    return 'coding';
  }
  if (/\b(draw|sketch|diagram|illustrate|plot|construct)\b/.test(source)) {
    return 'diagram';
  }
  if (/\b(derive|prove|show that|deduce)\b/.test(source)) {
    return 'derivation';
  }
  if (
    /\b(calculate|compute|evaluate|determine|find|solve)\b/.test(source) &&
    /(?:\d|=|\+|-|\*|\/|matrix|probability|mean|variance|coordinate|angle|radius)/.test(source)
  ) {
    return 'numerical';
  }
  if (/\b(define|explain|describe|discuss|differentiate|compare|what|why|state|write short note)\b/.test(source)) {
    return 'theory';
  }

  return 'unknown';
}

function explicitTopMatch(line) {
  const source = cleanLine(line);

  let match = source.match(
    /^(?:q(?:uestion)?\s*\.?\s*)(\d{1,2})\s*(?:[\(\[]\s*([a-h])\s*[\)\]])?\s*[.:\-–—)]*\s*(.*)$/i
  );
  if (match) {
    return {
      kind: match[2] ? 'combined' : 'top',
      number: Number(match[1]),
      part: match[2] ? match[2].toLowerCase() : '',
      rest: cleanLine(match[3]),
      strength: 100,
    };
  }

  match = source.match(/^\((\d{1,2})\)\s*(.*)$/);
  if (match) {
    return {
      kind: 'top',
      number: Number(match[1]),
      part: '',
      rest: cleanLine(match[2]),
      strength: 86,
    };
  }

  return null;
}

function simpleTopMatch(line) {
  const source = cleanLine(line);
  const match = source.match(/^(\d{1,2})\s*[.)]\s+(.+)$/);
  if (!match) return null;

  const number = Number(match[1]);
  if (!Number.isInteger(number) || number < 1 || number > 50) return null;

  return {
    kind: 'top',
    number,
    part: '',
    rest: cleanLine(match[2]),
    strength: 74,
  };
}

function subPartMatch(line, currentTopNumber) {
  if (!currentTopNumber) return null;
  const source = cleanLine(line);

  let match = source.match(/^[([]\s*([a-h])\s*[)\]]\s*[.:\-–—]*\s*(.*)$/i);
  if (!match) {
    match = source.match(/^([a-h])\s*[.)]\s+(.+)$/i);
  }
  if (!match) return null;

  return {
    kind: 'sub',
    number: currentTopNumber,
    part: String(match[1]).toLowerCase(),
    rest: cleanLine(match[2]),
    strength: 88,
  };
}

function normalizeQuestionCandidate(candidate) {
  const combined = cleanLine(candidate.lines.join(' '));
  const marksResult = extractMarks(combined);

  if (!marksResult.text || marksResult.text.length < 3) return null;

  const questionLabel = candidate.part
    ? `Q${candidate.number}(${candidate.part})`
    : `Q${candidate.number}`;

  const confidence = Math.max(
    35,
    Math.min(
      98,
      Math.round(
        candidate.markerStrength * 0.72 +
        Math.min(16, marksResult.text.length / 12) +
        (marksResult.marks !== null ? 7 : 0) +
        (candidate.pageNumber ? 3 : 0)
      )
    )
  );

  return {
    questionNumber: String(candidate.number),
    questionLabel,
    questionKey: candidate.part
      ? `q${candidate.number}-${candidate.part}`
      : `q${candidate.number}`,
    part: candidate.part || '',
    parentQuestionKey: candidate.part ? `q${candidate.number}` : '',
    sequence: candidate.sequence,
    section: candidate.section || '',
    questionText: marksResult.text,
    rawText: combined,
    marks: marksResult.marks,
    pageNumber: candidate.pageNumber || null,
    questionType: classifyQuestionType(marksResult.text),
    source: 'rule',
    confidence,
    needsReview: confidence < 70,
  };
}

function sequenceScore(questions) {
  const seen = new Set();
  const topNumbers = [];

  questions.forEach((question) => {
    const number = Number(question.questionNumber);
    if (!Number.isFinite(number) || seen.has(number)) return;
    seen.add(number);
    topNumbers.push(number);
  });

  if (topNumbers.length < 2) return topNumbers.length ? 0.55 : 0;

  let good = 0;
  for (let index = 1; index < topNumbers.length; index += 1) {
    const delta = topNumbers[index] - topNumbers[index - 1];
    if (delta === 1 || delta === 0) good += 1;
  }

  return good / (topNumbers.length - 1);
}

function dedupeQuestions(questions) {
  const seen = new Set();
  const result = [];

  for (const question of questions) {
    const key = String(question.questionKey || '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(question);
  }

  return result.map((question, index) => ({
    ...question,
    sequence: index + 1,
  }));
}

function buildOverallConfidence(questions, textLength) {
  if (!questions.length) return 0;

  const averageQuestionConfidence =
    questions.reduce((sum, question) => sum + Number(question.confidence || 0), 0) /
    questions.length;

  const countScore = questions.length >= 5
    ? 100
    : questions.length >= 3
      ? 84
      : questions.length === 2
        ? 62
        : 34;

  const seqScore = sequenceScore(questions) * 100;
  const textScore = textLength >= 800
    ? 100
    : textLength >= 350
      ? 82
      : textLength >= 150
        ? 60
        : 30;

  return Math.round(
    averageQuestionConfidence * 0.48 +
    countScore * 0.24 +
    seqScore * 0.18 +
    textScore * 0.10
  );
}

function extractQuestionsFromText(rawText) {
  const text = cleanPdfText(rawText);
  if (!text) {
    return {
      questions: [],
      confidence: 0,
      warnings: ['PDF contains no extractable text.'],
      textLength: 0,
    };
  }

  const lines = text
    .split('\n')
    .map(cleanLine)
    .filter(Boolean);

  let currentSection = '';
  let currentTopNumber = null;
  let pageNumber = 1;
  let current = null;
  const candidates = [];
  let sawPageBreak = false;

  const flush = () => {
    if (!current) return;
    const normalized = normalizeQuestionCandidate(current);
    if (normalized) candidates.push(normalized);
    current = null;
  };

  for (const line of lines) {
    if (line === PAGE_BREAK) {
      flush();
      pageNumber += sawPageBreak ? 1 : 0;
      sawPageBreak = true;
      if (pageNumber === 1) pageNumber = 1;
      continue;
    }

    const section = parseSection(line);
    if (section) {
      currentSection = section;
      continue;
    }

    let marker = explicitTopMatch(line);

    if (!marker) {
      const simple = simpleTopMatch(line);
      if (
        simple &&
        (
          currentTopNumber === null
            ? simple.number <= 3
            : simple.number === currentTopNumber + 1 || simple.number === currentTopNumber
        )
      ) {
        marker = simple;
      }
    }

    if (!marker) {
      marker = subPartMatch(line, currentTopNumber);
    }

    if (marker) {
      flush();

      if (marker.kind === 'top' || marker.kind === 'combined') {
        currentTopNumber = marker.number;
      }

      current = {
        number: marker.number,
        part: marker.part || '',
        section: currentSection,
        pageNumber: sawPageBreak ? pageNumber : null,
        markerStrength: marker.strength,
        sequence: candidates.length + 1,
        lines: marker.rest ? [marker.rest] : [],
      };
      continue;
    }

    if (current) {
      current.lines.push(line);
    }
  }

  flush();

  const questions = dedupeQuestions(candidates);
  const confidence = buildOverallConfidence(questions, text.length);
  const warnings = [];

  if (questions.length === 0) {
    warnings.push('No reliable question boundaries were detected.');
  } else if (questions.length === 1) {
    warnings.push('Only one question was detected; review extraction before relying on it.');
  } else if (questions.length < 3) {
    warnings.push('Few question boundaries were detected; this may be a partial extraction.');
  }

  if (text.length < 180) {
    warnings.push('Very little PDF text was extracted; the paper may be scanned.');
  }

  if (confidence < 70 && questions.length) {
    warnings.push('Local question extraction confidence is low.');
  }

  return {
    questions,
    confidence,
    warnings,
    textLength: text.length,
  };
}

module.exports = {
  PAGE_BREAK,
  buildOverallConfidence,
  classifyQuestionType,
  cleanPdfText,
  dedupeQuestions,
  extractMarks,
  extractQuestionsFromText,
  normalizeQuestionCandidate,
  parseSection,
};
