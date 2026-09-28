const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildVerificationSummary,
  normalizeVerificationInput,
  sanitizeIssueTypes,
} = require('./verificationService');

test('empty verification set is unverified', () => {
  const summary = buildVerificationSummary([]);
  assert.equal(summary.status, 'unverified');
  assert.equal(summary.totalResponses, 0);
});

test('one clean response enters collecting state', () => {
  const summary = buildVerificationSummary([
    { metadataCorrect: true, pdfReadable: true, issueTypes: [] },
  ]);

  assert.equal(summary.status, 'collecting');
  assert.equal(summary.cleanPercentage, 100);
});

test('three clean confirmations produce community verified status', () => {
  const summary = buildVerificationSummary([
    { metadataCorrect: true, pdfReadable: true, issueTypes: [] },
    { metadataCorrect: true, pdfReadable: true, issueTypes: [] },
    { metadataCorrect: true, pdfReadable: true, issueTypes: [] },
  ]);

  assert.equal(summary.status, 'verified');
  assert.equal(summary.metadataCorrectPercentage, 100);
  assert.equal(summary.pdfReadablePercentage, 100);
});

test('repeated issue reports move paper into needs-review state', () => {
  const summary = buildVerificationSummary([
    { metadataCorrect: false, pdfReadable: true, issueTypes: ['wrong_year'] },
    { metadataCorrect: false, pdfReadable: true, issueTypes: ['wrong_year'] },
    { metadataCorrect: true, pdfReadable: true, issueTypes: [] },
  ]);

  assert.equal(summary.status, 'needs-review');
  assert.equal(summary.issueCount, 2);
  assert.equal(summary.issueBreakdown[0].type, 'wrong_year');
});

test('invalid issue types are removed', () => {
  assert.deepEqual(
    sanitizeIssueTypes(['wrong_subject', 'invalid', 'wrong_subject']),
    ['wrong_subject']
  );
});

test('verification input rejects an empty submission', () => {
  assert.throws(
    () => normalizeVerificationInput({}),
    /Choose at least one verification option/
  );
});

test('verification input preserves valid issue flags and note', () => {
  const result = normalizeVerificationInput({
    metadataCorrect: false,
    pdfReadable: true,
    issueTypes: ['wrong_subject', 'duplicate'],
    note: 'Subject appears incorrect',
  });

  assert.equal(result.metadataCorrect, false);
  assert.equal(result.pdfReadable, true);
  assert.deepEqual(result.issueTypes, ['wrong_subject', 'duplicate']);
});
