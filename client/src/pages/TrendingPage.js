import { OFFICIAL_BRANCHES as OFFICIAL_BRANCHES_CONFIG } from '../config/branches';
// TrendingPage.js
// Based on the existing Trending page data/API flow. :chatgpt-content-reference{index="0"}

import React, {
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
  Activity,
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  CircleAlert,
  Clock3,
  Eye,
  FileText,
  Flame,
  Gauge,
  GraduationCap,
  LibraryBig,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import {
  getTrending,
} from '../services/trendingApi';

import './TrendingPage.css';

/* =========================================================
   IIIT SURAT BRANCHES
========================================================= */

const BRANCHES = [{ value: '', label: 'All branches' }, ...OFFICIAL_BRANCHES_CONFIG.map(({ key }) => ({ value: key, label: key }))];

const WINDOWS = [
  {
    value: '7d',
    label: '7 Days',
  },
  {
    value: '30d',
    label: '30 Days',
  },
];

/* =========================================================
   HELPERS
========================================================= */

function formatNumber(
  value
) {
  return Number(
    value || 0
  ).toLocaleString(
    'en-IN'
  );
}

function safeNumber(
  value
) {
  return Number(
    value || 0
  );
}

function rankingLabel(
  index
) {
  return String(
    index + 1
  ).padStart(
    2,
    '0'
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function TrendingPage({
  toast,
}) {
  const [
    period,
    setPeriod,
  ] =
    useState('7d');

  const [
    branch,
    setBranch,
  ] =
    useState('');

  const [
    semester,
    setSemester,
  ] =
    useState('');

  const [
    data,
    setData,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  /* =========================================================
     LOAD
  ========================================================= */

  useEffect(() => {
    let mounted =
      true;

    setLoading(
      true
    );

    getTrending({
      period,
      branch,
      semester,
    })
      .then(
        (result) => {
          if (mounted) {
            setData(
              result
            );
          }
        }
      )
      .catch(
        (error) => {
          toast?.(
            error.response
              ?.data
              ?.error ||
              'Could not load trending archive activity.',
            'error'
          );
        }
      )
      .finally(() => {
        if (mounted) {
          setLoading(
            false
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    period,
    branch,
    semester,
    toast,
  ]);

  /* =========================================================
     DERIVED DATA
  ========================================================= */

  const recentMode =
    data?.dataMode ===
    'recent-engagement';

  const papers =
    Array.isArray(
      data?.papers
    )
      ? data.papers
      : [];

  const subjects =
    Array.isArray(
      data?.subjects
    )
      ? data.subjects
      : [];

  const topics =
    Array.isArray(
      data?.topics
    )
      ? data.topics
      : [];

  const topPaper =
    papers[0] || null;

  const maxPaperScore =
    Math.max(
      1,
      ...papers.map(
        (paper) =>
          safeNumber(
            paper.trendScore
          )
      )
    );

  const totalPaperViews =
    papers.reduce(
          (
            sum,
            paper
          ) =>
            sum +
            safeNumber(
              recentMode
                ? paper.recentViews
                : paper.totalViews
            ),
          0
    );

  const totalDownloads =
    papers.reduce(
          (
            sum,
            paper
          ) =>
            sum +
            safeNumber(
              recentMode
                ? paper.recentDownloads
                : paper.totalDownloads
            ),
          0
    );

  const selectedBranch =
    BRANCHES.find(
      (item) =>
        item.value ===
        branch
    )?.label ||
    'All branches';

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="tr-page">
      <Helmet>
        <title>
          Trending -
          PaperStack
        </title>

        <meta
          name="description"
          content="See which papers, subjects and topics students are exploring across the PaperStack archive."
        />
      </Helmet>

      <div className="tr-shell">
        {/* =================================================
            PULSE HEADER
        ================================================= */}

        <header className="tr-header">
          <div className="tr-header-copy">
            <span className="tr-kicker">
              <Activity
                size={15}
              />

              Campus Archive Pulse
            </span>

            <h1>
              What students
              <br />

              <span>
                are exploring now.
              </span>
            </h1>

            <p>
              See the papers,
              subjects and topics
              getting attention
              across PaperStack.
              Trends come from
              archive activity,
              not individual
              student tracking.
            </p>

            <div className="tr-header-meta">
              <span>
                <Eye
                  size={13}
                />

                Aggregate views
              </span>

              <span>
                <FileText
                  size={13}
                />

                Downloads
              </span>

              <span>
                <LibraryBig
                  size={13}
                />

                Archive activity
              </span>
            </div>
          </div>

          {/* ===============================================
              PULSE MONITOR
          =============================================== */}

          <aside className="tr-pulse-monitor">
            <header>
              <span>
                Pulse monitor
              </span>

              <Gauge
                size={17}
              />
            </header>

            <div className="tr-live-state">
              <span
                className={
                  recentMode
                    ? 'live'
                    : 'baseline'
                }
              >
                <i />

                {recentMode
                  ? 'LIVE'
                  : 'BASELINE'}
              </span>

              <strong>
                {period ===
                '30d'
                  ? '30'
                  : '7'}
              </strong>

              <small>
                day window
              </small>
            </div>

            <div className="tr-monitor-line">
              <span>
                Branch
              </span>

              <strong>
                {
                  selectedBranch
                }
              </strong>
            </div>

            <div className="tr-monitor-line">
              <span>
                Semester
              </span>

              <strong>
                {semester
                  ? `Semester ${semester}`
                  : 'All'}
              </strong>
            </div>

            <div className="tr-monitor-line">
              <span>
                Tracking
              </span>

              <strong>
                {recentMode
                  ? data?.trackingSince ||
                    'Active'
                  : 'Historical'}
              </strong>
            </div>
          </aside>
        </header>

        {/* =================================================
            CONTROL DESK
        ================================================= */}

        <section className="tr-control-desk">
          <div className="tr-window-switch">
            <span>
              Time window
            </span>

            <div>
              {WINDOWS.map(
                (item) => (
                  <button
                    type="button"
                    key={
                      item.value
                    }
                    className={
                      period ===
                      item.value
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setPeriod(
                        item.value
                      )
                    }
                  >
                    {
                      item.label
                    }
                  </button>
                )
              )}
            </div>
          </div>

          <label>
            <span>
              Branch
            </span>

            <select
              value={
                branch
              }
              onChange={(
                event
              ) =>
                setBranch(
                  event.target
                    .value
                )
              }
            >
              {BRANCHES.map(
                (item) => (
                  <option
                    key={
                      item.value ||
                      'all'
                    }
                    value={
                      item.value
                    }
                  >
                    {
                      item.label
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span>
              Semester
            </span>

            <select
              value={
                semester
              }
              onChange={(
                event
              ) =>
                setSemester(
                  event.target
                    .value
                )
              }
            >
              <option value="">
                All semesters
              </option>

              {[
                1,
                2,
                3,
                4,
                5,
                6,
                7,
                8,
              ].map(
                (item) => (
                  <option
                    key={
                      item
                    }
                    value={
                      item
                    }
                  >
                    Semester{' '}
                    {
                      item
                    }
                  </option>
                )
              )}
            </select>
          </label>

          <Link
            to="/search"
            className="tr-search-link"
          >
            <Search
              size={14}
            />

            Search archive

            <ArrowRight
              size={13}
            />
          </Link>
        </section>

        {/* =================================================
            STATE
        ================================================= */}

        {loading ? (
          <section className="tr-state">
            <span className="tr-loader" />

            <strong>
              Reading archive
              activity…
            </strong>

            <p>
              Building the current
              PaperStack pulse.
            </p>
          </section>
        ) : (
          <>
            {/* =============================================
                BASELINE NOTICE
            ============================================= */}

            {!recentMode && (
              <section className="tr-baseline-note">
                <CircleAlert
                  size={16}
                />

                <div>
                  <strong>
                    Historical baseline
                    mode
                  </strong>

                  <p>
                    PaperStack has total
                    historical views and
                    downloads for these
                    papers, but older
                    activity does not
                    contain daily
                    timestamps. New
                    activity will build
                    the recent trend
                    window automatically.
                  </p>
                </div>
              </section>
            )}

            {/* =============================================
                PULSE LEDGER
            ============================================= */}

            <section className="tr-pulse-ledger">
              <div>
                <span>
                  Papers in pulse
                </span>

                <strong>
                  {formatNumber(
                    papers.length
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Activity views
                </span>

                <strong>
                  {formatNumber(
                    totalPaperViews
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Downloads
                </span>

                <strong>
                  {formatNumber(
                    totalDownloads
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Active subjects
                </span>

                <strong>
                  {formatNumber(
                    subjects.length
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Active topics
                </span>

                <strong>
                  {formatNumber(
                    topics.length
                  )}
                </strong>
              </div>
            </section>

            {/* =============================================
                LEAD STORY
            ============================================= */}

            {topPaper && (
              <section className="tr-lead-story">
                <div className="tr-lead-rank">
                  <Flame
                    size={18}
                  />

                  <span>
                    Most opened
                  </span>

                  <strong>
                    01
                  </strong>
                </div>

                <div className="tr-lead-copy">
                  <span>
                    {topPaper.subjectCode ||
                      'Paper'}
                    {topPaper.year
                      ? ` · ${topPaper.year}`
                      : ''}
                    {topPaper.examType
                      ? ` · ${topPaper.examType}`
                      : ''}
                  </span>

                  <h2>
                    {topPaper.subject ||
                      topPaper.title}
                  </h2>

                  <p>
                    This paper currently
                    has the strongest
                    activity signal for
                    the selected filters.
                  </p>

                  <Link
                    to={`/paper/${topPaper._id}`}
                  >
                    Open paper

                    <ArrowRight
                      size={14}
                    />
                  </Link>
                </div>

                <div className="tr-lead-score">
                  <span>
                    Trend score
                  </span>

                  <strong>
                    {formatNumber(
                      topPaper.trendScore
                    )}
                  </strong>

                  <div>
                    <i
                      style={{
                        width:
                          '100%',
                      }}
                    />
                  </div>

                  <small>
                    {recentMode
                      ? `${formatNumber(
                          topPaper.recentViews
                        )} views · ${formatNumber(
                          topPaper.recentDownloads
                        )} downloads`
                      : `${formatNumber(
                          topPaper.totalViews
                        )} views · ${formatNumber(
                          topPaper.totalDownloads
                        )} downloads`}
                  </small>
                </div>
              </section>
            )}

            {/* =============================================
                MAIN EDITORIAL GRID
            ============================================= */}

            <section className="tr-editorial-grid">
              {/* ===========================================
                  PAPERS
              =========================================== */}

              <section className="tr-paper-board">
                <header className="tr-section-head">
                  <div>
                    <span>
                      Archive Activity
                    </span>

                    <h2>
                      Trending papers
                    </h2>

                    <p>
                      Ranked by the
                      current PaperStack
                      trend signal.
                    </p>
                  </div>

                  <TrendingUp
                    size={21}
                  />
                </header>

                {papers.length ? (
                  <div className="tr-paper-list">
                    {papers.map(
                      (
                        paper,
                        index
                      ) => {
                        const score =
                          safeNumber(
                            paper.trendScore
                          );

                        const width =
                          Math.max(
                            score >
                              0
                              ? 4
                              : 0,
                            Math.round(
                              (
                                score /
                                maxPaperScore
                              ) *
                                100
                            )
                          );

                        return (
                          <Link
                            key={
                              paper._id
                            }
                            to={`/paper/${paper._id}`}
                            className={
                              index ===
                              0
                                ? 'first'
                                : ''
                            }
                          >
                            <span className="tr-paper-rank">
                              {rankingLabel(
                                index
                              )}
                            </span>

                            <div className="tr-paper-copy">
                              <span>
                                {paper.subjectCode ||
                                  'Paper'}
                              </span>

                              <strong>
                                {paper.subject ||
                                  paper.title}
                              </strong>

                              <small>
                                {paper.year ||
                                  'Year'}
                                {paper.examType
                                  ? ` · ${paper.examType}`
                                  : ''}
                              </small>
                            </div>

                            <div className="tr-paper-signal">
                              <strong>
                                {formatNumber(
                                  score
                                )}
                              </strong>

                              <span>
                                trend pts
                              </span>

                              <div>
                                <i
                                  style={{
                                    width:
                                      `${width}%`,
                                  }}
                                />
                              </div>
                            </div>

                            <div className="tr-paper-engagement">
                              <span>
                                <Eye
                                  size={11}
                                />

                                {formatNumber(
                                  recentMode
                                    ? paper.recentViews
                                    : paper.totalViews
                                )}
                              </span>

                              <span>
                                <FileText
                                  size={11}
                                />

                                {formatNumber(
                                  recentMode
                                    ? paper.recentDownloads
                                    : paper.totalDownloads
                                )}
                              </span>
                            </div>

                            <ChevronRight
                              size={14}
                            />
                          </Link>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <div className="tr-empty">
                    <BookOpen
                      size={20}
                    />

                    <strong>
                      No papers match
                      these filters.
                    </strong>

                    <p>
                      Try another branch,
                      semester or time
                      window.
                    </p>
                  </div>
                )}
              </section>

              {/* ===========================================
                  SUBJECT RADAR
              =========================================== */}

              <aside className="tr-subject-radar">
                <header className="tr-section-head compact">
                  <div>
                    <span>
                      Subject Radar
                    </span>

                    <h2>
                      Where attention
                      is going
                    </h2>
                  </div>

                  <BarChart3
                    size={19}
                  />
                </header>

                {subjects.length ? (
                  <div className="tr-subject-list">
                    {subjects.map(
                      (
                        subject,
                        index
                      ) => (
                        <Link
                          key={`${subject.subjectCode}-${subject.subject}`}
                          to={
                            subject.subjectCode
                              ? `/subject/${encodeURIComponent(
                                  subject.subjectCode
                                )}`
                              : `/search?q=${encodeURIComponent(
                                  subject.subject
                                )}`
                          }
                        >
                          <span className="tr-subject-number">
                            {rankingLabel(
                              index
                            )}
                          </span>

                          <div>
                            <span>
                              {subject.subjectCode ||
                                'Subject'}
                            </span>

                            <strong>
                              {
                                subject.subject
                              }
                            </strong>

                            <small>
                              {formatNumber(
                                subject.papers
                              )}{' '}
                              paper
                              {Number(
                                subject.papers
                              ) === 1
                                ? ''
                                : 's'}
                            </small>
                          </div>

                          <b>
                            {formatNumber(
                              subject.score
                            )}
                          </b>
                        </Link>
                      )
                    )}
                  </div>
                ) : (
                  <div className="tr-empty compact">
                    <GraduationCap
                      size={19}
                    />

                    <strong>
                      No subject pulse
                      yet.
                    </strong>
                  </div>
                )}

                <footer className="tr-radar-note">
                  <Sparkles
                    size={14}
                  />

                  <p>
                    Subject rank follows
                    archive engagement.
                    It does not indicate
                    subject difficulty
                    or importance.
                  </p>
                </footer>
              </aside>
            </section>

            {/* =============================================
                TOPIC TICKER
            ============================================= */}

            <section className="tr-topic-section">
              <header className="tr-section-head">
                <div>
                  <span>
                    Topic Movement
                  </span>

                  <h2>
                    Topics students keep
                    running into
                  </h2>

                  <p>
                    Topic activity comes
                    from extracted topics
                    attached to trending
                    papers.
                  </p>
                </div>

                <Clock3
                  size={21}
                />
              </header>

              {topics.length ? (
                <div className="tr-topic-board">
                  {topics.map(
                    (
                      topic,
                      index
                    ) => (
                      <Link
                        key={
                          topic.topic
                        }
                        to={`/search?q=${encodeURIComponent(
                          topic.topic
                        )}&type=question`}
                      >
                        <span className="tr-topic-index">
                          {rankingLabel(
                            index
                          )}
                        </span>

                        <div className="tr-topic-name">
                          <span>
                            Topic
                          </span>

                          <strong>
                            {
                              topic.topic
                            }
                          </strong>
                        </div>

                        <div className="tr-topic-papers">
                          <span>
                            Papers
                          </span>

                          <strong>
                            {formatNumber(
                              topic.papers
                            )}
                          </strong>
                        </div>

                        <div className="tr-topic-score">
                          <span>
                            Signal
                          </span>

                          <strong>
                            {formatNumber(
                              topic.score
                            )}
                          </strong>
                        </div>

                        <ArrowRight
                          size={13}
                        />
                      </Link>
                    )
                  )}
                </div>
              ) : (
                <div className="tr-empty">
                  <Activity
                    size={20}
                  />

                  <strong>
                    Topic movement will
                    appear as extracted
                    archive activity
                    grows.
                  </strong>
                </div>
              )}
            </section>

            {/* =============================================
                METHOD
            ============================================= */}

            <section className="tr-method">
              <Activity
                size={16}
              />

              <div>
                <strong>
                  How the pulse works
                </strong>

                <p>
                  {data
                    ?.methodology
                    ?.recentScore ||
                    'Trend score is based on aggregated paper engagement.'}
                </p>

                <small>
                  {data
                    ?.methodology
                    ?.privacy ||
                    'PaperStack uses aggregate activity for trending and does not need to expose individual student browsing behavior.'}
                </small>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
