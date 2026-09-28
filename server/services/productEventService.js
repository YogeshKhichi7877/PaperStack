const ProductEvent =
  require('../models/ProductEvent');

const {
  bucketSearchResults,
} = require('./productAnalyticsMetrics');

const VALID_EVENT_NAMES =
  new Set([
    'page_view',
    'search',
  ]);

function utcDayKey() {
  return new Date()
    .toISOString()
    .slice(
      0,
      10
    );
}

function cleanRouteKey(
  value
) {
  const routeKey =
    String(
      value ||
      ''
    )
      .trim()
      .toLowerCase()
      .replace(
        /[^a-z0-9_-]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      )
      .slice(
        0,
        60
      );

  return (
    routeKey ||
    'other'
  );
}

function cleanSessionId(
  value
) {
  const sessionId =
    String(
      value ||
      ''
    ).trim();

  if (
    !/^[A-Za-z0-9_-]{8,80}$/.test(
      sessionId
    )
  ) {
    const error =
      new Error(
        'Invalid analytics session id'
      );

    error.statusCode =
      400;

    throw error;
  }

  return sessionId;
}

function cleanSmallText(
  value,
  max = 40
) {
  return String(
    value ||
    ''
  )
    .replace(
      /[^a-zA-Z0-9 _&.-]+/g,
      ''
    )
    .trim()
    .slice(
      0,
      max
    );
}

function eventPayload(
  body = {}
) {
  const eventName =
    String(
      body.eventName ||
      ''
    )
      .trim()
      .toLowerCase();

  if (
    !VALID_EVENT_NAMES.has(
      eventName
    )
  ) {
    const error =
      new Error(
        'Unsupported analytics event'
      );

    error.statusCode =
      400;

    throw error;
  }

  const resultCount =
    Number(
      body.resultCount
    );

  const semester =
    Number(
      body.semester
    );

  const expiresAt =
    new Date();

  expiresAt.setUTCDate(
    expiresAt.getUTCDate() +
      180
  );

  return {
    eventName,
    sessionId:
      cleanSessionId(
        body.sessionId
      ),
    routeKey:
      cleanRouteKey(
        body.routeKey
      ),
    dayKey:
      utcDayKey(),
    type:
      cleanSmallText(
        body.type,
        40
      ),
    branch:
      cleanSmallText(
        body.branch,
        20
      ).toUpperCase(),
    semester:
      Number.isInteger(
        semester
      ) &&
      semester >=
        1 &&
      semester <=
        8
        ? semester
        : null,
    examType:
      cleanSmallText(
        body.examType,
        30
      ),
    resultBucket:
      eventName ===
        'search'
        ? bucketSearchResults(
            Number.isFinite(
              resultCount
            )
              ? resultCount
              : 0
          )
        : '',
    expiresAt,
  };
}

async function recordProductEvent(
  body = {}
) {
  const payload =
    eventPayload(
      body
    );

  const event =
    await ProductEvent.create(
      payload
    );

  return {
    _id:
      event._id,
    eventName:
      event.eventName,
    dayKey:
      event.dayKey,
  };
}

module.exports = {
  cleanRouteKey,
  cleanSessionId,
  eventPayload,
  recordProductEvent,
  utcDayKey,
};
