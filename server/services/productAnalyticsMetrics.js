const DISCOVERY_ROUTES =
  new Set([
    'archive',
    'search',
    'trending',
    'branches',
    'contributors',
    'missing_papers',
  ]);

const STUDY_ROUTES =
  new Set([
    'paper',
    'questions',
    'question_detail',
    'subject',
    'survival',
    'exam_mode',
    'pyq_intelligence',
    'important_topics',
    'revision',
    'war_room',
    'ask',
    'mocks',
    'mock_evaluation',
  ]);

function bucketSearchResults(
  count
) {
  const numeric =
    Math.max(
      0,
      Number(count) ||
      0
    );

  if (
    numeric ===
    0
  ) {
    return '0';
  }

  if (
    numeric <=
    5
  ) {
    return '1-5';
  }

  if (
    numeric <=
    20
  ) {
    return '6-20';
  }

  return '21+';
}

function startDayKey(
  period,
  now = new Date()
) {
  const days =
    period ===
    '7d'
      ? 7
      : 30;

  const date =
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      )
    );

  date.setUTCDate(
    date.getUTCDate() -
      (days - 1)
  );

  return date
    .toISOString()
    .slice(
      0,
      10
    );
}

function dateRangeKeys(
  period,
  now = new Date()
) {
  const days =
    period ===
    '7d'
      ? 7
      : 30;

  const result =
    [];

  const end =
    new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      )
    );

  for (
    let offset =
      days - 1;
    offset >=
    0;
    offset -= 1
  ) {
    const date =
      new Date(
        end.getTime() -
        offset *
          86400000
      );

    result.push(
      date
        .toISOString()
        .slice(
          0,
          10
        )
    );
  }

  return result;
}

function buildDailySeries(
  events = [],
  period = '30d',
  now = new Date()
) {
  const keys =
    dateRangeKeys(
      period,
      now
    );

  const map =
    new Map(
      keys.map(
        (dayKey) => [
          dayKey,
          {
            dayKey,
            pageViews:
              0,
            searches:
              0,
            sessions:
              new Set(),
          },
        ]
      )
    );

  events.forEach(
    (event) => {
      const row =
        map.get(
          event.dayKey
        );

      if (!row) {
        return;
      }

      row.sessions.add(
        String(
          event.sessionId ||
          ''
        )
      );

      if (
        event.eventName ===
        'page_view'
      ) {
        row.pageViews +=
          1;
      }

      if (
        event.eventName ===
        'search'
      ) {
        row.searches +=
          1;
      }
    }
  );

  return keys.map(
    (dayKey) => {
      const row =
        map.get(
          dayKey
        );

      return {
        dayKey,
        pageViews:
          row.pageViews,
        searches:
          row.searches,
        sessions:
          [
            ...row.sessions,
          ].filter(Boolean)
            .length,
      };
    }
  );
}

function buildRouteUsage(
  events = []
) {
  const map =
    new Map();

  events
    .filter(
      (event) =>
        event.eventName ===
        'page_view'
    )
    .forEach(
      (event) => {
        const key =
          String(
            event.routeKey ||
            'other'
          );

        const current =
          map.get(
            key
          ) || {
            routeKey:
              key,
            views:
              0,
            sessions:
              new Set(),
          };

        current.views +=
          1;

        if (
          event.sessionId
        ) {
          current.sessions.add(
            String(
              event.sessionId
            )
          );
        }

        map.set(
          key,
          current
        );
      }
    );

  return [
    ...map.values(),
  ]
    .map(
      (row) => ({
        routeKey:
          row.routeKey,
        views:
          row.views,
        sessions:
          row.sessions
            .size,
      })
    )
    .sort(
      (a, b) =>
        b.views -
          a.views ||
        b.sessions -
          a.sessions ||
        a.routeKey.localeCompare(
          b.routeKey
        )
    );
}

function buildSearchSummary(
  events = []
) {
  const searches =
    events.filter(
      (event) =>
        event.eventName ===
        'search'
    );

  const buckets = {
    '0': 0,
    '1-5': 0,
    '6-20': 0,
    '21+': 0,
  };

  searches.forEach(
    (event) => {
      if (
        Object.prototype.hasOwnProperty.call(
          buckets,
          event.resultBucket
        )
      ) {
        buckets[
          event.resultBucket
        ] += 1;
      }
    }
  );

  const zeroResults =
    buckets[
      '0'
    ];

  const total =
    searches.length;

  return {
    total,
    zeroResults,
    successRate:
      total
        ? Math.round(
            (
              (
                total -
                zeroResults
              ) /
              total
            ) *
              1000
          ) /
          10
        : 0,
    buckets,
  };
}

function buildSessionJourney(
  events = []
) {
  const sessions =
    new Map();

  events.forEach(
    (event) => {
      const id =
        String(
          event.sessionId ||
          ''
        );

      if (!id) {
        return;
      }

      if (
        !sessions.has(
          id
        )
      ) {
        sessions.set(
          id,
          new Set()
        );
      }

      if (
        event.eventName ===
        'page_view'
      ) {
        sessions.get(
          id
        ).add(
          event.routeKey
        );
      }
    }
  );

  let discovery =
    0;

  let study =
    0;

  let contributionIntent =
    0;

  sessions.forEach(
    (routes) => {
      if (
        [
          ...routes,
        ].some(
          (route) =>
            DISCOVERY_ROUTES.has(
              route
            )
        )
      ) {
        discovery +=
          1;
      }

      if (
        [
          ...routes,
        ].some(
          (route) =>
            STUDY_ROUTES.has(
              route
            )
        )
      ) {
        study +=
          1;
      }

      if (
        routes.has(
          'contribute'
        )
      ) {
        contributionIntent +=
          1;
      }
    }
  );

  return {
    trackedSessions:
      sessions.size,
    discoverySessions:
      discovery,
    studySessions:
      study,
    contributionIntentSessions:
      contributionIntent,
  };
}

function summarizeProductEvents(
  events = [],
  period = '30d',
  now = new Date()
) {
  const sessionIds =
    new Set(
      events
        .map(
          (event) =>
            String(
              event.sessionId ||
              ''
            )
        )
        .filter(Boolean)
    );

  const pageViews =
    events.filter(
      (event) =>
        event.eventName ===
        'page_view'
    ).length;

  return {
    activeSessions:
      sessionIds.size,
    pageViews,
    searches:
      events.filter(
        (event) =>
          event.eventName ===
          'search'
      ).length,
    daily:
      buildDailySeries(
        events,
        period,
        now
      ),
    routes:
      buildRouteUsage(
        events
      ),
    search:
      buildSearchSummary(
        events
      ),
    journey:
      buildSessionJourney(
        events
      ),
  };
}

module.exports = {
  DISCOVERY_ROUTES,
  STUDY_ROUTES,
  bucketSearchResults,
  buildDailySeries,
  buildRouteUsage,
  buildSearchSummary,
  buildSessionJourney,
  dateRangeKeys,
  startDayKey,
  summarizeProductEvents,
};
