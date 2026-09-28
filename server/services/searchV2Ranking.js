function normalizeText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value = '') {
  return String(value || '').replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}

function tokens(value = '') {
  return [
    ...new Set(
      normalizeText(value)
        .split(' ')
        .filter((token) => token.length >= 2)
    ),
  ];
}

function detectExamType(query = '') {
  const text = normalizeText(query);

  if (/\b(mid|midsem|mid sem|mid semester|mse)\b/.test(text)) {
    return 'Mid-Sem';
  }

  if (/\b(end|endsem|end sem|end semester|ese)\b/.test(text)) {
    return 'End-Sem';
  }

  return '';
}

function detectBranch(query = '') {
  const text = normalizeText(query);

  if (/\bece\b/.test(text)) return 'ECE';
  if (/\bcse\b/.test(text)) return 'CSE';

  return '';
}

function detectSemester(query = '') {
  const text = normalizeText(query);

  const match = text.match(
    /\b(?:sem|semester)\s*([1-8])\b/
  );

  return match ? Number(match[1]) : null;
}

function detectYear(query = '') {
  const match = String(query || '').match(
    /\b(20\d{2})\b/
  );

  return match ? Number(match[1]) : null;
}

function catalogSubjectMatch(
  query,
  catalog = []
) {
  const normalized = normalizeText(query);
  if (!normalized) return null;

  const queryTokens = new Set(
    tokens(normalized)
  );

  let best = null;

  catalog.forEach((subject) => {
    const code = normalizeText(subject.code);
    const shortCode = normalizeText(subject.shortCode);

    const names = [
      subject.name,
      ...(subject.aliases || []),
    ]
      .map(normalizeText)
      .filter(Boolean);

    let score = 0;

    if (code && queryTokens.has(code)) {
      score = Math.max(score, 120);
    }

    if (shortCode && queryTokens.has(shortCode)) {
      score = Math.max(score, 110);
    }

    names.forEach((name) => {
      if (normalized === name) {
        score = Math.max(score, 100);
      } else if (
        name.length >= 4 &&
        (
          normalized.includes(name) ||
          name.includes(normalized)
        )
      ) {
        score = Math.max(score, 70);
      }
    });

    if (score > (best?.score || 0)) {
      best = {
        ...subject,
        score,
      };
    }
  });

  return best?.score >= 70
    ? best
    : null;
}

function parseSearchIntent(
  query,
  catalog = []
) {
  const subject = catalogSubjectMatch(
    query,
    catalog
  );

  return {
    branch: detectBranch(query),
    semester: detectSemester(query),
    examType: detectExamType(query),
    year: detectYear(query),
    subjectCode: subject?.code || '',
    subjectName: subject?.name || '',
  };
}


function residualSearchText(
  query,
  catalog = []
) {
  const intent =
    parseSearchIntent(
      query,
      catalog
    );

  const remove =
    new Set([
      'cse',
      'ece',
      'sem',
      'semester',
      'mid',
      'midsem',
      'mse',
      'end',
      'endsem',
      'ese',
    ]);

  if (
    intent.year
  ) {
    remove.add(
      String(
        intent.year
      )
    );
  }

  if (
    intent.semester
  ) {
    remove.add(
      String(
        intent.semester
      )
    );
  }

  if (
    intent.subjectCode
  ) {
    const subject =
      catalog.find(
        (item) =>
          item.code ===
          intent.subjectCode
      );

    [
      subject?.code,
      subject?.shortCode,
      subject?.name,
      ...(
        subject?.aliases ||
        []
      ),
    ]
      .filter(Boolean)
      .flatMap(
        tokens
      )
      .forEach(
        (token) =>
          remove.add(
            token
          )
      );
  }

  return tokens(
    query
  )
    .filter(
      (token) =>
        !remove.has(
          token
        )
    )
    .join(
      ' '
    );
}

function matchQuality(
  query,
  fields = []
) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return 0;
  }

  const queryTokens = tokens(normalizedQuery);
  let score = 0;

  fields
    .filter(Boolean)
    .forEach((field) => {
      const normalizedField = normalizeText(field);

      if (!normalizedField) return;

      if (normalizedField === normalizedQuery) {
        score = Math.max(score, 100);
      } else if (normalizedField.startsWith(normalizedQuery)) {
        score = Math.max(score, 80);
      } else if (normalizedField.includes(normalizedQuery)) {
        score = Math.max(score, 65);
      }

      const fieldTokens = new Set(
        tokens(normalizedField)
      );

      const overlap = queryTokens.filter(
        (token) => fieldTokens.has(token)
      ).length;

      if (queryTokens.length) {
        score = Math.max(
          score,
          Math.round(
            (overlap / queryTokens.length) * 55
          )
        );
      }
    });

  return score;
}

function rankResult(
  result,
  query,
  intent = {}
) {
  let score = matchQuality(
    query,
    [
      result.title,
      result.subject,
      result.subjectCode,
      result.shortCode,
      result.primaryTopic,
      ...(result.topics || []),
    ]
  );

  if (
    intent.subjectCode &&
    String(result.subjectCode || '').toUpperCase() ===
      intent.subjectCode
  ) {
    score += 35;
  }

  if (
    intent.year &&
    Number(result.year) === intent.year
  ) {
    score += 12;
  }

  if (
    intent.examType &&
    result.examType === intent.examType
  ) {
    score += 12;
  }

  if (
    intent.branch &&
    (
      result.branch === intent.branch ||
      (result.branches || []).includes(intent.branch)
    )
  ) {
    score += 8;
  }

  if (
    intent.semester &&
    (
      Number(result.semester) === intent.semester ||
      (result.semesters || [])
        .map(Number)
        .includes(intent.semester)
    )
  ) {
    score += 8;
  }

  if (result.type === 'subject') {
    score += 10;
  }

  const engagement =
    Number(result.views || 0) +
    Number(result.downloads || 0) * 2;

  score += Math.min(
    10,
    Math.log10(engagement + 1) * 3
  );

  return Math.round(score * 10) / 10;
}

function sortSearchResults(
  results = [],
  query,
  intent
) {
  return results
    .map((result, index) => ({
      ...result,
      relevanceScore: rankResult(
        result,
        query,
        intent
      ),
      _stableIndex: index,
    }))
    .sort(
      (a, b) =>
        b.relevanceScore - a.relevanceScore ||
        a._stableIndex - b._stableIndex
    )
    .map(({ _stableIndex, ...result }) => result);
}

module.exports = {
  catalogSubjectMatch,
  detectBranch,
  detectExamType,
  detectSemester,
  detectYear,
  escapeRegex,
  matchQuality,
  normalizeText,
  parseSearchIntent,
  residualSearchText,
  rankResult,
  sortSearchResults,
  tokens,
};
