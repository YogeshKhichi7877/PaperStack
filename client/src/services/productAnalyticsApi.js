import axios from 'axios';

import {
  API_URL,
} from '../config/appConfig';

import {
  adminHeader,
} from './authHeaders';

const SESSION_KEY =
  'paperstack-product-session-v1';

function randomSessionId() {
  if (
    typeof window !==
      'undefined' &&
    window.crypto?.randomUUID
  ) {
    return window.crypto
      .randomUUID()
      .replace(
        /-/g,
        ''
      );
  }

  return [
    Date.now()
      .toString(36),
    Math.random()
      .toString(36)
      .slice(2),
    Math.random()
      .toString(36)
      .slice(2),
  ].join('');
}

export function productSessionId() {
  try {
    const existing =
      window.sessionStorage.getItem(
        SESSION_KEY
      );

    if (
      existing
    ) {
      return existing;
    }

    const created =
      randomSessionId()
        .slice(
          0,
          72
        );

    window.sessionStorage.setItem(
      SESSION_KEY,
      created
    );

    return created;
  } catch {
    return randomSessionId()
      .slice(
        0,
        72
      );
  }
}

export async function trackProductEvent(
  eventName,
  {
    routeKey,
    type = '',
    branch = '',
    semester = '',
    examType = '',
    resultCount = null,
  } = {}
) {
  const payload = {
    eventName,
    sessionId:
      productSessionId(),
    routeKey,
    type,
    branch,
    semester:
      semester ||
      null,
    examType,
  };

  if (
    resultCount != null
  ) {
    payload.resultCount =
      Number(
        resultCount
      ) ||
      0;
  }

  const response =
    await axios.post(
      `${API_URL}/api/product-events`,
      payload
    );

  return response.data;
}

export async function getProductAnalytics(
  period = '30d'
) {
  const response =
    await axios.get(
      `${API_URL}/api/admin/product-analytics`,
      {
        headers:
          adminHeader(),
        params: {
          period,
        },
      }
    );

  return response.data;
}
