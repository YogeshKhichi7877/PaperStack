import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Helmet,
} from 'react-helmet-async';

import {
  Link,
} from 'react-router-dom';

import {
  getProductAnalytics,
} from '../services/productAnalyticsApi';

import './AdminProductAnalyticsPage.css';

const ROUTE_LABELS = {
  archive:
    'Archive',
  search:
    'Search',
  questions:
    'Questions',
  question_detail:
    'Question detail',
  paper:
    'Paper',
  subject:
    'Subject Hub',
  survival:
    'Survival Pack',
  exam_mode:
    'Exam Mode',
  pyq_intelligence:
    'PYQ Intelligence',
  important_topics:
    'Important Topics',
  revision:
    'Revision',
  war_room:
    'War Room',
  ask:
    'Ask PaperStack',
  mocks:
    'Mocks',
  mock_evaluation:
    'Mock Evaluation',
  dashboard:
    'Dashboard',
  contribute:
    'Contribute Paper',
  resource_contribute:
    'Contribute Resource',
  missing_papers:
    'Missing Papers',
  contributors:
    'Contributors',
  archive_analytics:
    'Archive Analytics',
  archive_progress:
    'Archive Progress',
  verify_archive:
    'Verify Archive',
  notifications:
    'Notifications',
  progress:
    'Study Progress',
  trending:
    'Trending',
  branches:
    'Branch Competition',
};

function formatDay(
  dayKey
) {
  const date =
    new Date(
      `${dayKey}T00:00:00`
    );

  return date.toLocaleDateString(
    undefined,
    {
      month:
        'short',
      day:
        'numeric',
    }
  );
}

export default function AdminProductAnalyticsPage({
  isAdmin,
  toast,
}) {
  const [
    period,
    setPeriod,
  ] = useState(
    '30d'
  );

  const [
    data,
    setData,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    if (
      !isAdmin
    ) {
      setLoading(
        false
      );

      return undefined;
    }

    let mounted =
      true;

    setLoading(
      true
    );

    getProductAnalytics(
      period
    )
      .then(
        (result) => {
          if (
            mounted
          ) {
            setData(
              result
            );
          }
        }
      )
      .catch(
        (error) => {
          if (
            toast
          ) {
            toast(
              error.response?.data?.error ||
                'Could not load product analytics.',
              'error'
            );
          }
        }
      )
      .finally(
        () => {
          if (
            mounted
          ) {
            setLoading(
              false
            );
          }
        }
      );

    return () => {
      mounted =
        false;
    };
  }, [
    period,
    isAdmin,
    toast,
  ]);

  const maxDaily =
    useMemo(
      () =>
        Math.max(
          1,
          ...(
            data?.daily ||
            []
          ).map(
            (day) =>
              Math.max(
                Number(
                  day.pageViews ||
                  0
                ),
                Number(
                  day.sessions ||
                  0
                )
              )
          )
        ),
      [data]
    );

  const maxRouteViews =
    useMemo(
      () =>
        Math.max(
          1,
          ...(
            data?.routes ||
            []
          ).map(
            (route) =>
              Number(
                route.views ||
                0
              )
          )
        ),
      [data]
    );

  if (
    !isAdmin
  ) {
    return (
      <main className="pa-page">
        <Helmet>
          <title>
            Product Analytics - PaperStack
          </title>
        </Helmet>

        <div className="pa-shell">
          <div className="pa-empty">
            <h1>
              Admin access required.
            </h1>

            <p>
              Product analytics is
              available only in admin
              mode.
            </p>

            <Link to="/admin">
              Open Admin Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="pa-page">
      <Helmet>
        <title>
          Product Analytics - PaperStack
        </title>
      </Helmet>

      <div className="pa-shell">
        <section className="pa-hero">
          <div>
            <span>
              Product Analytics
            </span>

            <h1>
              Understand which PaperStack tools students actually use.
            </h1>

            <p>
              Anonymous session-level
              usage, search quality,
              paper engagement, archive
              growth and moderation
              pressure — without storing
              raw search queries.
            </p>
          </div>

          <div className="pa-window">
            <strong>
              {
                period ===
                '7d'
                  ? '7'
                  : '30'
              }
            </strong>

            <span>
              day window
            </span>

            <div>
              <button
                type="button"
                className={
                  period ===
                  '7d'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setPeriod(
                    '7d'
                  )
                }
              >
                7D
              </button>

              <button
                type="button"
                className={
                  period ===
                  '30d'
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setPeriod(
                    '30d'
                  )
                }
              >
                30D
              </button>
            </div>
          </div>
        </section>

        {
          loading ? (
            <div className="pa-empty">
              Building analytics…
            </div>
          ) : (
            <>
              {
                data
                  ?.eventWindowTruncated && (
                  <div className="pa-warning">
                    The anonymous event
                    window exceeded
                    50,000 records.
                    Dashboard event
                    metrics are based on
                    the first 50,000
                    records in this
                    period.
                  </div>
                )
              }

              <section className="pa-kpis">
                <article>
                  <span>
                    Active sessions
                  </span>

                  <strong>
                    {
                      data
                        ?.kpis
                        ?.activeSessions ||
                      0
                    }
                  </strong>

                  <p>
                    anonymous browser
                    sessions
                  </p>
                </article>

                <article>
                  <span>
                    Page views
                  </span>

                  <strong>
                    {
                      data
                        ?.kpis
                        ?.pageViews ||
                      0
                    }
                  </strong>

                  <p>
                    tracked product
                    routes
                  </p>
                </article>

                <article>
                  <span>
                    Searches
                  </span>

                  <strong>
                    {
                      data
                        ?.kpis
                        ?.searches ||
                      0
                    }
                  </strong>

                  <p>
                    Search 2.0 requests
                  </p>
                </article>

                <article>
                  <span>
                    Search success
                  </span>

                  <strong>
                    {
                      data
                        ?.kpis
                        ?.searchSuccessRate ||
                      0
                    }%
                  </strong>

                  <p>
                    searches with at
                    least one result
                  </p>
                </article>

                <article>
                  <span>
                    Paper views
                  </span>

                  <strong>
                    {
                      data
                        ?.kpis
                        ?.paperViews ||
                      0
                    }
                  </strong>

                  <p>
                    recent aggregate
                    views
                  </p>
                </article>

                <article>
                  <span>
                    Downloads
                  </span>

                  <strong>
                    {
                      data
                        ?.kpis
                        ?.paperDownloads ||
                      0
                    }
                  </strong>

                  <p>
                    recent aggregate
                    downloads
                  </p>
                </article>
              </section>

              <section className="pa-panel">
                <div className="pa-head">
                  <div>
                    <span>
                      Usage over time
                    </span>

                    <h2>
                      Sessions and page views
                    </h2>
                  </div>

                  <small>
                    {
                      data
                        ?.startDay
                    } → today
                  </small>
                </div>

                <div className="pa-daily">
                  {
                    (
                      data
                        ?.daily ||
                      []
                    ).map(
                      (
                        day
                      ) => (
                        <div
                          key={
                            day.dayKey
                          }
                        >
                          <div className="pa-bars">
                            <i
                              title={`${day.pageViews} page views`}
                              style={{
                                height:
                                  `${Math.max(3, (day.pageViews / maxDaily) * 100)}%`,
                              }}
                            />

                            <b
                              title={`${day.sessions} sessions`}
                              style={{
                                height:
                                  `${Math.max(3, (day.sessions / maxDaily) * 100)}%`,
                              }}
                            />
                          </div>

                          <span>
                            {
                              formatDay(
                                day.dayKey
                              )
                            }
                          </span>

                          <small>
                            {
                              day.sessions
                            }S
                          </small>
                        </div>
                      )
                    )
                  }
                </div>

                <div className="pa-legend">
                  <span>
                    <i />
                    Page views
                  </span>

                  <span>
                    <b />
                    Sessions
                  </span>
                </div>
              </section>

              <section className="pa-two-col">
                <article className="pa-panel">
                  <div className="pa-head">
                    <div>
                      <span>
                        Feature adoption
                      </span>

                      <h2>
                        Most-used routes
                      </h2>
                    </div>
                  </div>

                  <div className="pa-route-list">
                    {
                      (
                        data
                          ?.routes ||
                        []
                      ).length ? (
                        data.routes.map(
                          (
                            route
                          ) => (
                            <div
                              key={
                                route.routeKey
                              }
                            >
                              <div>
                                <strong>
                                  {
                                    ROUTE_LABELS[
                                      route.routeKey
                                    ] ||
                                    route.routeKey
                                  }
                                </strong>

                                <span>
                                  {
                                    route.views
                                  } views · {
                                    route.sessions
                                  } sessions
                                </span>
                              </div>

                              <div className="pa-route-bar">
                                <i
                                  style={{
                                    width:
                                      `${Math.round((route.views / maxRouteViews) * 100)}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )
                        )
                      ) : (
                        <p className="pa-muted">
                          Usage data will
                          appear after
                          students visit
                          tracked routes.
                        </p>
                      )
                    }
                  </div>
                </article>

                <article className="pa-panel">
                  <div className="pa-head">
                    <div>
                      <span>
                        Search quality
                      </span>

                      <h2>
                        Result health
                      </h2>
                    </div>
                  </div>

                  <div className="pa-search-health">
                    <div>
                      <strong>
                        {
                          data
                            ?.search
                            ?.total ||
                          0
                        }
                      </strong>

                      <span>
                        searches
                      </span>
                    </div>

                    <div>
                      <strong>
                        {
                          data
                            ?.search
                            ?.zeroResults ||
                          0
                        }
                      </strong>

                      <span>
                        zero-result
                      </span>
                    </div>

                    <div>
                      <strong>
                        {
                          data
                            ?.search
                            ?.successRate ||
                          0
                        }%
                      </strong>

                      <span>
                        result success
                      </span>
                    </div>
                  </div>

                  <div className="pa-buckets">
                    {
                      Object.entries(
                        data
                          ?.search
                          ?.buckets ||
                        {}
                      ).map(
                        ([
                          bucket,
                          count,
                        ]) => (
                          <div
                            key={
                              bucket
                            }
                          >
                            <span>
                              {
                                bucket
                              } results
                            </span>

                            <strong>
                              {
                                count
                              }
                            </strong>
                          </div>
                        )
                      )
                    }
                  </div>

                  <p className="pa-privacy">
                    Raw search text is
                    not stored in product
                    analytics.
                  </p>
                </article>
              </section>

              <section className="pa-three-col">
                <article className="pa-panel">
                  <div className="pa-head">
                    <div>
                      <span>
                        Session path
                      </span>

                      <h2>
                        Journey signals
                      </h2>
                    </div>
                  </div>

                  <div className="pa-stack-stats">
                    <div>
                      <span>
                        Tracked sessions
                      </span>

                      <strong>
                        {
                          data
                            ?.journey
                            ?.trackedSessions ||
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Discovery
                      </span>

                      <strong>
                        {
                          data
                            ?.journey
                            ?.discoverySessions ||
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Study tools
                      </span>

                      <strong>
                        {
                          data
                            ?.journey
                            ?.studySessions ||
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Contribution intent
                      </span>

                      <strong>
                        {
                          data
                            ?.journey
                            ?.contributionIntentSessions ||
                          0
                        }
                      </strong>
                    </div>
                  </div>
                </article>

                <article className="pa-panel">
                  <div className="pa-head">
                    <div>
                      <span>
                        Archive
                      </span>

                      <h2>
                        Product inventory
                      </h2>
                    </div>
                  </div>

                  <div className="pa-stack-stats">
                    <div>
                      <span>
                        Accounts
                      </span>

                      <strong>
                        {
                          data
                            ?.inventory
                            ?.accounts ||
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Papers
                      </span>

                      <strong>
                        {
                          data
                            ?.inventory
                            ?.papers ||
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Resources
                      </span>

                      <strong>
                        {
                          data
                            ?.inventory
                            ?.resources ||
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Questions
                      </span>

                      <strong>
                        {
                          data
                            ?.inventory
                            ?.questions ||
                          0
                        }
                      </strong>
                    </div>
                  </div>
                </article>

                <article className="pa-panel">
                  <div className="pa-head">
                    <div>
                      <span>
                        Admin load
                      </span>

                      <h2>
                        Moderation pressure
                      </h2>
                    </div>
                  </div>

                  <div className="pa-stack-stats">
                    <div>
                      <span>
                        Pending papers
                      </span>

                      <strong>
                        {
                          data
                            ?.moderation
                            ?.pendingContributions ||
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Corrections
                      </span>

                      <strong>
                        {
                          data
                            ?.moderation
                            ?.needsCorrectionContributions ||
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Resources
                      </span>

                      <strong>
                        {
                          data
                            ?.moderation
                            ?.pendingResourceContributions ||
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Solutions
                      </span>

                      <strong>
                        {
                          data
                            ?.moderation
                            ?.pendingSolutions ||
                          0
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Reports
                      </span>

                      <strong>
                        {
                          data
                            ?.moderation
                            ?.openReports ||
                          0
                        }
                      </strong>
                    </div>
                  </div>

                  <Link
                    to="/admin/moderation"
                    className="pa-admin-link"
                  >
                    Open Moderation Center
                  </Link>
                </article>
              </section>

              <section className="pa-growth">
                <div>
                  <span>
                    Added in this window
                  </span>

                  <strong>
                    {
                      data
                        ?.growth
                        ?.papersAdded ||
                      0
                    }
                  </strong>

                  <small>
                    papers
                  </small>
                </div>

                <div>
                  <span>
                    Approved in this window
                  </span>

                  <strong>
                    {
                      data
                        ?.growth
                        ?.contributionsApproved ||
                      0
                    }
                  </strong>

                  <small>
                    contributions
                  </small>
                </div>

                <div>
                  <span>
                    Solutions approved
                  </span>

                  <strong>
                    {
                      data
                        ?.growth
                        ?.solutionsApproved ||
                      0
                    }
                  </strong>

                  <small>
                    student solutions
                  </small>
                </div>
              </section>

              <section className="pa-method">
                <strong>
                  Privacy-aware analytics
                </strong>

                <p>
                  {
                    data
                      ?.methodology
                      ?.identity
                  }
                </p>

                <p>
                  {
                    data
                      ?.methodology
                      ?.searchPrivacy
                  }
                </p>

                <small>
                  {
                    data
                      ?.methodology
                      ?.caution
                  }
                </small>
              </section>
            </>
          )
        }
      </div>
    </main>
  );
}
