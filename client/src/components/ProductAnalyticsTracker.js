import { useEffect } from 'react';

import {
  useLocation,
} from 'react-router-dom';

import {
  trackProductEvent,
} from '../services/productAnalyticsApi';

function routeKeyForPath(
  pathname
) {
  const path =
    String(
      pathname ||
      '/'
    );

  if (
    path === '/'
  ) {
    return 'archive';
  }

  if (
    path ===
    '/search'
  ) {
    return 'search';
  }

  if (
    path ===
    '/questions'
  ) {
    return 'questions';
  }

  if (
    path.startsWith(
      '/questions/'
    )
  ) {
    return 'question_detail';
  }

  if (
    path.startsWith(
      '/paper/'
    )
  ) {
    return 'paper';
  }

  if (
    path.startsWith(
      '/subject/'
    )
  ) {
    return 'subject';
  }

  const routes = [
    [
      '/semester-survival',
      'survival',
    ],
    [
      '/exam-mode',
      'exam_mode',
    ],
    [
      '/pyq-intelligence',
      'pyq_intelligence',
    ],
    [
      '/important-topics',
      'important_topics',
    ],
    [
      '/revision-sheets',
      'revision',
    ],
    [
      '/exam-war-room',
      'war_room',
    ],
    [
      '/ask-paperstack',
      'ask',
    ],
    [
      '/mock-exams',
      'mocks',
    ],
    [
      '/mock-evaluation',
      'mock_evaluation',
    ],
    [
      '/dashboard',
      'dashboard',
    ],
    [
      '/contribute-resource',
      'resource_contribute',
    ],
    [
      '/contribute',
      'contribute',
    ],
    [
      '/missing-papers',
      'missing_papers',
    ],
    [
      '/contributors',
      'contributors',
    ],
    [
      '/analytics',
      'archive_analytics',
    ],
    [
      '/archive-progress',
      'archive_progress',
    ],
    [
      '/verify-archive',
      'verify_archive',
    ],
    [
      '/notifications',
      'notifications',
    ],
    [
      '/streaks',
      'progress',
    ],
    [
      '/trending',
      'trending',
    ],
    [
      '/branch-competition',
      'branches',
    ],
  ];

  const found =
    routes.find(
      ([route]) =>
        path === route ||
        path.startsWith(
          `${route}/`
        )
    );

  return found
    ? found[
        1
      ]
    : null;
}

export default function ProductAnalyticsTracker() {
  const location =
    useLocation();

  useEffect(() => {
    const routeKey =
      routeKeyForPath(
        location.pathname
      );

    if (
      !routeKey
    ) {
      return;
    }

    const storageKey =
      `ps-product-route:${routeKey}`;

    const now =
      Date.now();

    try {
      const previous =
        Number(
          sessionStorage.getItem(
            storageKey
          ) ||
          0
        );

      if (
        now -
          previous <
        10000
      ) {
        return;
      }

      sessionStorage.setItem(
        storageKey,
        String(
          now
        )
      );
    } catch {}

    trackProductEvent(
      'page_view',
      {
        routeKey,
      }
    ).catch(
      () => {}
    );
  }, [
    location.pathname,
  ]);

  return null;
}

export {
  routeKeyForPath,
};
