import { useEffect } from 'react';

import {
  useLocation,
} from 'react-router-dom';

import {
  localDayKey,
  pingStudyActivity,
} from '../services/streakApi';
import { recordStudyProgressOnce } from '../services/studyProgressApi';

function studyCategory(
  pathname
) {
  const path =
    String(
      pathname ||
      ''
    );

  if (
    path === '/' ||
    path.startsWith(
      '/paper/'
    )
  ) {
    return 'archive';
  }

  if (
    path.startsWith(
      '/questions'
    ) ||
    path.startsWith(
      '/subject/'
    )
  ) {
    return 'questions';
  }

  if (
    path.startsWith(
      '/revision-sheets'
    ) ||
    path.startsWith(
      '/semester-survival'
    )
  ) {
    return 'revision';
  }

  if (
    path.startsWith(
      '/exam-war-room'
    )
  ) {
    return 'war_room';
  }

  if (
    path.startsWith(
      '/ask-paperstack'
    )
  ) {
    return 'ask';
  }

  if (
    path.startsWith(
      '/mock-exams'
    ) ||
    path.startsWith(
      '/mock-evaluation'
    )
  ) {
    return 'mock';
  }

  return null;
}

function resumableRoute(pathname) {
  const path = String(pathname || '');
  const entityMatch = path.match(/^\/(subject|paper)\/([^/]+)/);
  if (entityMatch) {
    const entityType = entityMatch[1];
    const entityKey = decodeURIComponent(entityMatch[2]);
    return {
      entityType,
      entityKey,
      title: entityType === 'subject' ? `Subject hub · ${entityKey}` : 'Question paper',
      route: path,
    };
  }
  const routes = [
    ['/revision-sheets', 'revision', 'Revision sheets'],
    ['/exam-war-room', 'war_room', 'Exam War Room'],
    ['/mock-exams', 'mock', 'Mock exams'],
    ['/mock-evaluation', 'mock', 'Mock evaluation'],
  ];
  const match = routes.find(([route]) => path.startsWith(route));
  return match ? { entityType: match[1], entityKey: match[0], title: match[2], route: pathname } : null;
}

export default function StudyActivityTracker({ user }) {
  const location =
    useLocation();

  useEffect(() => {
    const token =
      localStorage.getItem(
        'token'
      );

    const category =
      studyCategory(
        location.pathname
      );

    if (
      !user ||
      !token ||
      !category
    ) {
      return;
    }

    const resume = resumableRoute(location.pathname);
    if (resume) recordStudyProgressOnce({ ...resume, status: 'in_progress', progress: 5 }).catch(() => {});

    const key = [
      'paperstack-study-ping',
      localDayKey(),
      category,
    ].join(':');

    try {
      if (
        sessionStorage.getItem(
          key
        )
      ) {
        return;
      }

      sessionStorage.setItem(
        key,
        'pending'
      );
    } catch {}

    pingStudyActivity({
      category,
      route:
        location.pathname,
    })
      .then(
        () => {
          try {
            sessionStorage.setItem(
              key,
              'done'
            );
          } catch {}
        }
      )
      .catch(
        (error) => {
          try {
            sessionStorage.removeItem(
              key
            );
          } catch {}

          if (
            error.response
              ?.status !==
            401
          ) {
            console.error(
              'Study activity ping failed:',
              error
            );
          }
        }
      );
  }, [
    location.pathname,
    user,
  ]);

  return null;
}

export {
  resumableRoute,
  studyCategory,
};
