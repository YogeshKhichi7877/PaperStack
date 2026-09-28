import React, {
  useCallback,
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
  Activity,
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  FileQuestion,
  Flame,
  Leaf,
  Lock,
  MessageCircleQuestion,
  RefreshCw,
  Sparkles,
  Sprout,
  Target,
  Trophy,
} from 'lucide-react';

import {
  getMyStudyStreak,
} from '../services/streakApi';

import './StreaksBadgesPage.css';

/* =========================================================
   STUDY CATEGORIES
========================================================= */

const CATEGORY_META = {
  archive: {
    label: 'Archive',
    short: 'PYQs',
    path: '/',
    icon: BookOpen,
  },

  questions: {
    label: 'Questions',
    short: 'Questions',
    path: '/questions',
    icon: FileQuestion,
  },

  revision: {
    label: 'Revision',
    short: 'Revision',
    path: '/revision-sheets',
    icon: BookOpen,
  },

  war_room: {
    label: 'War Room',
    short: 'War Room',
    path: '/exam-war-room',
    icon: Target,
  },

  ask: {
    label: 'Ask PaperStack',
    short: 'Ask',
    path: '/ask-paperstack',
    icon: MessageCircleQuestion,
  },

  mock: {
    label: 'Mock Exams',
    short: 'Mocks',
    path: '/mock-exams',
    icon: Trophy,
  },
};

/* =========================================================
   HELPERS
========================================================= */

function shortDay(
  dayKey
) {
  const date =
    new Date(
      `${dayKey}T00:00:00`
    );

  return date.toLocaleDateString(
    undefined,
    {
      weekday: 'short',
      day: 'numeric',
    }
  );
}

function longDay(
  dayKey
) {
  const date =
    new Date(
      `${dayKey}T00:00:00`
    );

  return date.toLocaleDateString(
    undefined,
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  );
}

function todayKey() {
  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() +
        1
    ).padStart(
      2,
      '0'
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      '0'
    );

  return `${year}-${month}-${day}`;
}

function formatNumber(
  value
) {
  return Number(
    value || 0
  ).toLocaleString(
    'en-IN'
  );
}

function badgeProgress(
  badge
) {
  return Math.max(
    0,
    Math.min(
      100,
      Number(
        badge?.progressPct ||
          0
      )
    )
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function StreaksBadgesPage({
  toast,
}) {
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

  const [
    authError,
    setAuthError,
  ] =
    useState(false);

  const [
    selectedDayKey,
    setSelectedDayKey,
  ] =
    useState('');

  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState('all');

  const [
    badgeFilter,
    setBadgeFilter,
  ] =
    useState('all');

  const [
    selectedBadgeId,
    setSelectedBadgeId,
  ] =
    useState('');

  /* =========================================================
     LOAD
  ========================================================= */

  const load =
    useCallback(
      async () => {
        setLoading(
          true
        );

        try {
          const result =
            await getMyStudyStreak();

          setData(
            result
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
          } else {
            toast?.(
              error.response
                ?.data
                ?.error ||
                'Could not load study progress.',
              'error'
            );
          }
        } finally {
          setLoading(
            false
          );
        }
      },
      [toast]
    );

  useEffect(() => {
    load();
  }, [load]);

  /* =========================================================
     DERIVED DATA
  ========================================================= */

  const recent14 =
    useMemo(
      () =>
        (
          data
            ?.recentDays ||
          []
        ).slice(
          -14
        ),
      [data]
    );

  const nextBadges =
    useMemo(
      () =>
        [
          ...(
            data
              ?.lockedBadges ||
            []
          ),
        ]
          .sort(
            (
              a,
              b
            ) =>
              Number(
                b.progressPct ||
                  0
              ) -
              Number(
                a.progressPct ||
                  0
              )
          )
          .slice(
            0,
            4
          ),
      [data]
    );

  const badges =
    Array.isArray(
      data?.badges
    )
      ? data.badges
      : [];

  const earnedBadges =
    badges.filter(
      (badge) =>
        badge.earned
    );

  const lockedBadges =
    badges.filter(
      (badge) =>
        !badge.earned
    );

  const visibleBadges =
    useMemo(() => {
      if (
        badgeFilter ===
        'earned'
      ) {
        return earnedBadges;
      }

      if (
        badgeFilter ===
        'locked'
      ) {
        return lockedBadges;
      }

      return badges;
    }, [
      badges,
      badgeFilter,
      earnedBadges,
      lockedBadges,
    ]);

  const selectedDay =
    useMemo(
      () =>
        recent14.find(
          (day) =>
            day.dayKey ===
            selectedDayKey
        ) ||
        null,
      [
        recent14,
        selectedDayKey,
      ]
    );

  const focusedBadge =
    useMemo(() => {
      const source = [
        ...nextBadges,
        ...badges,
      ];

      return (
        source.find(
          (badge) =>
            badge.id ===
            selectedBadgeId
        ) ||
        nextBadges[0] ||
        null
      );
    }, [
      nextBadges,
      badges,
      selectedBadgeId,
    ]);

  const totalCategoryDays =
    Object.values(
      data
        ?.categoryDayCounts ||
        {}
    ).reduce(
      (
        total,
        value
      ) =>
        total +
        Number(
          value || 0
        ),
      0
    );

  const currentStreak =
    Number(
      data
        ?.currentStreak ||
        0
    );

  const longestStreak =
    Number(
      data
        ?.longestStreak ||
        0
    );

  const streakStrength =
    longestStreak
      ? Math.min(
          100,
          Math.round(
            (
              currentStreak /
              longestStreak
            ) *
              100
          )
        )
      : currentStreak
        ? 100
        : 0;

  const activeDays =
    Number(
      data
        ?.activeDays ||
        0
    );

  const today =
    todayKey();

  /* =========================================================
     AUTH
  ========================================================= */

  if (authError) {
    return (
      <main className="sb-page">
        <Helmet>
          <title>
            Study Progress -
            PaperStack
          </title>
        </Helmet>

        <div className="sb-shell">
          <section className="sb-signin">
            <span className="sb-signin-mark">
              <Sprout
                size={28}
              />
            </span>

            <span className="sb-kicker">
              Study Progress
            </span>

            <h1>
              Your study rhythm
              starts after sign in.
            </h1>

            <p>
              PaperStack connects
              study activity to your
              account so streaks and
              achievements remain
              personal.
            </p>

            <Link to="/login">
              Sign in

              <ArrowRight
                size={14}
              />
            </Link>
          </section>
        </div>
      </main>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="sb-page">
      <Helmet>
        <title>
          Study Streaks &
          Badges - PaperStack
        </title>

        <meta
          name="description"
          content="Track your PaperStack study consistency, study-tool activity and earned achievements."
        />
      </Helmet>

      <div className="sb-shell">
        {/* =================================================
            STUDY GARDEN HEADER
        ================================================= */}

        <header className="sb-header">
          <div className="sb-header-copy">
            <span className="sb-kicker">
              <Sprout
                size={15}
              />

              Study Garden
            </span>

            <h1>
              Grow a habit
              <br />

              <span>
                that survives exams.
              </span>
            </h1>

            <p>
              Your streak grows when
              you actually use
              PaperStack study tools.
              The goal is not opening
              the website every day —
              it is building a useful
              study rhythm.
            </p>

            <div className="sb-header-actions">
              <Link to="/questions">
                Study now

                <ArrowRight
                  size={14}
                />
              </Link>

              <button
                type="button"
                onClick={
                  load
                }
                disabled={
                  loading
                }
              >
                <RefreshCw
                  size={13}
                />

                Refresh progress
              </button>
            </div>
          </div>

          {/* ===============================================
              STREAK TREE
          =============================================== */}

          <aside className="sb-streak-tree">
            <div className="sb-tree-top">
              <span>
                Current streak
              </span>

              <Flame
                size={19}
              />
            </div>

            <div className="sb-tree-number">
              <strong>
                {loading
                  ? '…'
                  : currentStreak}
              </strong>

              <div>
                <span>
                  day
                  {currentStreak ===
                  1
                    ? ''
                    : 's'}
                </span>

                <small>
                  Best:{' '}
                  {
                    longestStreak
                  }{' '}
                  days
                </small>
              </div>
            </div>

            <div className="sb-tree-progress">
              <span>
                Current vs.
                personal best
              </span>

              <div>
                <i
                  style={{
                    width:
                      `${streakStrength}%`,
                  }}
                />
              </div>

              <small>
                {
                  streakStrength
                }
                % of best
              </small>
            </div>

            <div className="sb-tree-roots">
              <span>
                <Leaf
                  size={12}
                />

                {activeDays}{' '}
                active days
              </span>

              <span>
                <Award
                  size={12}
                />

                {
                  earnedBadges.length
                }{' '}
                badges
              </span>
            </div>
          </aside>
        </header>

        {/* =================================================
            GROWTH LEDGER
        ================================================= */}

        {!loading && (
          <section className="sb-growth-ledger">
            <div>
              <span>
                Current streak
              </span>

              <strong>
                {
                  currentStreak
                }
              </strong>

              <small>
                consecutive days
              </small>
            </div>

            <div>
              <span>
                Personal best
              </span>

              <strong>
                {
                  longestStreak
                }
              </strong>

              <small>
                longest streak
              </small>
            </div>

            <div>
              <span>
                Active days
              </span>

              <strong>
                {
                  activeDays
                }
              </strong>

              <small>
                tracked study days
              </small>
            </div>

            <div>
              <span>
                Study actions
              </span>

              <strong>
                {formatNumber(
                  totalCategoryDays
                )}
              </strong>

              <small>
                category-days
              </small>
            </div>

            <div>
              <span>
                Badges earned
              </span>

              <strong>
                {
                  earnedBadges.length
                }
              </strong>

              <small>
                achievements
              </small>
            </div>
          </section>
        )}

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <section className="sb-state">
            <span className="sb-loader" />

            <strong>
              Growing your study
              timeline…
            </strong>

            <p>
              Loading streak history
              and achievements.
            </p>
          </section>
        ) : (
          <>
            {/* =============================================
                ACTIVITY TIMELINE
            ============================================= */}

            <section className="sb-timeline-section">
              <header className="sb-section-head">
                <div>
                  <span>
                    Last 14 Days
                  </span>

                  <h2>
                    Your study trail
                  </h2>

                  <p>
                    Click any day to
                    inspect what counted
                    toward your streak.
                  </p>
                </div>

                <CalendarDays
                  size={21}
                />
              </header>

              {/* ===========================================
                  CATEGORY FILTER
              =========================================== */}

              <div className="sb-category-filter">
                <button
                  type="button"
                  className={
                    categoryFilter ===
                    'all'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setCategoryFilter(
                      'all'
                    )
                  }
                >
                  All activity

                  <span>
                    {
                      recent14.filter(
                        (day) =>
                          day.active
                      ).length
                    }
                  </span>
                </button>

                {Object.entries(
                  CATEGORY_META
                ).map(
                  ([
                    key,
                    meta,
                  ]) => {
                    const Icon =
                      meta.icon;

                    const count =
                      Number(
                        data
                          ?.categoryDayCounts?.[
                          key
                        ] ||
                          0
                      );

                    return (
                      <button
                        type="button"
                        key={
                          key
                        }
                        className={
                          categoryFilter ===
                          key
                            ? 'active'
                            : ''
                        }
                        onClick={() =>
                          setCategoryFilter(
                            key
                          )
                        }
                      >
                        <Icon
                          size={12}
                        />

                        {
                          meta.short
                        }

                        <span>
                          {
                            count
                          }
                        </span>
                      </button>
                    );
                  }
                )}
              </div>

              {/* ===========================================
                  CALENDAR TRAIL
              =========================================== */}

              <div className="sb-calendar">
                {recent14.map(
                  (day) => {
                    const matchesFilter =
                      categoryFilter ===
                        'all' ||
                      day.categories
                        ?.includes(
                          categoryFilter
                        );

                    const active =
                      day.active &&
                      matchesFilter;

                    const selected =
                      selectedDayKey ===
                      day.dayKey;

                    const isToday =
                      day.dayKey ===
                      today;

                    return (
                      <button
                        type="button"
                        key={
                          day.dayKey
                        }
                        className={[
                          day.active
                            ? 'has-activity'
                            : '',
                          active
                            ? 'active'
                            : '',
                          !matchesFilter &&
                          day.active
                            ? 'muted'
                            : '',
                          selected
                            ? 'selected'
                            : '',
                          isToday
                            ? 'today'
                            : '',
                        ]
                          .filter(
                            Boolean
                          )
                          .join(
                            ' '
                          )}
                        onClick={() =>
                          setSelectedDayKey(
                            selected
                              ? ''
                              : day.dayKey
                          )
                        }
                        title={
                          day.active
                            ? `${day.dayKey}: ${day.categories
                                .map(
                                  (
                                    category
                                  ) =>
                                    CATEGORY_META[
                                      category
                                    ]
                                      ?.label ||
                                    category
                                )
                                .join(
                                  ', '
                                )}`
                            : `${day.dayKey}: no tracked study activity`
                        }
                      >
                        <span className="sb-day-dot">
                          {day.active ? (
                            <Leaf
                              size={12}
                            />
                          ) : (
                            <Circle
                              size={7}
                            />
                          )}
                        </span>

                        <strong>
                          {shortDay(
                            day.dayKey
                          )}
                        </strong>

                        <small>
                          {day.active
                            ? `${day.categories.length} ${
                                day.categories.length ===
                                1
                                  ? 'tool'
                                  : 'tools'
                              }`
                            : 'Rest'}
                        </small>

                        {isToday && (
                          <b>
                            Today
                          </b>
                        )}
                      </button>
                    );
                  }
                )}
              </div>

              {/* ===========================================
                  SELECTED DAY
              =========================================== */}

              {selectedDay && (
                <div className="sb-day-detail">
                  <div className="sb-day-detail-date">
                    <CalendarDays
                      size={18}
                    />

                    <div>
                      <span>
                        Selected day
                      </span>

                      <strong>
                        {longDay(
                          selectedDay.dayKey
                        )}
                      </strong>
                    </div>
                  </div>

                  {selectedDay.active ? (
                    <div className="sb-day-tools">
                      {selectedDay.categories.map(
                        (
                          category
                        ) => {
                          const meta =
                            CATEGORY_META[
                              category
                            ];

                          if (!meta) {
                            return (
                              <span
                                key={
                                  category
                                }
                              >
                                <Check
                                  size={12}
                                />

                                {
                                  category
                                }
                              </span>
                            );
                          }

                          const Icon =
                            meta.icon;

                          return (
                            <Link
                              key={
                                category
                              }
                              to={
                                meta.path
                              }
                            >
                              <Icon
                                size={13}
                              />

                              {
                                meta.label
                              }

                              <ChevronRight
                                size={12}
                              />
                            </Link>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div className="sb-rest-day">
                      <Leaf
                        size={14}
                      />

                      No tracked study
                      activity on this
                      day.
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* =============================================
                STUDY MIX + NEXT MILESTONE
            ============================================= */}

            <section className="sb-middle-grid">
              {/* ===========================================
                  STUDY MIX
              =========================================== */}

              <article className="sb-study-mix">
                <header className="sb-section-head compact">
                  <div>
                    <span>
                      Study Mix
                    </span>

                    <h2>
                      Where your
                      effort goes
                    </h2>

                    <p>
                      Pick a category
                      to open the tool.
                    </p>
                  </div>

                  <Activity
                    size={19}
                  />
                </header>

                <div className="sb-mix-list">
                  {Object.entries(
                    CATEGORY_META
                  ).map(
                    ([
                      category,
                      meta,
                    ]) => {
                      const count =
                        Number(
                          data
                            ?.categoryDayCounts?.[
                            category
                          ] ||
                            0
                        );

                      const max =
                        Math.max(
                          1,
                          ...Object.values(
                            data
                              ?.categoryDayCounts ||
                              {}
                          ).map(
                            Number
                          )
                        );

                      const width =
                        Math.round(
                          (
                            count /
                            max
                          ) *
                            100
                        );

                      const Icon =
                        meta.icon;

                      return (
                        <Link
                          key={
                            category
                          }
                          to={
                            meta.path
                          }
                        >
                          <span className="sb-mix-icon">
                            <Icon
                              size={15}
                            />
                          </span>

                          <div>
                            <div className="sb-mix-copy">
                              <strong>
                                {
                                  meta.label
                                }
                              </strong>

                              <span>
                                {
                                  count
                                }{' '}
                                day
                                {count ===
                                1
                                  ? ''
                                  : 's'}
                              </span>
                            </div>

                            <div className="sb-mix-progress">
                              <i
                                style={{
                                  width:
                                    `${width}%`,
                                }}
                              />
                            </div>
                          </div>

                          <ChevronRight
                            size={13}
                          />
                        </Link>
                      );
                    }
                  )}
                </div>
              </article>

              {/* ===========================================
                  NEXT BADGE FOCUS
              =========================================== */}

              <article className="sb-next-goal">
                <header className="sb-section-head compact">
                  <div>
                    <span>
                      Next Milestone
                    </span>

                    <h2>
                      Something to
                      work toward
                    </h2>

                    <p>
                      Select a nearby
                      badge to inspect
                      its progress.
                    </p>
                  </div>

                  <Target
                    size={19}
                  />
                </header>

                {focusedBadge ? (
                  <>
                    <div className="sb-focused-badge">
                      <span className="sb-focused-icon">
                        {
                          focusedBadge.icon
                        }
                      </span>

                      <div>
                        <span>
                          Closest unlock
                        </span>

                        <h3>
                          {
                            focusedBadge.title
                          }
                        </h3>

                        <p>
                          {
                            focusedBadge.description
                          }
                        </p>
                      </div>
                    </div>

                    <div className="sb-goal-numbers">
                      <strong>
                        {
                          focusedBadge.value
                        }
                      </strong>

                      <span>
                        /
                      </span>

                      <b>
                        {
                          focusedBadge.target
                        }
                      </b>
                    </div>

                    <div className="sb-goal-progress">
                      <i
                        style={{
                          width:
                            `${badgeProgress(
                              focusedBadge
                            )}%`,
                        }}
                      />
                    </div>

                    <small className="sb-goal-caption">
                      {badgeProgress(
                        focusedBadge
                      )}
                      % complete
                    </small>

                    <div className="sb-next-selector">
                      {nextBadges.map(
                        (
                          badge
                        ) => (
                          <button
                            type="button"
                            key={
                              badge.id
                            }
                            className={
                              focusedBadge.id ===
                              badge.id
                                ? 'active'
                                : ''
                            }
                            onClick={() =>
                              setSelectedBadgeId(
                                badge.id
                              )
                            }
                          >
                            <span>
                              {
                                badge.icon
                              }
                            </span>

                            <div>
                              <strong>
                                {
                                  badge.title
                                }
                              </strong>

                              <small>
                                {
                                  badge.progressPct
                                }
                                %
                              </small>
                            </div>
                          </button>
                        )
                      )}
                    </div>
                  </>
                ) : (
                  <div className="sb-all-done">
                    <Trophy
                      size={27}
                    />

                    <strong>
                      Every current
                      badge is unlocked.
                    </strong>

                    <p>
                      Keep studying —
                      future achievements
                      will appear here.
                    </p>
                  </div>
                )}
              </article>
            </section>

            {/* =============================================
                BADGE CABINET
            ============================================= */}

            <section className="sb-badges">
              <header className="sb-section-head">
                <div>
                  <span>
                    Achievement Shelf
                  </span>

                  <h2>
                    Badges you have
                    grown into
                  </h2>

                  <p>
                    Earned badges stay
                    bright. Locked ones
                    show your next
                    targets.
                  </p>
                </div>

                <Award
                  size={21}
                />
              </header>

              {/* ===========================================
                  BADGE FILTER
              =========================================== */}

              <div className="sb-badge-filter">
                <button
                  type="button"
                  className={
                    badgeFilter ===
                    'all'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setBadgeFilter(
                      'all'
                    )
                  }
                >
                  All

                  <span>
                    {
                      badges.length
                    }
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    badgeFilter ===
                    'earned'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setBadgeFilter(
                      'earned'
                    )
                  }
                >
                  <CheckCircle2
                    size={12}
                  />

                  Earned

                  <span>
                    {
                      earnedBadges.length
                    }
                  </span>
                </button>

                <button
                  type="button"
                  className={
                    badgeFilter ===
                    'locked'
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setBadgeFilter(
                      'locked'
                    )
                  }
                >
                  <Lock
                    size={12}
                  />

                  Locked

                  <span>
                    {
                      lockedBadges.length
                    }
                  </span>
                </button>
              </div>

              <div className="sb-badge-grid">
                {visibleBadges.map(
                  (
                    badge
                  ) => (
                    <button
                      type="button"
                      key={
                        badge.id
                      }
                      className={`sb-badge-entry ${
                        badge.earned
                          ? 'earned'
                          : 'locked'
                      } ${
                        selectedBadgeId ===
                        badge.id
                          ? 'selected'
                          : ''
                      }`}
                      onClick={() =>
                        setSelectedBadgeId(
                          badge.id
                        )
                      }
                    >
                      <span className="sb-badge-symbol">
                        {
                          badge.icon
                        }
                      </span>

                      <div className="sb-badge-copy">
                        <span>
                          {badge.earned
                            ? 'Unlocked'
                            : 'In progress'}
                        </span>

                        <strong>
                          {
                            badge.title
                          }
                        </strong>

                        <p>
                          {
                            badge.description
                          }
                        </p>
                      </div>

                      <div className="sb-badge-status">
                        {badge.earned ? (
                          <CheckCircle2
                            size={16}
                          />
                        ) : (
                          <>
                            <span>
                              {
                                badge.value
                              }
                              /
                              {
                                badge.target
                              }
                            </span>

                            <div>
                              <i
                                style={{
                                  width:
                                    `${badgeProgress(
                                      badge
                                    )}%`,
                                }}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </button>
                  )
                )}
              </div>
            </section>

            {/* =============================================
                CONTINUE STUDYING
            ============================================= */}

            <section className="sb-study-next">
              <div>
                <Sparkles
                  size={17}
                />

                <div>
                  <span>
                    Keep the streak
                    useful
                  </span>

                  <strong>
                    Pick what actually
                    helps your next
                    exam.
                  </strong>
                </div>
              </div>

              <div className="sb-study-next-links">
                <Link to="/questions">
                  Practice questions
                </Link>

                <Link to="/revision-sheets">
                  Revision sheet
                </Link>

                <Link to="/exam-war-room">
                  War Room
                </Link>

                <Link to="/mock-exams">
                  Mock exam
                </Link>
              </div>
            </section>

            {/* =============================================
                METHODOLOGY
            ============================================= */}

            <section className="sb-methodology">
              <Clock3
                size={16}
              />

              <div>
                <strong>
                  What counts as a
                  study day?
                </strong>

                <p>
                  {
                    data
                      ?.methodology
                      ?.activityRule
                  }
                </p>

                <small>
                  {
                    data
                      ?.methodology
                      ?.privacy
                  }
                </small>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}