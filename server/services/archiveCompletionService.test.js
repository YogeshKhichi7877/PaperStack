const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildArchiveCompletion,
  normalizeExamType,
  percentage,
} = require('./archiveCompletionService');

const catalog = [
  {
    branch: 'CSE',
    semester: 5,
    subjects: [
      {
        code: 'CS502',
        shortCode: 'CG',
        name: 'Computer Graphics',
        aliases: ['Computer Graphics', 'CG'],
      },
    ],
  },
];

test('normalizes common exam labels', () => {
  assert.equal(normalizeExamType('Mid Semester'), 'Mid-Sem');
  assert.equal(normalizeExamType('END-SEM'), 'End-Sem');
});

test('percentage is deterministic and handles empty expected count', () => {
  assert.equal(percentage(1, 4), 25);
  assert.equal(percentage(0, 0), 0);
});

test('completion is based on expected archive slots, not raw paper count', () => {
  const result = buildArchiveCompletion({
    subjectCatalog: catalog,
    expectedYears: [2026, 2025],
    expectedExamTypes: ['Mid-Sem', 'End-Sem'],
    papers: [
      { subject: 'Computer Graphics (CG)', branch: 'CSE', semester: 5, year: 2026, examType: 'Mid-Sem' },
      { subject: 'CG', branch: 'CSE', semester: 5, year: 2026, examType: 'Mid-Sem' },
    ],
  });

  assert.equal(result.summary.expectedSlots, 4);
  assert.equal(result.summary.availableSlots, 1);
  assert.equal(result.summary.missingSlots, 3);
  assert.equal(result.summary.completionPct, 25);
});

test('CSE & ECE common papers satisfy the expected slot for both branches', () => {
  const dualCatalog = [
    ...catalog,
    {
      branch: 'ECE',
      semester: 5,
      subjects: [
        {
          code: 'CS502',
          shortCode: 'CG',
          name: 'Computer Graphics',
          aliases: ['Computer Graphics', 'CG'],
        },
      ],
    },
  ];

  const result = buildArchiveCompletion({
    subjectCatalog: dualCatalog,
    expectedYears: [2026],
    expectedExamTypes: ['Mid-Sem'],
    papers: [
      { subjectCode: 'CS502', subject: 'Computer Graphics', branch: 'CSE & ECE', semester: 5, year: 2026, examType: 'Mid-Sem' },
    ],
  });

  assert.equal(result.summary.expectedSlots, 2);
  assert.equal(result.summary.availableSlots, 2);
  assert.equal(result.summary.completionPct, 100);
});

test('missing slots contain a direct contribution URL', () => {
  const result = buildArchiveCompletion({
    subjectCatalog: catalog,
    expectedYears: [2026],
    expectedExamTypes: ['End-Sem'],
    papers: [],
  });

  assert.equal(result.missingSlots.length, 1);
  assert.match(result.missingSlots[0].contributionUrl, /^\/contribute\?/);
  assert.equal(result.subjects[0].missing, 1);
});
