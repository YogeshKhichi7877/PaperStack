const test = require('node:test');
const assert = require('node:assert/strict');

const {
  adminSolution,
  canAuthorEdit,
  normalizeModerationInput,
  ownSolution,
  publicSolution,
  sanitizeAnswerText,
  statusCounts,
} = require('./questionSolutionService');

test('solution text is trimmed and normalized', () => {
  const result = sanitizeAnswerText(
    '  Step 1: draw the circle.\r\n\r\nStep 2: update the decision parameter.  '
  );

  assert.match(result, /^Step 1:/);
  assert.ok(!result.includes('\r'));
});

test('too-short solutions are rejected', () => {
  assert.throws(
    () => sanitizeAnswerText('too short'),
    /at least 20 characters/
  );
});

test('approved solutions cannot be edited by the author', () => {
  assert.equal(canAuthorEdit({ status: 'approved' }), false);
  assert.equal(canAuthorEdit({ status: 'pending' }), true);
  assert.equal(canAuthorEdit({ status: 'rejected' }), true);
});

test('moderation only accepts approved or rejected states', () => {
  assert.deepEqual(
    normalizeModerationInput({
      status: 'approved',
      moderationNote: 'Looks correct.',
    }),
    {
      status: 'approved',
      moderationNote: 'Looks correct.',
    }
  );

  assert.throws(
    () => normalizeModerationInput({ status: 'pending' }),
    /approved or rejected/
  );
});

test('public solution does not expose author user id or moderation note', () => {
  const result = publicSolution({
    _id: 's1',
    questionId: 'q1',
    paperId: 'p1',
    authorUserId: 'secret-user',
    authorName: 'Student',
    answerText: 'This is a sufficiently detailed student solution.',
    helpfulCount: 3,
    status: 'approved',
    moderationNote: 'private admin note',
  });

  assert.equal(Object.hasOwn(result, 'authorUserId'), false);
  assert.equal(Object.hasOwn(result, 'moderationNote'), false);
  assert.equal(result.helpfulCount, 3);
});

test('own solution includes moderation state and editability', () => {
  const result = ownSolution({
    _id: 's1',
    questionId: 'q1',
    paperId: 'p1',
    authorName: 'Student',
    answerText: 'This is a sufficiently detailed student solution.',
    status: 'rejected',
    moderationNote: 'Add the missing transformation step.',
  });

  assert.equal(result.canEdit, true);
  assert.equal(
    result.moderationNote,
    'Add the missing transformation step.'
  );
});

test('admin serializer includes question context', () => {
  const result = adminSolution({
    _id: 's1',
    questionId: {
      _id: 'q1',
      questionLabel: 'Q2(b)',
      questionText: 'Explain composite transformation.',
      subject: 'Computer Graphics',
      subjectCode: 'CS502',
      year: 2026,
      examType: 'Mid-Sem',
    },
    paperId: 'p1',
    authorUserId: 'u1',
    authorName: 'Student',
    answerText: 'This is a sufficiently detailed student solution.',
    status: 'pending',
  });

  assert.equal(result.question.subjectCode, 'CS502');
  assert.equal(result.question.questionLabel, 'Q2(b)');
});

test('status counts are deterministic', () => {
  const counts = statusCounts([
    { status: 'pending' },
    { status: 'pending' },
    { status: 'approved' },
    { status: 'rejected' },
  ]);

  assert.deepEqual(counts, {
    total: 4,
    pending: 2,
    approved: 1,
    rejected: 1,
  });
});
