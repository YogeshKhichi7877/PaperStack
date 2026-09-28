const test =
  require('node:test');

const assert =
  require('node:assert/strict');

const {
  bucketSearchResults,
  buildRouteUsage,
  buildSearchSummary,
  buildSessionJourney,
  dateRangeKeys,
  summarizeProductEvents,
} = require('./productAnalyticsMetrics');

test(
  'search result buckets are stable',
  () => {
    assert.equal(
      bucketSearchResults(0),
      '0'
    );

    assert.equal(
      bucketSearchResults(3),
      '1-5'
    );

    assert.equal(
      bucketSearchResults(12),
      '6-20'
    );

    assert.equal(
      bucketSearchResults(30),
      '21+'
    );
  }
);

test(
  'date range returns requested number of days',
  () => {
    assert.equal(
      dateRangeKeys(
        '7d',
        new Date(
          '2026-09-26T10:00:00Z'
        )
      ).length,
      7
    );

    assert.equal(
      dateRangeKeys(
        '30d',
        new Date(
          '2026-09-26T10:00:00Z'
        )
      ).length,
      30
    );
  }
);

test(
  'route usage counts views and unique sessions',
  () => {
    const result =
      buildRouteUsage([
        {
          eventName:
            'page_view',
          routeKey:
            'search',
          sessionId:
            'a',
        },
        {
          eventName:
            'page_view',
          routeKey:
            'search',
          sessionId:
            'a',
        },
        {
          eventName:
            'page_view',
          routeKey:
            'search',
          sessionId:
            'b',
        },
      ]);

    assert.equal(
      result[0].views,
      3
    );

    assert.equal(
      result[0].sessions,
      2
    );
  }
);

test(
  'search success rate excludes zero result searches',
  () => {
    const result =
      buildSearchSummary([
        {
          eventName:
            'search',
          resultBucket:
            '0',
        },
        {
          eventName:
            'search',
          resultBucket:
            '1-5',
        },
        {
          eventName:
            'search',
          resultBucket:
            '21+',
        },
      ]);

    assert.equal(
      result.total,
      3
    );

    assert.equal(
      result.zeroResults,
      1
    );

    assert.equal(
      result.successRate,
      66.7
    );
  }
);

test(
  'session journey uses route categories without identifying users',
  () => {
    const result =
      buildSessionJourney([
        {
          eventName:
            'page_view',
          routeKey:
            'search',
          sessionId:
            'a',
        },
        {
          eventName:
            'page_view',
          routeKey:
            'subject',
          sessionId:
            'a',
        },
        {
          eventName:
            'page_view',
          routeKey:
            'contribute',
          sessionId:
            'b',
        },
      ]);

    assert.equal(
      result.trackedSessions,
      2
    );

    assert.equal(
      result.discoverySessions,
      1
    );

    assert.equal(
      result.studySessions,
      1
    );

    assert.equal(
      result.contributionIntentSessions,
      1
    );
  }
);

test(
  'summary counts anonymous sessions and event classes',
  () => {
    const result =
      summarizeProductEvents(
        [
          {
            eventName:
              'page_view',
            routeKey:
              'archive',
            sessionId:
              'a',
            dayKey:
              '2026-09-26',
          },
          {
            eventName:
              'search',
            routeKey:
              'search',
            sessionId:
              'a',
            dayKey:
              '2026-09-26',
            resultBucket:
              '1-5',
          },
          {
            eventName:
              'page_view',
            routeKey:
              'questions',
            sessionId:
              'b',
            dayKey:
              '2026-09-26',
          },
        ],
        '7d',
        new Date(
          '2026-09-26T12:00:00Z'
        )
      );

    assert.equal(
      result.activeSessions,
      2
    );

    assert.equal(
      result.pageViews,
      2
    );

    assert.equal(
      result.searches,
      1
    );
  }
);
