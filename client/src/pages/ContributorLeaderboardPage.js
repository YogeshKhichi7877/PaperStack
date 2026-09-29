// ContributorLeaderboardPage.js

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
  ArrowRight,
  Award,
  BookOpen,
  FileText,
  FolderUp,
  HeartHandshake,
  LibraryBig,
  Search,
  Sparkles,
  Target,
  Trophy,
  X,
} from 'lucide-react';

import {
  getContributorLeaderboard,
  getMyContributorProfile,
} from '../services/contributorApi';

import './ContributorPages.css';

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

function Avatar({
  profile,
  large = false,
}) {
  const initial =
    String(
      profile?.name ||
        'C'
    )
      .trim()
      .charAt(0)
      .toUpperCase();

  if (profile?.avatar) {
    return (
      <img
        className={`contributor-avatar ${
          large
            ? 'large'
            : ''
        }`}
        src={profile.avatar}
        alt=""
      />
    );
  }

  return (
    <span
      className={`contributor-avatar contributor-avatar-fallback ${
        large
          ? 'large'
          : ''
      }`}
    >
      {initial}
    </span>
  );
}

function RankMark({
  rank,
  large = false,
}) {
  const top =
    Number(rank) <= 3;

  return (
    <span
      className={`contributor-rank-mark ${
        top ? 'top' : ''
      } ${
        large
          ? 'large'
          : ''
      } rank-${rank}`}
    >
      {top
        ? String(
            rank
          ).padStart(
            2,
            '0'
          )
        : `#${rank}`}
    </span>
  );
}

function getPrimaryBadge(
  profile
) {
  return (
    profile?.badges?.[0] ||
    'Contributor'
  );
}

function compareProfiles(
  a,
  b,
  mode
) {
  if (
    mode === 'impact'
  ) {
    return (
      Number(
        b.totalImpact ||
          0
      ) -
      Number(
        a.totalImpact ||
          0
      )
    );
  }

  if (
    mode === 'papers'
  ) {
    return (
      Number(
        b.approvedPapers ||
          0
      ) -
      Number(
        a.approvedPapers ||
          0
      )
    );
  }

  if (
    mode === 'resources'
  ) {
    return (
      Number(
        b.approvedResources ||
          0
      ) -
      Number(
        a.approvedResources ||
          0
      )
    );
  }

  return (
    Number(
      b.xp || 0
    ) -
    Number(
      a.xp || 0
    )
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function ContributorLeaderboardPage({
  user,
  toast,
}) {
  const [
    leaderboard,
    setLeaderboard,
  ] =
    useState([]);

  const [
    myProfile,
    setMyProfile,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    sortBy,
    setSortBy,
  ] =
    useState('xp');

  /* =========================================================
     LOAD
  ========================================================= */

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);

      try {
        const [
          leaderboardResult,
          ownResult,
        ] =
          await Promise.allSettled(
            [
              getContributorLeaderboard(),

              user
                ? getMyContributorProfile()
                : Promise.resolve(
                    null
                  ),
            ]
          );

        if (!active) {
          return;
        }

        if (
          leaderboardResult.status ===
          'fulfilled'
        ) {
          setLeaderboard(
            Array.isArray(
              leaderboardResult.value
            )
              ? leaderboardResult.value
              : []
          );
        } else {
          setLeaderboard(
            []
          );

          toast?.(
            'Failed to load contributor leaderboard',
            'error'
          );
        }

        if (
          ownResult.status ===
          'fulfilled'
        ) {
          setMyProfile(
            ownResult.value ||
              null
          );
        }
      } finally {
        if (active) {
          setLoading(
            false
          );
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [
    user,
    toast,
  ]);

  /* =========================================================
     STATS
  ========================================================= */

  const archiveImpact =
    useMemo(
      () =>
        leaderboard.reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.totalImpact ||
                0
            ),
          0
        ),
      [leaderboard]
    );

  const totalApproved =
    useMemo(
      () =>
        leaderboard.reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.approvedPapers ||
                0
            ),
          0
        ),
      [leaderboard]
    );

  const totalResources =
    useMemo(
      () =>
        leaderboard.reduce(
          (
            sum,
            item
          ) =>
            sum +
            Number(
              item.approvedResources ||
                0
            ),
          0
        ),
      [leaderboard]
    );


  const topThree =
    useMemo(
      () =>
        leaderboard
          .slice()
          .sort(
            (
              a,
              b
            ) =>
              Number(
                a.rank ||
                  99999
              ) -
              Number(
                b.rank ||
                  99999
              )
          )
          .slice(
            0,
            3
          ),
      [leaderboard]
    );

  const maxXp =
    useMemo(
      () =>
        Math.max(
          1,
          ...leaderboard.map(
            (item) =>
              Number(
                item.xp ||
                  0
              )
          )
        ),
      [leaderboard]
    );

  /* =========================================================
     FILTERED BOARD
  ========================================================= */

  const visibleLeaderboard =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toLowerCase();

      return leaderboard
        .filter(
          (profile) => {
            if (
              !needle
            ) {
              return true;
            }

            const haystack =
              [
                profile.name,
                ...(profile.badges ||
                  []),
              ]
                .filter(
                  Boolean
                )
                .join(
                  ' '
                )
                .toLowerCase();

            return haystack.includes(
              needle
            );
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            compareProfiles(
              a,
              b,
              sortBy
            )
        );
    }, [
      leaderboard,
      search,
      sortBy,
    ]);

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="contributor-page-shell">
      <Helmet>
        <title>
          Contributors -
          PaperStack
        </title>

        <meta
          name="description"
          content="PaperStack contributor honor board for students building the IIIT Surat academic archive."
        />
      </Helmet>

      {/* ===================================================
          EDITORIAL HEADER
      =================================================== */}

      <section className="contributor-honor-header">
        <div className="contributor-honor-copy">
          <span className="contributor-eyebrow">
            <HeartHandshake
              size={15}
            />

            PaperStack Community
          </span>

          <h1>
            The people
            <br />

            <span>
              behind the archive.
            </span>
          </h1>

          <p>
            Every approved paper,
            solution and study resource
            adds something useful to the
            archive. This board
            recognizes the students who
            keep building it.
          </p>

          <div className="contributor-hero-actions">
            <Link
              className="contributor-primary-action"
              to="/contribute"
            >
              Contribute paper

              <ArrowRight
                size={14}
              />
            </Link>

            <Link
              className="contributor-secondary-action"
              to="/contribute-resource"
            >
              Share resource
            </Link>

            {user && (
              <Link
                className="contributor-secondary-action"
                to="/contributors/me"
              >
                My profile
              </Link>
            )}
          </div>
        </div>

        <div className="contributor-archive-ledger">
          <header>
            <span>
              Community ledger
            </span>

            <LibraryBig
              size={18}
            />
          </header>

          <div>
            <span>
              Contributors
            </span>

            <strong>
              {formatNumber(
                leaderboard.length
              )}
            </strong>
          </div>

          <div>
            <span>
              Papers
            </span>

            <strong>
              {formatNumber(
                totalApproved
              )}
            </strong>
          </div>

          <div>
            <span>
              Resources
            </span>

            <strong>
              {formatNumber(
                totalResources
              )}
            </strong>
          </div>

          <div>
            <span>
              Community impact
            </span>

            <strong>
              {formatNumber(
                archiveImpact
              )}
            </strong>
          </div>
        </div>
      </section>

      {/* ===================================================
          WHAT COUNTS
      =================================================== */}

      <section className="contributor-score-strip">
        <div className="contributor-score-title">
          <span>
            What builds XP?
          </span>

          <strong>
            Useful work,
            not activity for
            activity's sake.
          </strong>
        </div>

        <div className="contributor-score-items">
          <div>
            <BookOpen
              size={16}
            />

            <span>
              <strong>
                Papers
              </strong>

              Approved PYQs
            </span>
          </div>

          <div>
            <FileText
              size={16}
            />

            <span>
              <strong>
                Solutions
              </strong>

              Helpful answers
            </span>
          </div>

          <div>
            <FolderUp
              size={16}
            />

            <span>
              <strong>
                Resources
              </strong>

              Notes & sheets
            </span>
          </div>

          <div>
            <Target
              size={16}
            />

            <span>
              <strong>
                Requests
              </strong>

              Filled gaps
            </span>
          </div>
        </div>
      </section>

      {/* ===================================================
          MY CONTRIBUTOR PASS
      =================================================== */}

      {myProfile && (
        <section className="my-impact-card">
          <div className="my-impact-rank">
            <span>
              My rank
            </span>

            <strong>
              {myProfile.rank
                ? `#${myProfile.rank}`
                : '—'}
            </strong>
          </div>

          <div className="my-impact-identity">
            <Avatar
              profile={
                myProfile
              }
              large
            />

            <div>
              <span>
                Contributor pass
              </span>

              <h2>
                {
                  myProfile.name
                }
              </h2>

              <p>
                {getPrimaryBadge(
                  myProfile
                )}
              </p>
            </div>
          </div>

          <div className="my-impact-metrics">
            <div>
              <strong>
                {formatNumber(
                  myProfile.xp
                )}
              </strong>

              <span>
                XP
              </span>
            </div>

            <div>
              <strong>
                {formatNumber(
                  myProfile.approvedPapers
                )}
              </strong>

              <span>
                Papers
              </span>
            </div>

            <div>
              <strong>
                {formatNumber(
                  myProfile.approvedResources
                )}
              </strong>

              <span>
                Resources
              </span>
            </div>

            <div>
              <strong>
                {formatNumber(
                  myProfile.totalImpact
                )}
              </strong>

              <span>
                Impact
              </span>
            </div>
          </div>

          <Link
            to="/contributors/me"
            className="contributor-inline-link"
          >
            Open profile

            <ArrowRight
              size={13}
            />
          </Link>
        </section>
      )}

      {/* ===================================================
          TOP CONTRIBUTORS
      =================================================== */}

      {!loading &&
        topThree.length >
          0 && (
        <section className="contributor-recognition-section">
          <header className="contributor-section-heading">
            <div>
              <span>
                Archive Honor Board
              </span>

              <h2>
                Leading contributors
              </h2>
            </div>

            <p>
              The current top three by
              contribution XP.
            </p>
          </header>

          <div className="contributor-honor-board">
            {topThree.map(
              (
                profile,
                index
              ) => (
                <Link
                  key={
                    profile.userId
                  }
                  to={`/contributors/${profile.userId}`}
                  className={`contributor-honor-row rank-${profile.rank}`}
                >
                  <div className="contributor-honor-position">
                    <RankMark
                      rank={
                        profile.rank
                      }
                      large
                    />

                    {index ===
                      0 && (
                      <Trophy
                        size={17}
                      />
                    )}
                  </div>

                  <Avatar
                    profile={
                      profile
                    }
                    large
                  />

                  <div className="contributor-honor-name">
                    <span>
                      {getPrimaryBadge(
                        profile
                      )}
                    </span>

                    <h3>
                      {
                        profile.name
                      }
                    </h3>

                    <p>
                      {
                        profile.approvedPapers ||
                        0
                      }{' '}
                      papers
                      {' · '}
                      {
                        profile.approvedResources ||
                        0
                      }{' '}
                      resources
                    </p>
                  </div>

                  <div className="contributor-honor-xp">
                    <span>
                      Contribution XP
                    </span>

                    <strong>
                      {formatNumber(
                        profile.xp
                      )}
                    </strong>

                    <div>
                      <i
                        style={{
                          width:
                            `${Math.max(
                              6,
                              Math.min(
                                100,
                                Math.round(
                                  (
                                    Number(
                                      profile.xp ||
                                        0
                                    ) /
                                    maxXp
                                  ) *
                                    100
                                )
                              )
                            )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="contributor-honor-impact">
                    <span>
                      Impact
                    </span>

                    <strong>
                      {formatNumber(
                        profile.totalImpact
                      )}
                    </strong>
                  </div>

                  <ArrowRight
                    className="contributor-honor-arrow"
                    size={15}
                  />
                </Link>
              )
            )}
          </div>
        </section>
      )}

      {/* ===================================================
          LEADERBOARD
      =================================================== */}

      <section className="contributor-board-section">
        <div className="contributor-board-toolbar">
          <div className="contributor-section-heading">
            <div>
              <span>
                Full Ledger
              </span>

              <h2>
                Contributor board
              </h2>
            </div>

            <p>
              Search the community or
              compare contributors by
              XP, archive impact,
              papers or resources.
            </p>
          </div>

          <div className="contributor-board-filters">
            <label className="contributor-search-box">
              <Search
                size={15}
              />

              <input
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Find contributor..."
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch(
                      ''
                    )
                  }
                  aria-label="Clear contributor search"
                >
                  <X
                    size={13}
                  />
                </button>
              )}
            </label>

            <label className="contributor-sort">
              <span>
                Sort by
              </span>

              <select
                value={
                  sortBy
                }
                onChange={(
                  event
                ) =>
                  setSortBy(
                    event.target
                      .value
                  )
                }
              >
                <option value="xp">
                  XP
                </option>

                <option value="impact">
                  Impact
                </option>

                <option value="papers">
                  Papers
                </option>

                <option value="resources">
                  Resources
                </option>
              </select>
            </label>
          </div>
        </div>

        {loading ? (
          <div className="contributor-state-card">
            <span className="contributor-loading-mark" />

            <strong>
              Opening the community
              ledger…
            </strong>
          </div>
        ) : leaderboard.length ===
          0 ? (
          <div className="contributor-state-card">
            <Award
              size={28}
            />

            <h3>
              The honor board is empty.
            </h3>

            <p>
              The first approved
              contribution will start
              the leaderboard.
            </p>

            <Link
              className="contributor-primary-action"
              to="/contribute"
            >
              Make the first
              contribution
            </Link>
          </div>
        ) : visibleLeaderboard.length ===
          0 ? (
          <div className="contributor-state-card compact">
            <Search
              size={22}
            />

            <h3>
              No contributor matches
              that search.
            </h3>

            <button
              type="button"
              className="contributor-clear-search"
              onClick={() =>
                setSearch(
                  ''
                )
              }
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            {/* =============================================
                DESKTOP LEDGER
            ============================================= */}

            <div className="contributor-ledger">
              <header className="contributor-ledger-head">
                <span>
                  Rank
                </span>

                <span>
                  Contributor
                </span>

                <span>
                  XP
                </span>

                <span>
                  Papers
                </span>

                <span>
                  Solutions
                </span>

                <span>
                  Resources
                </span>

                <span>
                  Requests
                </span>

                <span>
                  Impact
                </span>

                <span />
              </header>

              <div className="contributor-ledger-body">
                {visibleLeaderboard.map(
                  (
                    profile
                  ) => {
                    const xpPercent =
                      Math.max(
                        4,
                        Math.min(
                          100,
                          Math.round(
                            (
                              Number(
                                profile.xp ||
                                  0
                              ) /
                              maxXp
                            ) *
                              100
                          )
                        )
                      );

                    return (
                      <Link
                        key={
                          profile.userId
                        }
                        to={`/contributors/${profile.userId}`}
                        className="contributor-ledger-row"
                      >
                        <div className="contributor-ledger-rank">
                          <RankMark
                            rank={
                              profile.rank
                            }
                          />
                        </div>

                        <div className="contributor-name-cell-v3">
                          <Avatar
                            profile={
                              profile
                            }
                          />

                          <div>
                            <strong>
                              {
                                profile.name
                              }
                            </strong>

                            <span>
                              {getPrimaryBadge(
                                profile
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="contributor-xp-cell">
                          <strong>
                            {formatNumber(
                              profile.xp
                            )}
                          </strong>

                          <span>
                            XP
                          </span>

                          <div>
                            <i
                              style={{
                                width:
                                  `${xpPercent}%`,
                              }}
                            />
                          </div>
                        </div>

                        <div className="contributor-number-cell">
                          <strong>
                            {formatNumber(
                              profile.approvedPapers
                            )}
                          </strong>

                          <span>
                            papers
                          </span>
                        </div>

                        <div className="contributor-number-cell">
                          <strong>
                            {formatNumber(
                              profile.approvedSolutions
                            )}
                          </strong>

                          <span>
                            solved
                          </span>
                        </div>

                        <div className="contributor-number-cell">
                          <strong>
                            {formatNumber(
                              profile.approvedResources
                            )}
                          </strong>

                          <span>
                            shared
                          </span>
                        </div>

                        <div className="contributor-number-cell">
                          <strong>
                            {formatNumber(
                              profile.fulfilledRequests
                            )}
                          </strong>

                          <span>
                            filled
                          </span>
                        </div>

                        <div className="contributor-impact-cell">
                          <strong>
                            {formatNumber(
                              profile.totalImpact
                            )}
                          </strong>

                          <span>
                            interactions
                          </span>
                        </div>

                        <ArrowRight
                          className="contributor-row-arrow"
                          size={14}
                        />
                      </Link>
                    );
                  }
                )}
              </div>
            </div>

            {/* =============================================
                MOBILE LEDGER
            ============================================= */}

            <div className="contributor-mobile-list">
              {visibleLeaderboard.map(
                (
                  profile
                ) => (
                  <Link
                    className="contributor-mobile-card"
                    to={`/contributors/${profile.userId}`}
                    key={
                      profile.userId
                    }
                  >
                    <div className="contributor-mobile-head">
                      <RankMark
                        rank={
                          profile.rank
                        }
                      />

                      <Avatar
                        profile={
                          profile
                        }
                      />

                      <div>
                        <strong>
                          {
                            profile.name
                          }
                        </strong>

                        <span>
                          {getPrimaryBadge(
                            profile
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="contributor-mobile-xp">
                      <span>
                        Contribution XP
                      </span>

                      <strong>
                        {formatNumber(
                          profile.xp
                        )}
                      </strong>
                    </div>

                    <div className="contributor-mobile-metrics">
                      <span>
                        <b>
                          {
                            profile.approvedPapers ||
                            0
                          }
                        </b>

                        Papers
                      </span>

                      <span>
                        <b>
                          {
                            profile.approvedSolutions ||
                            0
                          }
                        </b>

                        Solutions
                      </span>

                      <span>
                        <b>
                          {
                            profile.approvedResources ||
                            0
                          }
                        </b>

                        Resources
                      </span>

                      <span>
                        <b>
                          {formatNumber(
                            profile.totalImpact
                          )}
                        </b>

                        Impact
                      </span>
                    </div>
                  </Link>
                )
              )}
            </div>
          </>
        )}
      </section>

      {/* ===================================================
          FOOT CTA
      =================================================== */}

      <section className="contributor-bottom-note">
        <div>
          <Sparkles
            size={18}
          />

          <span>
            PaperStack belongs to the
            students who keep improving
            it.
          </span>
        </div>

        <p>
          Have a paper, solution,
          formula sheet or notes that
          could help someone else?
        </p>

        <Link to="/contribute-resource">
          Add to the archive

          <ArrowRight
            size={14}
          />
        </Link>
      </section>
    </main>
  );
}
