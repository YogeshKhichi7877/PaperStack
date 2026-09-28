const test = require('node:test');
const assert = require('node:assert/strict');

const {
  contributionEvent,
  publicNotification,
  requestEvent,
  solutionEvent,
  sourceKey,
} = require('./notificationEvents');

test('source keys are deterministic and user-scoped', () => {
  assert.equal(
    sourceKey('u1', 'contribution', 'c1', 'approved'),
    'u1:contribution:c1:approved'
  );
});

test('approved contribution becomes a success notification', () => {
  const event = contributionEvent(
    'u1',
    {
      _id: 'c1',
      status: 'approved',
      subject: 'Computer Graphics',
      subjectCode: 'CS502',
      year: 2026,
      examType: 'Mid-Sem',
    }
  );

  assert.equal(event.severity, 'success');
  assert.match(event.title, /approved/i);
  assert.match(event.actionUrl, /CS502/);
});

test('correction notification carries admin note', () => {
  const event = contributionEvent(
    'u1',
    {
      _id: 'c1',
      status: 'needs_correction',
      subject: 'Data Science',
      adminNote: 'Correct the year.',
    }
  );

  assert.match(event.message, /Correct the year/i);
  assert.equal(event.severity, 'warning');
});

test('fulfilled request creates an archive notification', () => {
  const event = requestEvent(
    'u1',
    {
      _id: 'r1',
      status: 'fulfilled',
      subject: 'Cloud Computing',
      subjectCode: 'CS504',
      year: 2025,
      examType: 'End-Sem',
    }
  );

  assert.match(event.title, /available/i);
  assert.match(event.actionUrl, /CS504/);
});

test('approved student solution links back to the question', () => {
  const event = solutionEvent(
    'u1',
    {
      _id: 's1',
      questionId: 'q1',
      status: 'approved',
    }
  );

  assert.equal(event.actionUrl, '/questions/q1');
  assert.equal(event.severity, 'success');
});

test('pending records do not generate notifications', () => {
  assert.equal(
    contributionEvent(
      'u1',
      {
        _id: 'c1',
        status: 'pending',
      }
    ),
    null
  );

  assert.equal(
    solutionEvent(
      'u1',
      {
        _id: 's1',
        status: 'pending',
      }
    ),
    null
  );
});

test('public notification hides internal source key', () => {
  const item = publicNotification({
    _id: 'n1',
    sourceKey: 'secret',
    sourceType: 'system',
    sourceState: 'new',
    title: 'Hello',
    message: 'World',
    severity: 'info',
    readAt: null,
  });

  assert.equal(item._id, 'n1');
  assert.equal(item.isRead, false);

  assert.ok(
    !Object.prototype.hasOwnProperty.call(
      item,
      'sourceKey'
    )
  );
});
