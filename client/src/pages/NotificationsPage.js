import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Helmet,
} from 'react-helmet-async';

import {
  Link,
} from 'react-router-dom';

import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  syncNotifications,
} from '../services/notificationApi';

import './NotificationsPage.css';

function relativeDate(
  value
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleString();
}

function sourceLabel(
  sourceType
) {
  const labels = {
    contribution:
      'Contribution',
    paper_request:
      'Request',
    question_solution:
      'Solution',
    system:
      'PaperStack',
  };

  return (
    labels[
      sourceType
    ] ||
    'PaperStack'
  );
}

export default function NotificationsPage({
  toast,
}) {
  const [
    notifications,
    setNotifications,
  ] = useState([]);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    unreadOnly,
    setUnreadOnly,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    authError,
    setAuthError,
  ] = useState(false);

  const load = useCallback(async ({
    sync = true,
  } = {}) => {
    setLoading(
      true
    );

    try {
      const data =
        await getNotifications({
          limit:
            60,
          unreadOnly,
          sync,
        });

      setNotifications(
        data
          ?.notifications ||
        []
      );

      setUnreadCount(
        Number(
          data
            ?.unreadCount ||
          0
        )
      );

      setAuthError(
        false
      );
    } catch (
      error
    ) {
      if (
        error.response
          ?.status ===
          401
      ) {
        setAuthError(
          true
        );
      } else if (
        toast
      ) {
        toast(
          error.response?.data?.error ||
            'Could not load notifications.',
          'error'
        );
      }
    } finally {
      setLoading(
        false
      );
    }
  }, [unreadOnly, toast]);

  useEffect(() => {
    load({
      sync:
        true,
    });
  }, [load]);

  async function markOne(
    notification
  ) {
    if (
      notification.isRead
    ) {
      return;
    }

    try {
      await markNotificationRead(
        notification._id
      );

      setNotifications(
        (
          current
        ) =>
          current.map(
            (item) =>
              item._id ===
              notification._id
                ? {
                    ...item,
                    isRead:
                      true,
                    readAt:
                      new Date()
                        .toISOString(),
                  }
                : item
          )
      );

      setUnreadCount(
        (
          current
        ) =>
          Math.max(
            0,
            current -
              1
          )
      );
    } catch {}
  }

  async function readAll() {
    try {
      await markAllNotificationsRead();

      setNotifications(
        (
          current
        ) =>
          current.map(
            (item) => ({
              ...item,
              isRead:
                true,
              readAt:
                item.readAt ||
                new Date()
                  .toISOString(),
            })
          )
      );

      setUnreadCount(
        0
      );
    } catch (
      error
    ) {
      if (
        toast
      ) {
        toast(
          error.response?.data?.error ||
            'Could not mark notifications as read.',
          'error'
        );
      }
    }
  }

  async function manualSync() {
    try {
      const data =
        await syncNotifications();

      setUnreadCount(
        Number(
          data
            ?.unreadCount ||
          0
        )
      );

      await load({
        sync:
          false,
      });

      if (
        toast
      ) {
        toast(
          'Notifications refreshed.',
          'success'
        );
      }
    } catch (
      error
    ) {
      if (
        toast
      ) {
        toast(
          error.response?.data?.error ||
            'Could not refresh notifications.',
          'error'
        );
      }
    }
  }

  if (
    authError
  ) {
    return (
      <main className="nt-page">
        <Helmet>
          <title>
            Notifications - PaperStack
          </title>
        </Helmet>

        <div className="nt-shell">
          <div className="nt-state">
            <h1>
              Sign in to see your notifications.
            </h1>

            <p>
              PaperStack alerts are
              private to your account.
            </p>

            <Link to="/login">
              Sign In
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="nt-page">
      <Helmet>
        <title>
          Notifications - PaperStack
        </title>

        <meta
          name="description"
          content="PaperStack notifications for contribution reviews, paper requests, and student solutions."
        />
      </Helmet>

      <div className="nt-shell">
        <section className="nt-hero">
          <div>
            <span>
              Notification Center
            </span>

            <h1>
              Know when something you contributed or requested changes.
            </h1>

            <p>
              PaperStack automatically
              synchronizes contribution
              reviews, fulfilled paper
              requests and student
              solution moderation.
            </p>
          </div>

          <div className="nt-unread">
            <strong>
              {
                unreadCount
              }
            </strong>

            <span>
              unread
            </span>

            <p>
              In-app alerts · no paid
              notification service
              required
            </p>
          </div>
        </section>

        <section className="nt-toolbar">
          <div>
            <button
              type="button"
              className={
                !unreadOnly
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setUnreadOnly(
                  false
                )
              }
            >
              All
            </button>

            <button
              type="button"
              className={
                unreadOnly
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setUnreadOnly(
                  true
                )
              }
            >
              Unread
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={
                manualSync
              }
            >
              Refresh
            </button>

            <button
              type="button"
              disabled={
                unreadCount ===
                0
              }
              onClick={
                readAll
              }
            >
              Mark all read
            </button>
          </div>
        </section>

        {
          loading ? (
            <div className="nt-state">
              Loading notifications…
            </div>
          ) : notifications.length ===
            0 ? (
            <div className="nt-state">
              <h2>
                {
                  unreadOnly
                    ? 'No unread notifications.'
                    : 'Nothing to show yet.'
                }
              </h2>

              <p>
                New review/request
                changes will appear
                here automatically.
              </p>
            </div>
          ) : (
            <section className="nt-list">
              {
                notifications.map(
                  (
                    notification
                  ) => (
                    <article
                      key={
                        notification._id
                      }
                      className={
                        [
                          'nt-item',
                          notification
                            .isRead
                            ? 'read'
                            : 'unread',
                          notification
                            .severity,
                        ].join(
                          ' '
                        )
                      }
                    >
                      <div className="nt-dot">
                        <span />
                      </div>

                      <div className="nt-content">
                        <div className="nt-meta">
                          <span>
                            {
                              sourceLabel(
                                notification.sourceType
                              )
                            }
                          </span>

                          <time>
                            {
                              relativeDate(
                                notification.eventAt
                              )
                            }
                          </time>
                        </div>

                        <h2>
                          {
                            notification.title
                          }
                        </h2>

                        <p>
                          {
                            notification.message
                          }
                        </p>

                        <div className="nt-actions">
                          {
                            notification.actionUrl && (
                              <Link
                                to={
                                  notification.actionUrl
                                }
                                onClick={() =>
                                  markOne(
                                    notification
                                  )
                                }
                              >
                                Open
                              </Link>
                            )
                          }

                          {
                            !notification.isRead && (
                              <button
                                type="button"
                                onClick={() =>
                                  markOne(
                                    notification
                                  )
                                }
                              >
                                Mark read
                              </button>
                            )
                          }
                        </div>
                      </div>
                    </article>
                  )
                )
              }
            </section>
          )
        }

        <section className="nt-footnote">
          <strong>
            What triggers an alert?
          </strong>

          <p>
            Contribution approved,
            rejected, or sent back for
            correction; a requested
            paper becomes fulfilled; or
            one of your student
            solutions is approved or
            rejected.
          </p>
        </section>
      </div>
    </main>
  );
}
