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
  Crown,
  FileText,
  FolderUp,
  LibraryBig,
  Medal,
  Search,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  Users,
  Zap,
  X,
} from 'lucide-react';

import {
  getContributorLeaderboard,
  getMyContributorProfile,
} from '../services/contributorApi';

import './ContributorPages.css';
import './ContributorLeaderboardPage.css';

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

function PodiumCard({
  profile,
  leaderXp,
}) {
  const rank = Number(
    profile.rank
  );

  const xpPercent = Math.max(
    5,
    Math.min(
      100,
      Math.round(
        (Number(
          profile.xp || 0
        ) /
          Math.max(
            1,
            leaderXp
          )) *
          100
      )
    )
  );

  return (
    <Link
      to={`/contributors/${profile.userId}`}
      className={`cl-podium-card cl-podium-card--${rank}`}
    >
      <div className="cl-podium-rank">
        {rank === 1 ? (
          <Crown size={20} />
        ) : (
          <Medal size={18} />
        )}

        <span>
          #{rank}
        </span>
      </div>

      <Avatar
        profile={profile}
        large
      />

      <span className="cl-podium-badge">
        {getPrimaryBadge(
          profile
        )}
      </span>

      <h3>{profile.name}</h3>

      <div className="cl-podium-xp">
        <strong>
          {formatNumber(
            profile.xp
          )}
        </strong>

        <span>XP</span>
      </div>

      <div
        className="cl-podium-progress"
        aria-label={`${xpPercent}% of the leading XP total`}
      >
        <i
          style={{
            width: `${xpPercent}%`,
          }}
        />
      </div>

      <div className="cl-podium-stats">
        <span>
          <b>
            {formatNumber(
              profile.approvedPapers
            )}
          </b>
          Papers
        </span>

        <span>
          <b>
            {formatNumber(
              profile.approvedResources
            )}
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

      <span className="cl-podium-open">
        View profile
        <ArrowRight size={14} />
      </span>
    </Link>
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

  const leader =
    topThree[0] ||
    null;

  const podiumProfiles =
    useMemo(() => {
      if (
        topThree.length < 2
      ) {
        return topThree;
      }

      return [
        topThree[1],
        topThree[0],
        ...topThree.slice(
          2
        ),
      ];
    }, [topThree]);

  const nextRival =
    useMemo(() => {
      const rank = Number(
        myProfile?.rank ||
          0
      );

      if (rank <= 1) {
        return null;
      }

      return (
        leaderboard.find(
          (profile) =>
            Number(
              profile.rank
            ) ===
            rank - 1
        ) || null
      );
    }, [
      leaderboard,
      myProfile,
    ]);

  const xpToNextRank =
    nextRival
      ? Math.max(
          1,
          Number(
            nextRival.xp ||
              0
          ) -
            Number(
              myProfile?.xp ||
                0
            ) +
            1
        )
      : 0;

  const myLeaderProgress =
    myProfile
      ? Math.max(
          2,
          Math.min(
            100,
            Math.round(
              (Number(
                myProfile.xp ||
                  0
              ) /
                Math.max(
                  1,
                  maxXp
                )) *
                100
            )
          )
        )
      : 0;

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
          Contributor Leaderboard -
          PaperStack
        </title>

        <meta
          name="description"
          content="Climb the PaperStack contributor leaderboard by sharing useful papers, solutions and study resources."
        />
      </Helmet>

      <section className="cl-arena-hero">
        <div className="cl-arena-glow" />

        <div className="cl-arena-copy">
          <span className="cl-kicker">
            <Trophy size={16} />
            Campus leaderboard
          </span>

          <h1>
            Helpful work deserves
            <span>
              the spotlight.
            </span>
          </h1>

          <p>
            See the students strengthening
            PaperStack with useful papers,
            clear solutions and dependable
            study resources.
          </p>

          <div className="cl-hero-actions">
            <Link
              className="cl-action cl-action--primary"
              to="/contribute"
            >
              Contribute and earn XP
              <ArrowRight size={16} />
            </Link>

            {user ? (
              <Link
                className="cl-action cl-action--ghost"
                to="/contributors/me"
              >
                View my profile
              </Link>
            ) : (
              <Link
                className="cl-action cl-action--ghost"
                to="/contribute-resource"
              >
                Share a resource
              </Link>
            )}
          </div>
        </div>

        <aside className="cl-leader-spotlight">
          <div className="cl-spotlight-head">
            <span>
              <span className="cl-live-dot" />
              Leading contributor
            </span>

            <Trophy size={20} />
          </div>

          {loading ? (
            <div className="cl-spotlight-loading">
              Loading standings…
            </div>
          ) : leader ? (
            <>
              <div className="cl-spotlight-player">
                <div className="cl-spotlight-avatar">
                  <Avatar
                    profile={leader}
                    large
                  />
                  <Crown size={18} />
                </div>

                <div>
                  <span>
                    {getPrimaryBadge(
                      leader
                    )}
                  </span>
                  <strong>
                    {leader.name}
                  </strong>
                </div>
              </div>

              <div className="cl-spotlight-score">
                <span>Contribution score</span>
                <strong>
                  {formatNumber(
                    leader.xp
                  )}
                  <small> XP</small>
                </strong>
              </div>

              <Link
                to={`/contributors/${leader.userId}`}
                className="cl-spotlight-link"
              >
                View contributor profile
                <ArrowRight size={15} />
              </Link>
            </>
          ) : (
            <div className="cl-spotlight-loading">
              The first contributor can
              take the lead.
            </div>
          )}
        </aside>

        <div className="cl-arena-stats">
          <div>
            <Users size={18} />
            <span>Contributors</span>
            <strong>
              {formatNumber(
                leaderboard.length
              )}
            </strong>
          </div>

          <div>
            <BookOpen size={18} />
            <span>Approved papers</span>
            <strong>
              {formatNumber(
                totalApproved
              )}
            </strong>
          </div>

          <div>
            <LibraryBig size={18} />
            <span>Study resources</span>
            <strong>
              {formatNumber(
                totalResources
              )}
            </strong>
          </div>

          <div>
            <TrendingUp size={18} />
            <span>Community impact</span>
            <strong>
              {formatNumber(
                archiveImpact
              )}
            </strong>
          </div>
        </div>
      </section>

      <section className="cl-scoring-strip">
        <div className="cl-scoring-intro">
          <Zap size={18} />
          <span>
            <small>How to earn XP</small>
            Useful work moves you up.
          </span>
        </div>

        <div className="cl-scoring-rule">
          <BookOpen size={17} />
          <span>
            <strong>Papers</strong>
            Approved PYQs
          </span>
        </div>

        <div className="cl-scoring-rule">
          <FileText size={17} />
          <span>
            <strong>Solutions</strong>
            Helpful answers
          </span>
        </div>

        <div className="cl-scoring-rule">
          <FolderUp size={17} />
          <span>
            <strong>Resources</strong>
            Notes and sheets
          </span>
        </div>

        <div className="cl-scoring-rule">
          <Target size={17} />
          <span>
            <strong>Requests</strong>
            Fill archive gaps
          </span>
        </div>
      </section>

      {/* ===================================================
          MY CONTRIBUTOR PASS
      =================================================== */}

      {myProfile ? (
        <section className="cl-rank-chase">
          <div className="cl-rank-identity">
            <div className="cl-rank-number">
              <small>Your rank</small>
              <strong>
                {myProfile.rank
                  ? `#${myProfile.rank}`
                  : '—'}
              </strong>
            </div>

            <Avatar
              profile={myProfile}
              large
            />

            <div className="cl-rank-name">
              <span>Your position</span>
              <h2>{myProfile.name}</h2>
              <p>
                {getPrimaryBadge(
                  myProfile
                )}
              </p>
            </div>
          </div>

          <div className="cl-rank-progress-wrap">
            <div className="cl-rank-progress-copy">
              <span>
                {Number(
                  myProfile.rank
                ) === 1
                  ? 'You set the pace'
                  : nextRival
                    ? `Next target: ${nextRival.name}`
                    : 'Progress to the leader'}
              </span>

              <strong>
                {Number(
                  myProfile.rank
                ) === 1
                  ? 'Defend the top spot'
                  : nextRival
                    ? `${formatNumber(
                        xpToNextRank
                      )} XP to overtake`
                    : `${myLeaderProgress}% of leader XP`}
              </strong>
            </div>

            <div
              className="cl-rank-progress"
              aria-label={`${myLeaderProgress}% of the leading XP total`}
            >
              <i
                style={{
                  width: `${myLeaderProgress}%`,
                }}
              />
            </div>

            <div className="cl-rank-xp-line">
              <span>
                {formatNumber(
                  myProfile.xp
                )}{' '}
                XP
              </span>
              <span>
                {formatNumber(
                  maxXp
                )}{' '}
                leader XP
              </span>
            </div>
          </div>

          <div className="cl-rank-metrics">
            <span>
              <b>
                {formatNumber(
                  myProfile.approvedPapers
                )}
              </b>
              Papers
            </span>
            <span>
              <b>
                {formatNumber(
                  myProfile.approvedResources
                )}
              </b>
              Resources
            </span>
            <span>
              <b>
                {formatNumber(
                  myProfile.totalImpact
                )}
              </b>
              Impact
            </span>
          </div>

          <Link
            to="/contributors/me"
            className="cl-rank-link"
          >
            Open profile
            <ArrowRight size={15} />
          </Link>
        </section>
      ) : (
        !loading && (
          <section className="cl-rank-chase cl-rank-chase--starter">
            <span className="cl-starter-icon">
              <Zap size={20} />
            </span>
            <div>
              <small>Your climb starts here</small>
              <strong>
                Make your first approved
                contribution and enter the
                standings.
              </strong>
            </div>
            <Link
              to="/contribute"
              className="cl-rank-link"
            >
              Enter the race
              <ArrowRight size={15} />
            </Link>
          </section>
        )
      )}

      {/* ===================================================
          TOP CONTRIBUTORS
      =================================================== */}

      {!loading &&
        topThree.length >
          0 && (
        <section className="contributor-recognition-section">
          <header className="cl-section-heading">
            <div>
              <span className="cl-kicker cl-kicker--light">
                <Trophy size={15} />
                Community standouts
              </span>

              <h2>
                Top contributors
              </h2>
            </div>

            <p>
              The students currently leading
              the all-time board by verified
              contribution XP.
            </p>
          </header>

          <div className="cl-podium">
            {podiumProfiles.map(
              (profile) => (
                <PodiumCard
                  key={profile.userId}
                  profile={profile}
                  leaderXp={maxXp}
                />
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
          <div className="cl-section-heading cl-section-heading--board">
            <div>
              <span className="cl-kicker cl-kicker--light">
                <TrendingUp size={15} />
                All-time standings
              </span>

              <h2>
                Chase the next rank
              </h2>
            </div>

            <p>
              Every approved contribution
              changes the board. Search
              players or compare the stats
              behind their position.
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
                        className={`contributor-ledger-row ${
                          myProfile?.userId ===
                          profile.userId
                            ? 'is-current-user'
                            : ''
                        }`}
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
                    className={`contributor-mobile-card ${
                      myProfile?.userId ===
                      profile.userId
                        ? 'is-current-user'
                        : ''
                    }`}
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
            Your next upload could change
            the standings.
          </span>
        </div>

        <p>
          Share a paper, solution, formula
          sheet or notes. Help the next
          student and earn your place.
        </p>

        <Link to="/contribute-resource">
          Make your move

          <ArrowRight
            size={14}
          />
        </Link>
      </section>
    </main>
  );
}
