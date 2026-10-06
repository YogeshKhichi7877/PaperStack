const Paper = require('../models/Paper');
const Resource = require('../models/Resource');
const Question = require('../models/Question');
const { branchQueryValues } = require('../utils/branches');

const {
  FLAT_SUBJECT_CATALOG,
} = require('./subjectService');

const {
  escapeRegex,
  normalizeText,
  parseSearchIntent,
  residualSearchText,
  sortSearchResults,
} = require('./searchV2Ranking');
const { expandAliases } = require('./searchNormalizationService');
const { resourceQuality } = require('./resourceQualityService');

const VALID_TYPES = [
  'all',
  'paper',
  'resource',
  'question',
  'subject',
];

function safeLimit(value) {
  const numeric = Number(value);

  return Math.max(
    5,
    Math.min(
      50,
      Number.isFinite(numeric)
        ? Math.round(numeric)
        : 24
    )
  );
}

function branchPaperFilter(branch) {
  if (!branch) return null;

  return {
    $in: branchQueryValues(branch),
  };
}

function textRegex(query, catalog = FLAT_SUBJECT_CATALOG) {
  const cleaned = String(query || '')
    .trim()
    .slice(0, 120);

  if (!cleaned) {
    return null;
  }

  const normalized = normalizeText(cleaned);

  const terms = [
    ...new Set(
      expandAliases(normalized, catalog)
        .flatMap((value) => value.split(' '))
        .filter(Boolean)
        .filter((token) => token.length >= 2)
        .slice(0, 8)
    ),
  ];

  if (!terms.length) {
    return new RegExp(
      escapeRegex(cleaned),
      'i'
    );
  }

  return new RegExp(
    terms
      .map(escapeRegex)
      .join('|'),
    'i'
  );
}

function publicPaper(item) {
  return {
    type: 'paper',
    _id: String(item._id),
    title:
      item.title ||
      item.subject ||
      'Question Paper',
    subject: item.subject || '',
    subjectCode: item.subjectCode || '',
    branch: item.branch || '',
    semester: item.semester ?? null,
    year: item.year ?? null,
    examType: item.examType || '',
    views: Number(item.views || 0),
    downloads: Number(item.downloads || 0),
    topics: item.topics || [],
    hasSolution: Boolean(item.solutionPath),
    actionUrl: `/paper/${encodeURIComponent(String(item._id))}`,
    fileUrl: item.filePath || '',
  };
}

function publicResource(item) {
  return {
    type: 'resource',
    _id: String(item._id),
    title:
      item.title ||
      item.subjectName ||
      'Resource',
    subject: item.subjectName || '',
    subjectCode: item.subjectCode || '',
    shortCode: item.subjectShortCode || '',
    branches: item.branches || [],
    semesters: item.semesters || [],
    year: item.year ?? null,
    examType: item.examType || '',
    kind: item.kind || '',
    views: Number(item.views || 0),
    downloads: Number(item.downloads || 0),
    topics: item.topics || [],
    actionUrl: item.subjectKey
      ? `/subject/${encodeURIComponent(item.subjectKey)}`
      : '',
    fileUrl: item.fileUrl || '',
    ...resourceQuality(item),
  };
}

function publicQuestion(item) {
  return {
    type: 'question',
    _id: String(item._id),
    title: item.questionLabel
      ? `${item.questionLabel} · ${String(item.questionText || '').slice(0, 120)}`
      : String(item.questionText || '').slice(0, 140),
    questionText: item.questionText || '',
    subject: item.subject || '',
    subjectCode: item.subjectCode || '',
    branch: item.branch || '',
    semester: item.semester ?? null,
    year: item.year ?? null,
    examType: item.examType || '',
    marks: item.marks ?? null,
    primaryTopic: item.primaryTopic || '',
    topics: item.topics || [],
    actionUrl: `/questions/${encodeURIComponent(String(item._id))}`,
  };
}

function publicSubject(item) {
  return {
    type: 'subject',
    _id: item.key,
    title: item.name,
    subject: item.name,
    subjectCode: item.code || '',
    shortCode: item.shortCode || '',
    branches: item.branches || [],
    semesters: item.semesters || [],
    aliases: item.aliases || [],
    actionUrl: `/subject/${encodeURIComponent(item.key)}`,
  };
}

function subjectResults(
  query,
  intent,
  {
    branch,
    semester,
  } = {}
) {
  const normalized = normalizeText(query);

  return FLAT_SUBJECT_CATALOG
    .filter((item) => {
      if (
        branch &&
        !(item.branches || []).includes(branch)
      ) {
        return false;
      }

      if (
        semester &&
        !(item.semesters || [])
          .map(Number)
          .includes(Number(semester))
      ) {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const haystack = normalizeText(
        [
          item.code,
          item.shortCode,
          item.name,
          ...(item.aliases || []),
        ].join(' ')
      );

      return (
        haystack.includes(normalized) ||
        normalized.includes(
          normalizeText(item.name)
        ) ||
        (
          intent.subjectCode &&
          item.code === intent.subjectCode
        )
      );
    })
    .map(publicSubject);
}

async function searchV2({
  q = '',
  type = 'all',
  branch = '',
  semester = '',
  year = '',
  examType = '',
  kind = '',
  limit = 24,
} = {}) {
  const query = String(q || '')
    .trim()
    .slice(0, 120);

  const safeType = VALID_TYPES.includes(type)
    ? type
    : 'all';

  const parsed = parseSearchIntent(
    query,
    FLAT_SUBJECT_CATALOG
  );

  const effective = {
    branch: String(
      branch ||
      parsed.branch ||
      ''
    )
      .trim()
      .toUpperCase(),
    semester:
      Number(
        semester ||
        parsed.semester
      ) || null,
    year:
      Number(
        year ||
        parsed.year
      ) || null,
    examType: String(
      examType ||
      parsed.examType ||
      ''
    ).trim(),
    subjectCode: parsed.subjectCode || '',
    kind: String(kind || '').trim(),
  };

  const residual =
    residualSearchText(
      query,
      FLAT_SUBJECT_CATALOG
    );

  const searchableText =
    residual ||
    (
      parsed.subjectCode
        ? ''
        : query
    );

  const regex =
    textRegex(
      searchableText,
      FLAT_SUBJECT_CATALOG
    );

  const perType = safeLimit(limit);

  const jobs = [];
  const names = [];

  if (['all', 'paper'].includes(safeType)) {
    const filter = {};

    if (effective.branch) {
      filter.branch = branchPaperFilter(
        effective.branch
      );
    }

    if (effective.semester) {
      filter.semester = effective.semester;
    }

    if (effective.year) {
      filter.year = effective.year;
    }

    if (effective.examType) {
      filter.examType = effective.examType;
    }

    if (effective.subjectCode) {
      filter.subjectCode = effective.subjectCode;
    } else if (regex) {
      filter.$or = [
        { title: regex },
        { subject: regex },
        { subjectCode: regex },
        { normalizedSubject: regex },
        { topics: regex },
      ];
    }

    jobs.push(
      Paper.find({ ...filter, reviewStatus: { $nin: ['processing', 'needs_review', 'failed'] } })
        .sort({
          year: -1,
          downloads: -1,
          views: -1,
        })
        .limit(perType)
        .select(
          'title subject normalizedSubject subjectCode branch semester year examType filePath solutionPath views downloads topics'
        )
        .lean()
    );

    names.push('papers');
  }

  if (['all', 'resource'].includes(safeType)) {
    const filter = {
      status: 'active',
    };

    if (effective.branch) {
      filter.branches = effective.branch;
    }

    if (effective.semester) {
      filter.semesters = effective.semester;
    }

    if (effective.year) {
      filter.year = effective.year;
    }

    if (effective.examType) {
      filter.examType = effective.examType;
    }

    if (effective.subjectCode) {
      filter.subjectCode = effective.subjectCode;
    }

    if (effective.kind) {
      filter.kind = effective.kind;
    }

    if (!effective.subjectCode && regex) {
      filter.$or = [
        { title: regex },
        { subjectName: regex },
        { subjectCode: regex },
        { subjectShortCode: regex },
        { tags: regex },
        { topics: regex },
      ];
    }

    jobs.push(
      Resource.find(filter)
        .sort({
          year: -1,
          downloads: -1,
          views: -1,
        })
        .limit(perType)
        .select(
          'title kind subjectKey subjectCode subjectShortCode subjectName branches semesters examType year fileUrl views downloads topics tags sourceType metadata createdAt updatedAt'
        )
        .lean()
    );

    names.push('resources');
  }

  if (['all', 'question'].includes(safeType)) {
    const filter = {
      needsReview: { $ne: true },
      status: {
        $ne: 'rejected',
      },
    };

    if (effective.branch) {
      filter.branch = effective.branch;
    }

    if (effective.semester) {
      filter.semester = effective.semester;
    }

    if (effective.year) {
      filter.year = effective.year;
    }

    if (effective.examType) {
      filter.examType = effective.examType;
    }

    if (effective.subjectCode) {
      filter.subjectCode = effective.subjectCode;
    } else if (regex) {
      filter.$or = [
        { questionText: regex },
        { primaryTopic: regex },
        { topics: regex },
        { subject: regex },
        { subjectCode: regex },
      ];
    }

    jobs.push(
      Question.find(filter)
        .sort({
          year: -1,
          sequence: 1,
        })
        .limit(perType)
        .select(
          'questionLabel questionText subject subjectCode branch semester year examType marks primaryTopic topics'
        )
        .lean()
    );

    names.push('questions');
  }

  if (['all', 'subject'].includes(safeType)) {
    jobs.push(
      Promise.resolve(
        subjectResults(
          query,
          parsed,
          {
            branch: effective.branch,
            semester: effective.semester,
          }
        ).slice(0, perType)
      )
    );

    names.push('subjects');
  }

  const values = await Promise.all(jobs);

  const grouped = {
    papers: [],
    resources: [],
    questions: [],
    subjects: [],
  };

  values.forEach((value, index) => {
    const name = names[index];

    if (name === 'papers') {
      grouped.papers = value.map(publicPaper);
    } else if (name === 'resources') {
      grouped.resources = value.map(publicResource);
    } else if (name === 'questions') {
      grouped.questions = value.map(publicQuestion);
    } else if (name === 'subjects') {
      grouped.subjects = value;
    }
  });

  const all = sortSearchResults(
    [
      ...grouped.subjects,
      ...grouped.papers,
      ...grouped.resources,
      ...grouped.questions,
    ],
    query,
    {
      ...parsed,
      ...effective,
    }
  ).slice(0, perType);

  const counts = Object.fromEntries(
    Object.entries(grouped).map(
      ([key, value]) => [
        key,
        value.length,
      ]
    )
  );

  return {
    query,
    type: safeType,
    inferred: parsed,
    residualQuery:
      residual,
    filters: effective,
    counts: {
      ...counts,
      returned: all.length,
    },
    results: all,
    grouped,
    methodology: {
      search:
        'Search 2.0 uses local PaperStack metadata and extracted question text. It does not require an AI API.',
      inference:
        'Branch, semester, exam type, year, and known subject codes/names can be inferred from the search query and overridden by explicit filters.',
    },
  };
}

module.exports = {
  VALID_TYPES,
  branchPaperFilter,
  publicPaper,
  publicQuestion,
  publicResource,
  publicSubject,
  safeLimit,
  searchV2,
  subjectResults,
  textRegex,
};
