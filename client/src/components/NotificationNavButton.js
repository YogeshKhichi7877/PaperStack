import React, {
  useEffect,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  getNotifications,
} from '../services/notificationApi';

import './NotificationNavButton.css';

let cachedUnreadCount = 0;
let lastFetchAt = 0;
let inflight = null;

async function sharedUnreadRefresh({
  force = false,
} = {}) {
  const now =
    Date.now();

  if (
    !force &&
    now -
      lastFetchAt <
      55000
  ) {
    return cachedUnreadCount;
  }

  if (
    inflight
  ) {
    return inflight;
  }

  inflight =
    getNotifications({
      limit: 1,
      sync: true,
    })
      .then(
        (data) => {
          cachedUnreadCount =
            Number(
              data
                ?.unreadCount ||
              0
            );

          lastFetchAt =
            Date.now();

          return cachedUnreadCount;
        }
      )
      .finally(
        () => {
          inflight =
            null;
        }
      );

  return inflight;
}

export default function NotificationNavButton() {
  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  useEffect(() => {
    if (
      !localStorage.getItem(
        'token'
      )
    ) {
      setUnreadCount(
        0
      );

      return undefined;
    }

    let mounted =
      true;

    const refresh =
      async (
        force = false
      ) => {
        try {
          const count =
            await sharedUnreadRefresh({
              force,
            });

          if (
            mounted
          ) {
            setUnreadCount(
              count
            );
          }
        } catch (
          error
        ) {
          if (
            error.response
              ?.status !==
            401
          ) {
            console.error(
              'Notification badge failed:',
              error
            );
          }
        }
      };

    refresh();

    const timer =
      window.setInterval(
        () =>
          refresh(
            true
          ),
        60000
      );

    return () => {
      mounted =
        false;

      window.clearInterval(
        timer
      );
    };
  }, []);

  return (
    <Link
      to="/notifications"
      className="ps-notification-nav"
      aria-label={
        unreadCount
          ? `${unreadCount} unread notifications`
          : 'Notifications'
      }
      title="Notifications"
    >
      <span
        className="ps-notification-bell"
        aria-hidden="true"
      >
        ●
      </span>

      <span>
        Alerts
      </span>

      {
        unreadCount >
          0 && (
          <b>
            {
              unreadCount >
              99
                ? '99+'
                : unreadCount
            }
          </b>
        )
      }
    </Link>
  );
}
