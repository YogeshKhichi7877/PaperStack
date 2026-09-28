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
  useNavigate,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FilePlus2,
  Flame,
  GraduationCap,
  HeartHandshake,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';

import {
  fetchPaperBounties,
  requestPaperBounty,
} from '../services/bountyApi';
import { OFFICIAL_BRANCHES } from '../config/branches';

import './PaperBountiesPage.css';

/* =========================================================
   HELPERS
========================================================= */

function normalize(value) {
  return String(
    value || ''
  )
    .toLowerCase()
    .trim();
}

function bountyLevelClass(
  level
) {
  if (level === 'hot') {
    return 'hot';
  }

  if (level === 'high') {
    return 'high';
  }

  if (level === 'requested') {
    return 'requested';
  }

  return 'open';
}

function formatNumber(value) {
  return Number(
    value || 0
  ).toLocaleString('en-IN');
}

function demandLabel(
  requestCount
) {
  if (requestCount >= 10) {
    return 'High demand';
  }

  if (requestCount >= 5) {
    return 'Growing demand';
  }

  if (requestCount > 0) {
    return 'Requested';
  }

  return 'Open request';
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function PaperBountiesPage({
  user,
  toast,
}) {
  const navigate =
    useNavigate();

  const [
    data,
    setData,
  ] = useState({
    summary: null,
    missingPapers: [],
  });

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    requestingKey,
    setRequestingKey,
  ] = useState('');

  const [
    branchFilter,
    setBranchFilter,
  ] = useState('All');

  const [
    semesterFilter,
    setSemesterFilter,
  ] = useState('All');

  const [
    examTypeFilter,
    setExamTypeFilter,
  ] = useState('All');

  const [
    yearFilter,
    setYearFilter,
  ] = useState('All');

  const [
    priorityFilter,
    setPriorityFilter,
  ] = useState('All');

  const [
    sortBy,
    setSortBy,
  ] = useState('demand');

  const [
    searchTerm,
    setSearchTerm,
  ] = useState('');

  /* =========================================================
     LOAD
  ========================================================= */

  const loadBounties =
    useCallback(
      async () => {
        setLoading(true);

        try {
          const payload =
            await fetchPaperBounties();

          setData({
            summary:
              payload?.summary ||
              null,

            missingPapers:
              Array.isArray(
                payload?.missingPapers
              )
                ? payload.missingPapers
                : [],
          });
        } catch (error) {
          console.error(
            'Paper bounties load failed:',
            error
          );

          setData({
            summary: null,
            missingPapers: [],
          });

          toast?.(
            'Failed to load paper bounties',
            'error'
          );
        } finally {
          setLoading(false);
        }
      },
      [toast]
    );

  useEffect(() => {
    loadBounties();
  }, [loadBounties]);

  /* =========================================================
     FILTER OPTIONS
  ========================================================= */

  const availableYears =
    useMemo(() => {
      return Array.from(
        new Set(
          data.missingPapers
            .map(
              (item) =>
                Number(
                  item.year
                )
            )
            .filter(Boolean)
        )
      ).sort(
        (a, b) =>
          b - a
      );
    }, [
      data.missingPapers,
    ]);

  /* =========================================================
     FILTER / SORT
  ========================================================= */

  const visibleBounties =
    useMemo(() => {
      const filtered =
        data.missingPapers.filter(
          (item) => {
            const searchPool =
              [
                item.subject,
                item.subjectCode,
                item.shortCode,
                item.branch,
                item.examType,
                item.year,
                `semester ${item.semester}`,
                `sem ${item.semester}`,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            return (
              (
                branchFilter ===
                  'All' ||
                item.branch ===
                  branchFilter
              ) &&
              (
                semesterFilter ===
                  'All' ||
                Number(
                  item.semester
                ) ===
                  Number(
                    semesterFilter
                  )
              ) &&
              (
                examTypeFilter ===
                  'All' ||
                item.examType ===
                  examTypeFilter
              ) &&
              (
                yearFilter ===
                  'All' ||
                Number(
                  item.year
                ) ===
                  Number(
                    yearFilter
                  )
              ) &&
              (
                priorityFilter ===
                  'All' ||
                item.priority ===
                  priorityFilter
              ) &&
              (
                !searchTerm.trim() ||
                searchPool.includes(
                  normalize(
                    searchTerm
                  )
                )
              )
            );
          }
        );

      return [
        ...filtered,
      ].sort(
        (a, b) => {
          if (
            sortBy ===
            'reward'
          ) {
            return (
              Number(
                b.rewardXp ||
                  0
              ) -
              Number(
                a.rewardXp ||
                  0
              )
            );
          }

          if (
            sortBy ===
            'year'
          ) {
            return (
              Number(
                b.year ||
                  0
              ) -
              Number(
                a.year ||
                  0
              )
            );
          }

          if (
            sortBy ===
            'subject'
          ) {
            return String(
              a.subject ||
                ''
            ).localeCompare(
              String(
                b.subject ||
                  ''
              )
            );
          }

          const demandDifference =
            Number(
              b.requestCount ||
                0
            ) -
            Number(
              a.requestCount ||
                0
            );

          if (
            demandDifference
          ) {
            return demandDifference;
          }

          return (
            Number(
              b.rewardXp ||
                0
            ) -
            Number(
              a.rewardXp ||
                0
            )
          );
        }
      );
    }, [
      data.missingPapers,
      branchFilter,
      semesterFilter,
      examTypeFilter,
      yearFilter,
      priorityFilter,
      sortBy,
      searchTerm,
    ]);

  /* =========================================================
     SUMMARY
  ========================================================= */

  const summary =
    data.summary || {};

  const totalDemand =
    Number(
      summary.totalRequests ||
        data.missingPapers.reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.requestCount ||
                0
            ),
          0
        )
    );

  const hotBounties =
    Number(
      summary.hotBounties ||
        data.missingPapers.filter(
          (item) =>
            item.demandLevel ===
              'hot' ||
            item.demandLevel ===
              'high'
        ).length
    );

  const maxRewardXp =
    Number(
      summary.maxRewardXp ||
        Math.max(
          0,
          ...data.missingPapers.map(
            (item) =>
              Number(
                item.rewardXp ||
                  0
              )
          )
        )
    );

  const highestDemand =
    useMemo(
      () =>
        Math.max(
          1,
          ...visibleBounties.map(
            (item) =>
              Number(
                item.requestCount ||
                  0
              )
          )
        ),
      [visibleBounties]
    );

  const mostWanted =
    useMemo(() => {
      return [
        ...data.missingPapers,
      ]
        .sort(
          (a, b) =>
            Number(
              b.requestCount ||
                0
            ) -
              Number(
                a.requestCount ||
                  0
              ) ||
            Number(
              b.rewardXp ||
                0
            ) -
              Number(
                a.rewardXp ||
                  0
              )
        )
        .slice(0, 3);
    }, [
      data.missingPapers,
    ]);

  const activeFilterCount =
    [
      branchFilter !==
        'All',
      semesterFilter !==
        'All',
      examTypeFilter !==
        'All',
      yearFilter !==
        'All',
      priorityFilter !==
        'All',
      Boolean(
        searchTerm.trim()
      ),
    ].filter(Boolean).length;

  /* =========================================================
     ACTIONS
  ========================================================= */

  const openContribution =
    (item) => {
      const params =
        new URLSearchParams({
          branch:
            item.branch ||
            'CSE',

          semester:
            String(
              item.semester ||
                ''
            ),

          subject:
            item.subject ||
            '',

          subjectCode:
            item.subjectCode ||
            item.shortCode ||
            '',

          examType:
            item.examType ||
            '',

          year:
            String(
              item.year ||
                ''
            ),

          bounty:
            '1',

          bountyReward:
            String(
              item.rewardXp ||
                0
            ),
        });

      if (
        item.requestId
      ) {
        params.set(
          'requestId',
          String(
            item.requestId
          )
        );
      }

      const destination =
        `/contribute?${params.toString()}`;

      if (!user) {
        navigate(
          `/login?redirect=${encodeURIComponent(
            destination
          )}`
        );

        return;
      }

      navigate(
        destination
      );
    };

  const handleNeedThis =
    async (item) => {
      if (!user) {
        navigate(
          `/login?redirect=${encodeURIComponent(
            '/missing-papers'
          )}`
        );

        return;
      }

      const key =
        item.requestKey ||
        `${item.branch}-${item.semester}-${item.subject}-${item.examType}-${item.year}`;

      setRequestingKey(
        key
      );

      try {
        const result =
          await requestPaperBounty(
            item
          );

        toast?.(
          result?.message ||
            'Your request was counted.',
          result?.alreadyRequested
            ? 'info'
            : 'success'
        );

        await loadBounties();
      } catch (error) {
        toast?.(
          error.response?.data
            ?.error ||
            'Could not request this paper',
          'error'
        );
      } finally {
        setRequestingKey(
          ''
        );
      }
    };

  const clearFilters =
    () => {
      setBranchFilter(
        'All'
      );

      setSemesterFilter(
        'All'
      );

      setExamTypeFilter(
        'All'
      );

      setYearFilter(
        'All'
      );

      setPriorityFilter(
        'All'
      );

      setSortBy(
        'demand'
      );

      setSearchTerm('');
    };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="bounty-page">
      <Helmet>
        <title>
          Paper Bounties -
          PaperStack
        </title>

        <meta
          name="description"
          content="Request missing IIIT Surat papers, see what students need most, and earn bonus XP by completing PaperStack bounties."
        />
      </Helmet>

      <div className="bounty-shell">
        {/* =================================================
            BACK
        ================================================= */}

        <Link
          to="/"
          className="bounty-back-link"
        >
          <ArrowLeft
            size={14}
          />

          Back to archive
        </Link>

        {/* =================================================
            HERO
        ================================================= */}

        <section className="bounty-hero">
          <div className="bounty-hero-copy">
            <span className="bounty-eyebrow">
              <HeartHandshake
                size={15}
              />

              Community Bounties
            </span>

            <h1>
              Fill the gaps
              <br />

              <span>
                students are
                waiting for.
              </span>
            </h1>

            <p>
              Students request papers
              that are missing from the
              archive. Demand rises,
              rewards grow, and the
              contributor who fills the
              gap earns bonus XP.
            </p>

            <div className="bounty-hero-points">
              <span>
                <CheckCircle2
                  size={14}
                />

                Real student demand
              </span>

              <span>
                <CheckCircle2
                  size={14}
                />

                Bonus contributor XP
              </span>

              <span>
                <CheckCircle2
                  size={14}
                />

                Helps future batches
              </span>
            </div>

            <div className="bounty-hero-actions">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(
                      'paper-bounty-list'
                    )
                    ?.scrollIntoView({
                      behavior:
                        'smooth',
                    })
                }
              >
                Browse open bounties

                <ArrowRight
                  size={14}
                />
              </button>

              <Link to="/contributors">
                Contributor ranks
              </Link>
            </div>
          </div>

          <aside className="bounty-mission">
            <span>
              Highest active reward
            </span>

            <strong>
              +
              {formatNumber(
                maxRewardXp
              )}
              <small>
                XP
              </small>
            </strong>

            <p>
              Complete the missing
              archive slot and get the
              approved paper reward plus
              the bounty bonus.
            </p>

            <div className="bounty-mission-meta">
              <span>
                <b>
                  {formatNumber(
                    data.missingPapers
                      .length
                  )}
                </b>

                Open slots
              </span>

              <span>
                <b>
                  {formatNumber(
                    totalDemand
                  )}
                </b>

                Requests
              </span>
            </div>
          </aside>
        </section>

        {/* =================================================
            HOW IT WORKS
        ================================================= */}

        <section className="bounty-flow">
          <div className="bounty-flow-intro">
            <span>
              How bounties work
            </span>

            <strong>
              Community demand decides
              what the archive needs
              next.
            </strong>
          </div>

          <div className="bounty-flow-steps">
            <div>
              <span>01</span>

              <div>
                <strong>
                  Request
                </strong>

                <small>
                  A student marks a
                  missing paper.
                </small>
              </div>
            </div>

            <i />

            <div>
              <span>02</span>

              <div>
                <strong>
                  Demand grows
                </strong>

                <small>
                  More requests increase
                  importance.
                </small>
              </div>
            </div>

            <i />

            <div>
              <span>03</span>

              <div>
                <strong>
                  Someone uploads
                </strong>

                <small>
                  A contributor fills
                  the archive gap.
                </small>
              </div>
            </div>

            <i />

            <div>
              <span>04</span>

              <div>
                <strong>
                  Earn XP
                </strong>

                <small>
                  Approval completes the
                  bounty.
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            STATS
        ================================================= */}

        <section className="bounty-stats">
          <article>
            <span className="bounty-stat-icon">
              <BookOpen
                size={19}
              />
            </span>

            <div>
              <span>
                Open bounties
              </span>

              <strong>
                {formatNumber(
                  summary.totalMissing ||
                    data.missingPapers
                      .length
                )}
              </strong>

              <p>
                Missing archive slots
              </p>
            </div>
          </article>

          <article>
            <span className="bounty-stat-icon blue">
              <Users
                size={19}
              />
            </span>

            <div>
              <span>
                Student requests
              </span>

              <strong>
                {formatNumber(
                  totalDemand
                )}
              </strong>

              <p>
                Demand signals
              </p>
            </div>
          </article>

          <article>
            <span className="bounty-stat-icon orange">
              <Flame
                size={19}
              />
            </span>

            <div>
              <span>
                High demand
              </span>

              <strong>
                {formatNumber(
                  hotBounties
                )}
              </strong>

              <p>
                Popular missing papers
              </p>
            </div>
          </article>

          <article>
            <span className="bounty-stat-icon green">
              <Target
                size={19}
              />
            </span>

            <div>
              <span>
                High priority
              </span>

              <strong>
                {formatNumber(
                  summary.highPriority ||
                    0
                )}
              </strong>

              <p>
                Important archive gaps
              </p>
            </div>
          </article>
        </section>

        {/* =================================================
            MOST WANTED
        ================================================= */}

        {!!mostWanted.length && (
          <section className="bounty-most-wanted">
            <header>
              <div>
                <span className="bounty-eyebrow">
                  <Flame
                    size={14}
                  />

                  Most Wanted
                </span>

                <h2>
                  Papers students are
                  asking for right now.
                </h2>

                <p>
                  The strongest current
                  demand signals across
                  the archive.
                </p>
              </div>
            </header>

            <div className="bounty-wanted-grid">
              {mostWanted.map(
                (
                  item,
                  index
                ) => (
                  <button
                    type="button"
                    key={
                      item.requestKey ||
                      `${item.subject}-${item.year}-${index}`
                    }
                    onClick={() => {
                      setSearchTerm(
                        item.subject ||
                          item.subjectCode ||
                          ''
                      );

                      document
                        .getElementById(
                          'paper-bounty-list'
                        )
                        ?.scrollIntoView({
                          behavior:
                            'smooth',
                        });
                    }}
                  >
                    <span className="bounty-wanted-rank">
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        '0'
                      )}
                    </span>

                    <div>
                      <span>
                        {item.subjectCode ||
                          item.shortCode ||
                          'Paper'}
                      </span>

                      <strong>
                        {
                          item.subject
                        }
                      </strong>

                      <small>
                        {
                          item.requestCount ||
                          0
                        }{' '}
                        student
                        {Number(
                          item.requestCount ||
                            0
                        ) === 1
                          ? ''
                          : 's'}{' '}
                        waiting
                      </small>
                    </div>

                    <b>
                      +
                      {formatNumber(
                        item.rewardXp ||
                          300
                      )}
                      XP
                    </b>

                    <ChevronRight
                      size={15}
                    />
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {/* =================================================
            FILTERS
        ================================================= */}

        <section
          className="bounty-controls"
          id="paper-bounty-list"
        >
          <div className="bounty-controls-head">
            <div>
              <span className="bounty-eyebrow">
                <SlidersHorizontal
                  size={14}
                />

                Bounty Board
              </span>

              <h2>
                {visibleBounties.length}{' '}
                open opportunit
                {visibleBounties.length ===
                1
                  ? 'y'
                  : 'ies'}
              </h2>

              <p>
                Filter the board to find
                papers you may already
                have.
              </p>
            </div>

            <button
              type="button"
              className="bounty-refresh"
              onClick={
                loadBounties
              }
            >
              <RefreshCw
                size={13}
              />

              Refresh
            </button>
          </div>

          <div className="bounty-filter-grid">
            <label>
              <span>
                Branch
              </span>

              <select
                value={
                  branchFilter
                }
                onChange={(
                  event
                ) =>
                  setBranchFilter(
                    event.target
                      .value
                  )
                }
              >
                <option value="All">
                  All branches
                </option>

                {OFFICIAL_BRANCHES.map(({ key, name }) => <option key={key} value={key}>{name}</option>)}
              </select>
            </label>

            <label>
              <span>
                Semester
              </span>

              <select
                value={
                  semesterFilter
                }
                onChange={(
                  event
                ) =>
                  setSemesterFilter(
                    event.target
                      .value
                  )
                }
              >
                <option value="All">
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
                  (sem) => (
                    <option
                      key={sem}
                      value={sem}
                    >
                      Semester{' '}
                      {sem}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Exam
              </span>

              <select
                value={
                  examTypeFilter
                }
                onChange={(
                  event
                ) =>
                  setExamTypeFilter(
                    event.target
                      .value
                  )
                }
              >
                <option value="All">
                  All exam types
                </option>

                <option value="Mid-Sem">
                  Mid-Sem
                </option>

                <option value="End-Sem">
                  End-Sem
                </option>
              </select>
            </label>

            <label>
              <span>
                Year
              </span>

              <select
                value={
                  yearFilter
                }
                onChange={(
                  event
                ) =>
                  setYearFilter(
                    event.target
                      .value
                  )
                }
              >
                <option value="All">
                  All years
                </option>

                {availableYears.map(
                  (year) => (
                    <option
                      key={
                        year
                      }
                      value={
                        year
                      }
                    >
                      {year}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Priority
              </span>

              <select
                value={
                  priorityFilter
                }
                onChange={(
                  event
                ) =>
                  setPriorityFilter(
                    event.target
                      .value
                  )
                }
              >
                <option value="All">
                  All priorities
                </option>

                <option value="High">
                  High priority
                </option>

                <option value="Medium">
                  Medium priority
                </option>

                <option value="Low">
                  Low priority
                </option>
              </select>
            </label>

            <label>
              <span>
                Sort
              </span>

              <select
                value={sortBy}
                onChange={(
                  event
                ) =>
                  setSortBy(
                    event.target
                      .value
                  )
                }
              >
                <option value="demand">
                  Most requested
                </option>

                <option value="reward">
                  Highest XP
                </option>

                <option value="year">
                  Newest year
                </option>

                <option value="subject">
                  Subject A–Z
                </option>
              </select>
            </label>

            <label className="bounty-search">
              <span>
                Search
              </span>

              <div>
                <Search
                  size={15}
                />

                <input
                  value={
                    searchTerm
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchTerm(
                      event.target
                        .value
                    )
                  }
                  placeholder="Subject, code, year..."
                />

                {searchTerm && (
                  <button
                    type="button"
                    onClick={() =>
                      setSearchTerm(
                        ''
                      )
                    }
                    aria-label="Clear search"
                  >
                    <X
                      size={13}
                    />
                  </button>
                )}
              </div>
            </label>

            <button
              type="button"
              className="bounty-clear"
              onClick={
                clearFilters
              }
            >
              <X size={13} />

              Clear

              {activeFilterCount >
                0 && (
                <b>
                  {
                    activeFilterCount
                  }
                </b>
              )}
            </button>
          </div>
        </section>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <section className="bounty-loading">
            <span className="bounty-loader" />

            <strong>
              Loading community
              demand…
            </strong>

            <p>
              Checking open archive
              gaps and current rewards.
            </p>
          </section>
        ) : visibleBounties.length ? (
          /* ===============================================
             BOUNTY BOARD
          =============================================== */

          <section className="bounty-board">
            <header className="bounty-board-header">
              <span>
                #
              </span>

              <span>
                Missing paper
              </span>

              <span>
                Demand
              </span>

              <span>
                Reward
              </span>

              <span>
                Action
              </span>
            </header>

            <div className="bounty-board-list">
              {visibleBounties.map(
                (
                  item,
                  index
                ) => {
                  const itemKey =
                    item.requestKey ||
                    `${item.branch}-${item.semester}-${item.subject}-${item.examType}-${item.year}-${index}`;

                  const requestCount =
                    Number(
                      item.requestCount ||
                        0
                    );

                  const demandPercent =
                    Math.min(
                      100,
                      Math.max(
                        5,
                        Math.round(
                          (
                            requestCount /
                            highestDemand
                          ) *
                            100
                        )
                      )
                    );

                  const level =
                    bountyLevelClass(
                      item.demandLevel
                    );

                  return (
                    <article
                      className={`bounty-row ${level}`}
                      key={
                        itemKey
                      }
                    >
                      {/* ===================================
                          RANK
                      =================================== */}

                      <div className="bounty-row-index">
                        <span>
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            '0'
                          )}
                        </span>

                        {level ===
                          'hot' && (
                          <Flame
                            size={13}
                          />
                        )}
                      </div>

                      {/* ===================================
                          PAPER
                      =================================== */}

                      <div className="bounty-paper">
                        <div className="bounty-paper-head">
                          <span
                            className={`bounty-demand-label ${level}`}
                          >
                            {item.demandLabel ||
                              demandLabel(
                                requestCount
                              )}
                          </span>

                          <span className="bounty-paper-year">
                            {
                              item.year
                            }
                          </span>
                        </div>

                        <h3>
                          {
                            item.subject
                          }
                        </h3>

                        <p>
                          {item.subjectCode ||
                            item.shortCode ||
                            'IIIT Surat paper'}
                        </p>

                        <div className="bounty-meta">
                          <span>
                            {
                              item.branch
                            }
                          </span>

                          <span>
                            Sem{' '}
                            {
                              item.semester
                            }
                          </span>

                          <span>
                            {
                              item.examType
                            }
                          </span>

                          <span>
                            {
                              item.priority
                            }{' '}
                            priority
                          </span>
                        </div>
                      </div>

                      {/* ===================================
                          DEMAND
                      =================================== */}

                      <div className="bounty-demand">
                        <div className="bounty-demand-number">
                          <strong>
                            {
                              requestCount
                            }
                          </strong>

                          <span>
                            student
                            {requestCount ===
                            1
                              ? ''
                              : 's'}
                          </span>
                        </div>

                        <div className="bounty-demand-track">
                          <span
                            style={{
                              width:
                                `${demandPercent}%`,
                            }}
                          />
                        </div>

                        <small>
                          {requestCount
                            ? 'waiting for this paper'
                            : 'no requests yet'}
                        </small>
                      </div>

                      {/* ===================================
                          REWARD
                      =================================== */}

                      <div className="bounty-reward">
                        <strong>
                          +
                          {formatNumber(
                            item.rewardXp ||
                              300
                          )}
                          <small>
                            XP
                          </small>
                        </strong>

                        <div>
                          <span>
                            Paper
                            <b>
                              +
                              {Number(
                                item.approvedPaperXp ||
                                  100
                              )}
                            </b>
                          </span>

                          <span>
                            Fulfill
                            <b>
                              +
                              {Number(
                                item.fulfillmentXp ||
                                  200
                              )}
                            </b>
                          </span>

                          {Number(
                            item.bountyBonusXp ||
                              0
                          ) >
                            0 && (
                            <span>
                              Bonus
                              <b>
                                +
                                {Number(
                                  item.bountyBonusXp ||
                                    0
                                )}
                              </b>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* ===================================
                          ACTIONS
                      =================================== */}

                      <div className="bounty-row-actions">
                        <button
                          type="button"
                          className="bounty-have-btn"
                          onClick={() =>
                            openContribution(
                              item
                            )
                          }
                        >
                          <FilePlus2
                            size={14}
                          />

                          I have this

                          <ArrowRight
                            size={13}
                          />
                        </button>

                        <button
                          type="button"
                          className="bounty-need-btn"
                          disabled={
                            requestingKey ===
                            itemKey
                          }
                          onClick={() =>
                            handleNeedThis(
                              item
                            )
                          }
                        >
                          <Users
                            size={13}
                          />

                          {requestingKey ===
                          itemKey
                            ? 'Counting…'
                            : 'I need this'}
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          </section>
        ) : (
          /* ===============================================
             EMPTY
          =============================================== */

          <section className="bounty-empty">
            <span>
              <CircleAlert
                size={27}
              />
            </span>

            <h2>
              No bounties match these
              filters.
            </h2>

            <p>
              Try clearing the filters
              or refresh the community
              board.
            </p>

            <button
              type="button"
              onClick={
                clearFilters
              }
            >
              Clear filters
            </button>
          </section>
        )}

        {/* =================================================
            CONTRIBUTOR CTA
        ================================================= */}

        {!loading &&
          data.missingPapers
            .length >
            0 && (
          <section className="bounty-contributor-cta">
            <span className="bounty-cta-icon">
              <Award
                size={23}
              />
            </span>

            <div>
              <span>
                Have old papers sitting
                in Drive or WhatsApp?
              </span>

              <h2>
                Your forgotten PDF may
                be exactly what someone
                is looking for.
              </h2>

              <p>
                Upload it to PaperStack,
                help the next batch and
                build your contributor
                profile at the same
                time.
              </p>
            </div>

            <Link to="/contribute">
              Contribute a paper

              <ArrowRight
                size={14}
              />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
