const test = require('node:test');
const assert = require('node:assert/strict');

const {
  catalogSubjectMatch,
  detectBranch,
  detectExamType,
  detectSemester,
  detectYear,
  parseSearchIntent,
  residualSearchText,
  sortSearchResults,
} = require('./searchV2Ranking');

const CATALOG = [
  {
    code: 'CS502',
    shortCode: 'CG',
    name: 'Computer Graphics',
    aliases: ['Graphics'],
  },
  {
    code: 'CS501',
    shortCode: 'DS',
    name: 'Data Science',
    aliases: [],
  },
];

test('parses academic filters from one query', () => {
  const intent = parseSearchIntent(
    'CG CSE sem 5 mid sem 2025',
    CATALOG
  );

  assert.equal(intent.subjectCode, 'CS502');
  assert.equal(intent.branch, 'CSE');
  assert.equal(intent.semester, 5);
  assert.equal(intent.examType, 'Mid-Sem');
  assert.equal(intent.year, 2025);
});

test('subject matcher handles descriptive names', () => {
  const match = catalogSubjectMatch(
    'computer graphics',
    CATALOG
  );

  assert.equal(match.code, 'CS502');
});

test('standalone detectors work', () => {
  assert.equal(detectBranch('ece paper'), 'ECE');
  assert.equal(detectSemester('semester 6'), 6);
  assert.equal(detectYear('paper 2024'), 2024);
  assert.equal(detectExamType('end sem'), 'End-Sem');
});


test('residual search removes parsed metadata but keeps topic words', () => {
  assert.equal(
    residualSearchText(
      'CG CSE sem 5 mid sem 2025 perspective projection',
      CATALOG
    ),
    'perspective projection'
  );
});

test('exact subject result ranks above weak match', () => {
  const results = sortSearchResults(
    [
      {
        type: 'paper',
        title: 'Random paper',
        subject: 'Other',
      },
      {
        type: 'subject',
        title: 'Computer Graphics',
        subject: 'Computer Graphics',
        subjectCode: 'CS502',
      },
    ],
    'Computer Graphics',
    {
      subjectCode: 'CS502',
    }
  );

  assert.equal(results[0].subjectCode, 'CS502');
});
