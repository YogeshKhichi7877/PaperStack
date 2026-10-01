import { OFFICIAL_BRANCHES as OFFICIAL_BRANCHES_CONFIG } from '../config/branches';
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
  Activity,
  ArrowRight,
  Award,
  BookOpenCheck,
  CheckCircle2,
  Crown,
  FileText,
  Medal,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
} from 'lucide-react';

import {
  getBranchCompetition,
} from '../services/branchCompetitionApi';

import './BranchCompetitionPage.css';

/* =========================================================
   OFFICIAL IIIT SURAT BRANCHES

   Keep these names consistent across PaperStack.
========================================================= */

const OFFICIAL_BRANCHES = OFFICIAL_BRANCHES_CONFIG.map(({ key, short, name }) => ({ key, label: key, short, subtitle: name }));

const PERIODS = [
  {
    value: '7d',
    label: '7 Days',
  },
  {
    value: '30d',
    label: '30 Days',
  },
  {
    value: 'all',
    label: 'All Time',
  },
];

/* =========================================================
   NORMALIZATION
========================================================= */

function normalizeText(
  value
) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase()
    .replace(/[_–—]/g, '-')
    .replace(/\s+/g, ' ');
}

function canonicalBranch(
  value
) {
  const branch =
    normalizeText(
      value
    );

  if (
    [
      'cse',
      'computer science',
      'computer science and engineering',
      'computer science & engineering',
    ].includes(branch)
  ) {
    return 'CSE';
  }

  if (
    [
      'cse (ai-ml)',
      'cse ai-ml',
      'cse ai ml',
      'ai-ml',
      'ai ml',
      'aiml',
      'artificial intelligence and machine learning',
      'computer science and engineering (ai-ml)',
      'computer science & engineering (ai-ml)',
    ].includes(branch)
  ) {
    return 'CSE (AI-ML)';
  }

  if (
    [
      'cyber security',
      'cybersecurity',
      'cyber',
      'cse cyber security',
      'cse (cyber security)',
    ].includes(branch)
  ) {
    return 'Cyber Security';
  }

  if (
    [
      'mathematics and computing',
      'mathematics & computing',
      'maths and computing',
      'maths & computing',
      'mnc',
      'mn&c',
      'mac',
    ].includes(branch)
  ) {
    return 'Mathematics and Computing';
  }

  if (
    [
      'ece',
      'electronics and communication engineering',
      'electronics & communication engineering',
    ].includes(branch)
  ) {
    return 'ECE';
  }

  return value;
}

function emptyBranch(
  definition
) {
  return {
    branch:
      definition.label,

    branchKey:
      definition.key,

    short:
      definition.short,

    subtitle:
      definition.subtitle,

    rank: null,

    points: 0,

    approvedPapers: 0,

    approvedSolutions: 0,

    verifications: 0,

    activeContributors: 0,

    topContributors: [],
  };
}

function mergeBranch(
  current,
  incoming
) {
  const contributorMap =
    new Map();

  [
    ...(
      current.topContributors ||
      []
    ),
    ...(
      incoming.topContributors ||
      []
    ),
  ].forEach(
    (contributor) => {
      const id =
        contributor.id ||
        contributor.userId ||
        contributor.name;

      if (!id) {
        return;
      }

      const previous =
        contributorMap.get(
          id
        );

      if (!previous) {
        contributorMap.set(
          id,
          {
            ...contributor,
          }
        );

        return;
      }

      contributorMap.set(
        id,
        {
          ...previous,

          points:
            Number(
              previous.points ||
                0
            ) +
            Number(
              contributor.points ||
                0
            ),
        }
      );
    }
  );

  return {
    ...current,

    points:
      Number(
        current.points ||
          0
      ) +
      Number(
        incoming.points ||
          0
      ),

    approvedPapers:
      Number(
        current.approvedPapers ||
          0
      ) +
      Number(
        incoming.approvedPapers ||
          0
      ),

    approvedSolutions:
      Number(
        current.approvedSolutions ||
          0
      ) +
      Number(
        incoming.approvedSolutions ||
          0
      ),

    verifications:
      Number(
        current.verifications ||
          0
      ) +
      Number(
        incoming.verifications ||
          0
      ),

    activeContributors:
      Number(
        current.activeContributors ||
          0
      ) +
      Number(
        incoming.activeContributors ||
          0
      ),

    topContributors:
      Array.from(
        contributorMap.values()
      )
        .sort(
          (a, b) =>
            Number(
              b.points ||
                0
            ) -
            Number(
              a.points ||
                0
            )
        )
        .slice(
          0,
          3
        )
        .map(
          (
            contributor,
            index
          ) => ({
            ...contributor,

            rank:
              index + 1,
          })
        ),
  };
}

function normalizeLeaderboard(
  leaderboard
) {
  const map =
    new Map(
      OFFICIAL_BRANCHES.map(
        (branch) => [
          branch.key,

          emptyBranch(
            branch
          ),
        ]
      )
    );

  (
    leaderboard ||
    []
  ).forEach(
    (item) => {
      const canonical =
        canonicalBranch(
          item.branch
        );

      const official =
        OFFICIAL_BRANCHES.find(
          (branch) =>
            branch.key ===
            canonical
        );

      if (!official) {
        return;
      }

      const current =
        map.get(
          official.key
        );

      map.set(
        official.key,
        mergeBranch(
          current,
          {
            ...item,

            branch:
              official.label,

            branchKey:
              official.key,

            short:
              official.short,

            subtitle:
              official.subtitle,
          }
        )
      );
    }
  );

  return Array.from(
    map.values()
  )
    .sort(
      (a, b) =>
        Number(
          b.points ||
            0
        ) -
          Number(
            a.points ||
              0
          ) ||
        Number(
          b.approvedPapers ||
            0
        ) -
          Number(
            a.approvedPapers ||
              0
          ) ||
        a.branch.localeCompare(
          b.branch
        )
    )
    .map(
      (
        branch,
        index
      ) => ({
        ...branch,

        rank:
          index + 1,
      })
    );
}

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

function rankIcon(
  rank
) {
  if (rank === 1) {
    return Crown;
  }

  if (
    rank === 2 ||
    rank === 3
  ) {
    return Medal;
  }

  return Award;
}

function branchCodeClass(
  branch
) {
  if (
    branch.branchKey ===
    'CSE (AI-ML)'
  ) {
    return 'aiml';
  }

  if (
    branch.branchKey ===
    'Cyber Security'
  ) {
    return 'cyber';
  }

  if (
    branch.branchKey ===
    'Mathematics and Computing'
  ) {
    return 'mnc';
  }

  if (
    branch.branchKey ===
    'ECE'
  ) {
    return 'ece';
  }

  return 'cse';
}

/* =========================================================
   PAGE
========================================================= */

export default function BranchCompetitionPage({
  toast,
}) {
  const [
    period,
    setPeriod,
  ] =
    useState('30d');

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

  useEffect(() => {
    let mounted =
      true;

    setLoading(true);

    getBranchCompetition(
      period
    )
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
              'Could not load branch rankings.',
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
    toast,
  ]);

  /* =========================================================
     NORMALIZED OFFICIAL BOARD
  ========================================================= */

  const leaderboard =
    useMemo(
      () =>
        normalizeLeaderboard(
          data?.leaderboard ||
            []
        ),
      [data]
    );

  const maxPoints =
    Math.max(
      1,
      ...leaderboard.map(
        (item) =>
          Number(
            item.points ||
              0
          )
      )
    );

  const totalPoints =
    leaderboard.reduce(
      (
        total,
        branch
      ) =>
        total +
        Number(
          branch.points ||
            0
        ),
      0
    );

  const totalContributors =
    leaderboard.reduce(
      (
        total,
        branch
      ) =>
        total +
        Number(
          branch.activeContributors ||
            0
        ),
      0
    );

  const totalPapers =
    leaderboard.reduce(
      (
        total,
        branch
      ) =>
        total +
        Number(
          branch.approvedPapers ||
            0
        ),
      0
    );

  const totalSolutions =
    leaderboard.reduce(
      (
        total,
        branch
      ) =>
        total +
        Number(
          branch.approvedSolutions ||
            0
        ),
      0
    );

  const leader =
    leaderboard[0] ||
    null;

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="bc-page">
      <Helmet>
        <title>
          Branch Rankings -
          PaperStack
        </title>

        <meta
          name="description"
          content="PaperStack contribution rankings across IIIT Surat branches."
        />
      </Helmet>

      <div className="bc-shell">
        {/* =================================================
            LEAGUE HEADER
        ================================================= */}

        <header className="bc-header">
          <div className="bc-header-copy">
            <span className="bc-kicker">
              <Swords
                size={15}
              />

              Branch Rankings
            </span>

            <h1>
              Five branches.
              <br />

              <span>
                One shared
                archive.
              </span>
            </h1>

            <p>
              A friendly
              contribution league
              between IIIT Surat
              branches. Approved
              papers, student
              solutions and archive
              verification activity
              earn community points.
            </p>

            <div className="bc-official-branches">
              {OFFICIAL_BRANCHES.map(
                (branch) => (
                  <span
                    key={
                      branch.key
                    }
                  >
                    {
                      branch.short
                    }
                  </span>
                )
              )}
            </div>
          </div>

          <aside className="bc-season-board">
            <header>
              <span>
                Current season
              </span>

              <Trophy
                size={17}
              />
            </header>

            <div className="bc-season-period">
              {PERIODS.map(
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

            <div className="bc-season-leader">
              <span>
                Leading branch
              </span>

              <strong>
                {loading
                  ? '—'
                  : leader
                    ?.short ||
                    '—'}
              </strong>

              <p>
                {loading
                  ? 'Calculating standings…'
                  : leader
                    ?.branch ||
                    'No activity yet'}
              </p>
            </div>

            <div className="bc-season-total">
              <span>
                League points
              </span>

              <strong>
                {formatNumber(
                  totalPoints
                )}
              </strong>
            </div>
          </aside>
        </header>

        {/* =================================================
            SCORING RULES
        ================================================= */}

        <section className="bc-rules">
          <div className="bc-rules-title">
            <span>
              League scoring
            </span>

            <strong>
              Only useful,
              approved work counts.
            </strong>
          </div>

          <div className="bc-rule-items">
            <div>
              <BookOpenCheck
                size={16}
              />

              <span>
                <strong>
                  +100
                </strong>

                Approved paper
              </span>
            </div>

            <div>
              <FileText
                size={16}
              />

              <span>
                <strong>
                  +35
                </strong>

                Student solution
              </span>
            </div>

            <div>
              <ShieldCheck
                size={16}
              />

              <span>
                <strong>
                  +10
                </strong>

                Verification
              </span>
            </div>
          </div>
        </section>

        {/* =================================================
            LEAGUE SUMMARY
        ================================================= */}

        <section className="bc-summary">
          <div>
            <span>
              Branches
            </span>

            <strong>
              {
                OFFICIAL_BRANCHES.length
              }
            </strong>
          </div>

          <div>
            <span>
              Active
              contributors
            </span>

            <strong>
              {formatNumber(
                totalContributors
              )}
            </strong>
          </div>

          <div>
            <span>
              Approved papers
            </span>

            <strong>
              {formatNumber(
                totalPapers
              )}
            </strong>
          </div>

          <div>
            <span>
              Student solutions
            </span>

            <strong>
              {formatNumber(
                totalSolutions
              )}
            </strong>
          </div>

          <div>
            <span>
              Community points
            </span>

            <strong>
              {formatNumber(
                totalPoints
              )}
            </strong>
          </div>
        </section>

        {/* =================================================
            LEAGUE TABLE
        ================================================= */}

        <section className="bc-league-section">
          <header className="bc-section-heading">
            <div>
              <span>
                Live standings
              </span>

              <h2>
                Branch rankings
              </h2>

              <p>
                Ranking is based on
                approved contribution
                activity during the
                selected period.
              </p>
            </div>

            <Activity
              size={22}
            />
          </header>

          {loading ? (
            <div className="bc-state">
              <span className="bc-loader" />

              <strong>
                Calculating branch
                activity…
              </strong>

              <p>
                Building the five-branch
                standings.
              </p>
            </div>
          ) : (
            <>
              <div className="bc-table-head">
                <span>
                  Pos
                </span>

                <span>
                  Branch
                </span>

                <span>
                  Points
                </span>

                <span>
                  Papers
                </span>

                <span>
                  Solutions
                </span>

                <span>
                  Checks
                </span>

                <span>
                  Contributors
                </span>
              </div>

              <div className="bc-league">
                {leaderboard.map(
                  (branch) => {
                    const RankIcon =
                      rankIcon(
                        branch.rank
                      );

                    const progress =
                      Math.max(
                        branch.points >
                          0
                          ? 4
                          : 0,
                        Math.round(
                          (
                            Number(
                              branch.points ||
                                0
                            ) /
                            maxPoints
                          ) *
                            100
                        )
                      );

                    return (
                      <article
                        className={`bc-league-row ${branchCodeClass(
                          branch
                        )} ${
                          branch.rank ===
                          1
                            ? 'leader'
                            : ''
                        }`}
                        key={
                          branch.branchKey
                        }
                      >
                        {/* ===============================
                            POSITION
                        =============================== */}

                        <div className="bc-position">
                          <RankIcon
                            size={15}
                          />

                          <strong>
                            {String(
                              branch.rank
                            ).padStart(
                              2,
                              '0'
                            )}
                          </strong>
                        </div>

                        {/* ===============================
                            BRANCH
                        =============================== */}

                        <div className="bc-branch">
                          <span className="bc-branch-code">
                            {
                              branch.short
                            }
                          </span>

                          <div>
                            <h3>
                              {
                                branch.branch
                              }
                            </h3>

                            <p>
                              {
                                branch.subtitle
                              }
                            </p>

                            <div className="bc-progress">
                              <i
                                style={{
                                  width:
                                    `${progress}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* ===============================
                            POINTS
                        =============================== */}

                        <div className="bc-points">
                          <strong>
                            {formatNumber(
                              branch.points
                            )}
                          </strong>

                          <span>
                            pts
                          </span>
                        </div>

                        {/* ===============================
                            METRICS
                        =============================== */}

                        <div className="bc-metric">
                          <strong>
                            {formatNumber(
                              branch.approvedPapers
                            )}
                          </strong>

                          <span>
                            Papers
                          </span>
                        </div>

                        <div className="bc-metric">
                          <strong>
                            {formatNumber(
                              branch.approvedSolutions
                            )}
                          </strong>

                          <span>
                            Solutions
                          </span>
                        </div>

                        <div className="bc-metric">
                          <strong>
                            {formatNumber(
                              branch.verifications
                            )}
                          </strong>

                          <span>
                            Checks
                          </span>
                        </div>

                        <div className="bc-metric">
                          <strong>
                            {formatNumber(
                              branch.activeContributors
                            )}
                          </strong>

                          <span>
                            Students
                          </span>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            </>
          )}
        </section>

        {/* =================================================
            BRANCH CONTRIBUTOR BOARDS
        ================================================= */}

        {!loading && (
          <section className="bc-squads">
            <header className="bc-section-heading">
              <div>
                <span>
                  Branch squads
                </span>

                <h2>
                  Students moving
                  each branch forward
                </h2>

                <p>
                  Top contributors
                  currently recorded
                  for each branch.
                </p>
              </div>

              <Users
                size={22}
              />
            </header>

            <div className="bc-squad-grid">
              {leaderboard.map(
                (branch) => (
                  <article
                    key={
                      branch.branchKey
                    }
                    className={`bc-squad ${branchCodeClass(
                      branch
                    )}`}
                  >
                    <header>
                      <span className="bc-squad-code">
                        {
                          branch.short
                        }
                      </span>

                      <div>
                        <strong>
                          {
                            branch.branch
                          }
                        </strong>

                        <span>
                          Rank #
                          {
                            branch.rank
                          }
                        </span>
                      </div>

                      <b>
                        {formatNumber(
                          branch.points
                        )}
                        <small>
                          pts
                        </small>
                      </b>
                    </header>

                    <div className="bc-squad-contributors">
                      {branch
                        .topContributors
                        ?.length ? (
                        branch.topContributors.map(
                          (
                            contributor,
                            index
                          ) => (
                            <div
                              key={
                                contributor.id ||
                                contributor.userId ||
                                `${branch.branchKey}-${contributor.name}-${index}`
                              }
                            >
                              <span>
                                {String(
                                  index +
                                    1
                                ).padStart(
                                  2,
                                  '0'
                                )}
                              </span>

                              <div>
                                <strong>
                                  {
                                    contributor.name
                                  }
                                </strong>

                                <small>
                                  Branch
                                  contributor
                                </small>
                              </div>

                              <b>
                                {formatNumber(
                                  contributor.points
                                )}
                              </b>
                            </div>
                          )
                        )
                      ) : (
                        <div className="bc-no-contributors">
                          <Users
                            size={17}
                          />

                          <span>
                            No qualifying
                            activity in
                            this period.
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                )
              )}
            </div>
          </section>
        )}

        {/* =================================================
            CTA
        ================================================= */}

        <section className="bc-cta">
          <div className="bc-cta-mark">
            <Target
              size={22}
            />
          </div>

          <div>
            <span>
              Help your branch
            </span>

            <h2>
              Add something useful
              to the archive.
            </h2>

            <p>
              Approved papers,
              solutions and
              verification work move
              your branch forward
              while helping students
              across IIIT Surat.
            </p>
          </div>

          <div className="bc-cta-actions">
            <Link to="/contribute">
              Contribute paper

              <ArrowRight
                size={13}
              />
            </Link>

            <Link to="/verify-archive">
              Verify Papers
            </Link>
          </div>
        </section>

        {/* =================================================
            METHODOLOGY
        ================================================= */}

        <section className="bc-method">
          <CheckCircle2
            size={16}
          />

          <div>
            <strong>
              Fair scoring
            </strong>

            <p>
              {data
                ?.methodology
                ?.sharedBranch ||
                'Shared contributions should be distributed using the same backend scoring rules instead of being counted twice.'}
            </p>

            <small>
              {data
                ?.methodology
                ?.disclaimer ||
                'The league measures PaperStack contribution activity, not academic performance or branch quality.'}
            </small>
          </div>
        </section>

        {/* =================================================
            COMMUNITY NOTE
        ================================================= */}

        <footer className="bc-community-note">
          <Sparkles
            size={16}
          />

          <p>
            CSE · CSE (AI-ML) ·
            Cyber Security ·
            Mathematics and
            Computing · ECE
          </p>
        </footer>
      </div>
    </main>
  );
}
