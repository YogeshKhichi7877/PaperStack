const SUBJECT_ALIAS_GROUPS = [
  {
    subject: 'Data Structure and Algorithms',
    codes: ['DSA'],
    aliases: [
      'Data Structure and Algorithm',
      'Data Structure and Algorithms',
      'Data Structures',
      'Data Structure & Algorithms',
      'Data Structures and Algorithms'
    ]
  },
  {
    subject: 'Discrete Mathematics',
    codes: ['DM'],
    aliases: ['Discrete Mathematics', 'Discrete Maths']
  },
  {
    subject: 'Electronic Circuit Analysis',
    codes: ['ECA'],
    aliases: ['Electronic Circuit Analysis', 'Engineering Circuit Analysis']
  },
  {
    subject: 'Fundamentals of Computers & Programming',
    codes: ['FCP'],
    aliases: [
      'Fundamentals of Computers & Programming',
      'Fundamentals of Computers and Programming',
      'Fundamentals of Computer Programming',
      'Fundamentals of Computers Programming'
    ]
  },
  {
    subject: 'Analog & Digital Communication',
    codes: ['ADC'],
    aliases: [
      'Analog & Digital Communication',
      'Analog and Digital Communication',
      'Analogue and Digital Communication'
    ]
  },
  {
    subject: 'Digital Design',
    codes: ['DD'],
    aliases: ['Digital Design']
  },
  {
    subject: 'Engineering Physics',
    codes: ['EP'],
    aliases: ['Engineering Physics']
  },
  {
    subject: 'Indian Constitution',
    codes: ['IC'],
    aliases: ['Indian Constitution']
  },
  {
    subject: 'Engineering Mathematics',
    codes: ['EM'],
    aliases: ['Engineering Mathematics', 'Engineering Maths']
  },
  {
    subject: 'Design Analysis & Algorithm',
    codes: ['DAA'],
    aliases: [
      'Design Analysis & Algorithm',
      'Design and Analysis of Algorithms',
      'Design Analysis and Algorithm'
    ]
  },
  {
    subject: 'Database Management System',
    codes: ['DBMS'],
    aliases: ['Database Management System', 'Database Management Systems']
  },
  {
    subject: 'Operating System',
    codes: ['OS'],
    aliases: ['Operating System', 'Operating Systems']
  },
  {
    subject: 'Computer Networks',
    codes: ['CN'],
    aliases: ['Computer Networks', 'Computer Network']
  },
  {
    subject: 'Software Engineering',
    codes: ['SE'],
    aliases: ['Software Engineering']
  },
  {
    subject: 'System Software',
    codes: ['SS'],
    aliases: ['System Software']
  }
];

export function normalizeSearchText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function aliasesForQuery(query) {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [];

  return SUBJECT_ALIAS_GROUPS.flatMap((group) => {
    const candidates = [
      group.subject,
      ...(group.codes || []),
      ...(group.aliases || [])
    ];

    const normalizedCandidates = candidates.map(normalizeSearchText);
    const matches = normalizedCandidates.some((candidate) => {
      return candidate === normalizedQuery ||
        candidate.includes(normalizedQuery) ||
        normalizedQuery.includes(candidate);
    });

    return matches ? normalizedCandidates : [];
  });
}

function aliasesForPaper(paper) {
  const paperValues = [
    paper?.subject,
    paper?.normalizedSubject,
    paper?.subjectCode,
    paper?.shortCode
  ].map(normalizeSearchText).filter(Boolean);

  return SUBJECT_ALIAS_GROUPS.flatMap((group) => {
    const candidates = [
      group.subject,
      ...(group.codes || []),
      ...(group.aliases || [])
    ];
    const normalizedCandidates = candidates.map(normalizeSearchText);

    const matches = paperValues.some((value) =>
      normalizedCandidates.some((candidate) => (
        candidate === value ||
        candidate.includes(value) ||
        value.includes(candidate)
      ))
    );

    return matches ? normalizedCandidates : [];
  });
}

export function paperMatchesSmartSearch(paper, rawQuery) {
  const normalizedQuery = normalizeSearchText(rawQuery);
  if (!normalizedQuery) return true;

  const searchText = [
    paper?.title,
    paper?.subject,
    paper?.normalizedSubject,
    paper?.subjectCode,
    paper?.shortCode,
    paper?.branch,
    paper?.semester ? `sem ${paper.semester}` : '',
    paper?.semester ? `semester ${paper.semester}` : '',
    paper?.year,
    paper?.examType,
    paper?.contributedByName,
    ...aliasesForPaper(paper)
  ]
    .map(normalizeSearchText)
    .filter(Boolean)
    .join(' ');

  if (searchText.includes(normalizedQuery)) return true;

  return aliasesForQuery(normalizedQuery).some((alias) => searchText.includes(alias));
}

export const SMART_SEARCH_HINT = 'Try: DSA, DM, ECA, FCP...';
