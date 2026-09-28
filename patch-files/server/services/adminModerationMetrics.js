function dateValue(value) {
  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ageHours(value, now = new Date()) {
  const date = dateValue(value);

  if (!date) {
    return 0;
  }

  return Math.max(
    0,
    Math.floor(
      (new Date(now) - date) /
      (60 * 60 * 1000)
    )
  );
}

function bounded(value, min, max) {
  return Math.max(
    min,
    Math.min(
      max,
      Number(value) || 0
    )
  );
}

function priorityScore(
  kind,
  item = {},
  now = new Date()
) {
  const baseByKind = {
    contribution: 56,
    resource: 54,
    solution: 52,
    report: 64,
    verification: 58,
    question_review: 60,
    request: 42,
  };

  let score =
    baseByKind[kind] ||
    40;

  const hours = ageHours(
    item.createdAt,
    now
  );

  score += bounded(
    Math.floor(hours / 24),
    0,
    20
  );

  if (
    kind === 'contribution'
  ) {
    if (
      item.status ===
      'needs_correction'
    ) {
      score -= 16;
    }

    score += bounded(
      Number(
        item.extractionWarningsCount ||
        0
      ) * 3,
      0,
      12
    );
  }

  if (
    kind === 'solution'
  ) {
    score += bounded(
      Number(
        item.answerLength ||
        0
      ) > 4000
        ? 4
        : 0,
      0,
      4
    );
  }

  if (
    kind === 'report'
  ) {
    if (
      item.status === 'open'
    ) {
      score += 10;
    }

    if (
      /pdf|duplicate/i.test(
        String(
          item.reason ||
          ''
        )
      )
    ) {
      score += 8;
    }
  }

  if (
    kind === 'verification'
  ) {
    score += bounded(
      Number(
        item.issueResponses ||
        0
      ) * 5,
      0,
      20
    );

    if (
      item.pdfUnreadable
    ) {
      score += 10;
    }
  }

  if (
    kind === 'request'
  ) {
    score += bounded(
      Number(
        item.requestCount ||
        0
      ) * 2,
      0,
      24
    );
  }

  return Math.max(
    0,
    Math.round(score)
  );
}

function priorityLabel(score) {
  const numeric =
    Number(score) ||
    0;

  if (
    numeric >= 85
  ) {
    return 'urgent';
  }

  if (
    numeric >= 70
  ) {
    return 'high';
  }

  if (
    numeric >= 50
  ) {
    return 'normal';
  }

  return 'low';
}

function decorateModerationItem(
  item,
  now = new Date()
) {
  const score =
    priorityScore(
      item.kind,
      item,
      now
    );

  return {
    ...item,
    ageHours:
      ageHours(
        item.createdAt,
        now
      ),
    priorityScore:
      score,
    priority:
      priorityLabel(
        score
      ),
  };
}

function sortModerationItems(
  items = []
) {
  return [
    ...items,
  ].sort(
    (a, b) =>
      Number(
        b.priorityScore ||
        0
      ) -
        Number(
          a.priorityScore ||
          0
        ) ||
      new Date(
        a.createdAt ||
        0
      ) -
        new Date(
          b.createdAt ||
          0
        )
  );
}

function moderationStats(
  items = []
) {
  const stats = {
    total: 0,
    urgent: 0,
    high: 0,
    contribution: 0,
    resource: 0,
    solution: 0,
    report: 0,
    verification: 0,
    question_review: 0,
    request: 0,
  };

  items.forEach(
    (item) => {
      stats.total += 1;

      if (
        Object.prototype.hasOwnProperty.call(
          stats,
          item.kind
        )
      ) {
        stats[
          item.kind
        ] += 1;
      }

      if (
        item.priority ===
        'urgent'
      ) {
        stats.urgent += 1;
      }

      if (
        item.priority ===
        'high'
      ) {
        stats.high += 1;
      }
    }
  );

  return stats;
}

module.exports = {
  ageHours,
  decorateModerationItem,
  moderationStats,
  priorityLabel,
  priorityScore,
  sortModerationItems,
};
