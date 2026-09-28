const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const {
  ageHours,
  decorateModerationItem,
  moderationStats,
  priorityLabel,
  priorityScore,
  sortModerationItems,
} = require('./adminModerationMetrics');

const NOW =
  new Date(
    '2026-09-26T00:00:00Z'
  );

test(
  'age is calculated in whole hours',
  () => {
    assert.equal(
      ageHours(
        '2026-09-25T12:00:00Z',
        NOW
      ),
      12
    );
  }
);

test(
  'open PDF report receives stronger priority',
  () => {
    const score =
      priorityScore(
        'report',
        {
          status:
            'open',
          reason:
            'PDF not opening',
          createdAt:
            '2026-09-20T00:00:00Z',
        },
        NOW
      );

    assert.ok(
      score >= 80
    );
  }
);

test(
  'popular missing-paper request gains priority',
  () => {
    const low =
      priorityScore(
        'request',
        {
          requestCount:
            1,
          createdAt:
            NOW,
        },
        NOW
      );

    const high =
      priorityScore(
        'request',
        {
          requestCount:
            15,
          createdAt:
            NOW,
        },
        NOW
      );

    assert.ok(
      high >
        low
    );
  }
);

test(
  'needs-correction contribution is lower priority than new pending contribution',
  () => {
    const pending =
      priorityScore(
        'contribution',
        {
          status:
            'pending',
          createdAt:
            NOW,
        },
        NOW
      );

    const correction =
      priorityScore(
        'contribution',
        {
          status:
            'needs_correction',
          createdAt:
            NOW,
        },
        NOW
      );

    assert.ok(
      pending >
        correction
    );
  }
);


test(
  'question review items receive moderation priority',
  () => {
    const score =
      priorityScore(
        'question_review',
        {
          createdAt:
            '2026-09-24T00:00:00Z',
        },
        NOW
      );

    assert.ok(
      score >= 60
    );
  }
);

test(
  'priority labels use stable thresholds',
  () => {
    assert.equal(
      priorityLabel(90),
      'urgent'
    );

    assert.equal(
      priorityLabel(72),
      'high'
    );

    assert.equal(
      priorityLabel(55),
      'normal'
    );

    assert.equal(
      priorityLabel(30),
      'low'
    );
  }
);

test(
  'sorting puts higher priority items first',
  () => {
    const rows =
      sortModerationItems([
        {
          id:
            'a',
          priorityScore:
            50,
          createdAt:
            '2026-09-20',
        },
        {
          id:
            'b',
          priorityScore:
            90,
          createdAt:
            '2026-09-25',
        },
      ]);

    assert.equal(
      rows[0].id,
      'b'
    );
  }
);

test(
  'moderation stats summarize kinds and urgent load',
  () => {
    const items = [
      decorateModerationItem(
        {
          kind:
            'report',
          status:
            'open',
          reason:
            'PDF not opening',
          createdAt:
            '2026-09-01',
        },
        NOW
      ),
      decorateModerationItem(
        {
          kind:
            'solution',
          createdAt:
            NOW,
        },
        NOW
      ),
    ];

    const stats =
      moderationStats(
        items
      );

    assert.equal(
      stats.total,
      2
    );

    assert.equal(
      stats.report,
      1
    );

    assert.equal(
      stats.solution,
      1
    );

    assert.ok(
      stats.urgent >=
        1
    );
  }
);
