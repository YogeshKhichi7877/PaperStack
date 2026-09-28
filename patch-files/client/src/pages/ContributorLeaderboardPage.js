import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getContributorLeaderboard,
  getMyContributorProfile,
} from '../services/contributorApi';
import './ContributorPages.css';

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function Avatar({ profile, large = false }) {
  const initial = String(profile?.name || 'C').trim().charAt(0).toUpperCase();
  if (profile?.avatar) {
    return <img className={`contributor-avatar ${large ? 'large' : ''}`} src={profile.avatar} alt="" />;
  }
  return <span className={`contributor-avatar contributor-avatar-fallback ${large ? 'large' : ''}`}>{initial}</span>;
}

function RankMark({ rank }) {
  if (rank === 1) return <span className="contributor-rank-mark top">1</span>;
  if (rank === 2) return <span className="contributor-rank-mark top">2</span>;
  if (rank === 3) return <span className="contributor-rank-mark top">3</span>;
  return <span className="contributor-rank-mark">#{rank}</span>;
}

export default function ContributorLeaderboardPage({ user, toast }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      try {
        const [leaderboardResult, ownResult] = await Promise.allSettled([
          getContributorLeaderboard(),
          user ? getMyContributorProfile() : Promise.resolve(null),
        ]);
        if (!active) return;
        if (leaderboardResult.status === 'fulfilled') setLeaderboard(leaderboardResult.value);
        else {
          setLeaderboard([]);
          toast?.('Failed to load contributor leaderboard', 'error');
        }
        if (ownResult.status === 'fulfilled') setMyProfile(ownResult.value);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [user, toast]);

  const archiveImpact = useMemo(() => leaderboard.reduce((sum, item) => sum + Number(item.totalImpact || 0), 0), [leaderboard]);
  const totalApproved = useMemo(() => leaderboard.reduce((sum, item) => sum + Number(item.approvedPapers || 0), 0), [leaderboard]);
  const totalResources = useMemo(() => leaderboard.reduce((sum, item) => sum + Number(item.approvedResources || 0), 0), [leaderboard]);

  return (
    <main className="contributor-page-shell">
      <section className="contributor-hero">
        <div>
          <span className="contributor-eyebrow">Community impact</span>
          <h1>Contributors who build the archive.</h1>
          <p>XP rewards useful, approved contributions. Impact shows how often the community actually uses them.</p>
          <div className="contributor-hero-actions">
            <Link className="contributor-primary-action" to="/contribute">Contribute a paper</Link>
            <Link className="contributor-secondary-action" to="/contribute-resource">Upload a resource</Link>
            {user && <Link className="contributor-secondary-action" to="/contributors/me">My impact profile</Link>}
          </div>
        </div>
        <div className="contributor-archive-stats">
          <div><strong>{formatNumber(leaderboard.length)}</strong><span>Contributors</span></div>
          <div><strong>{formatNumber(totalApproved)}</strong><span>Approved papers</span></div>
          <div><strong>{formatNumber(totalResources)}</strong><span>Approved resources</span></div>
          <div><strong>{formatNumber(archiveImpact)}</strong><span>Impact interactions</span></div>
        </div>
      </section>

      {myProfile && (
        <section className="my-impact-card">
          <div className="my-impact-identity">
            <Avatar profile={myProfile} large />
            <div>
              <span>Your contributor profile</span>
              <h2>{myProfile.name}</h2>
              <p>{myProfile.rank ? `Campus rank #${myProfile.rank}` : 'Your first approved contribution will place you on the leaderboard.'}</p>
            </div>
          </div>
          <div className="my-impact-metrics">
            <div><strong>{formatNumber(myProfile.xp)}</strong><span>XP</span></div>
            <div><strong>{formatNumber(myProfile.approvedPapers)}</strong><span>Papers</span></div>
            <div><strong>{formatNumber(myProfile.approvedResources)}</strong><span>Resources</span></div>
            <div><strong>{formatNumber(myProfile.totalImpact)}</strong><span>Impact</span></div>
            <div><strong>{formatNumber(myProfile.privateStats?.pending)}</strong><span>Pending</span></div>
          </div>
          <Link to="/contributors/me" className="contributor-inline-link">Open my profile →</Link>
        </section>
      )}

      <section className="contributor-board-section">
        <div className="contributor-section-heading">
          <div>
            <span>Leaderboard</span>
            <h2>Contribution XP</h2>
          </div>
          <p>Approved papers, solutions, fulfilled requests and approved Subject Hub resources all contribute to XP.</p>
        </div>

        {loading ? (
          <div className="contributor-state-card">Loading contributor impact...</div>
        ) : leaderboard.length === 0 ? (
          <div className="contributor-state-card">
            <h3>No approved contributions yet.</h3>
            <p>Be the first person to build the IIIT Surat archive.</p>
            <Link className="contributor-primary-action" to="/contribute">Contribute now</Link>
          </div>
        ) : (
          <>
            <div className="contributor-podium-grid">
              {leaderboard.slice(0, 3).map((profile) => (
                <Link to={`/contributors/${profile.userId}`} className={`contributor-podium-card rank-${profile.rank}`} key={profile.userId}>
                  <RankMark rank={profile.rank} />
                  <Avatar profile={profile} large />
                  <h3>{profile.name}</h3>
                  <strong>{formatNumber(profile.xp)} XP</strong>
                  <p>{profile.approvedPapers} papers • {profile.approvedResources || 0} resources • {formatNumber(profile.totalImpact)} impact</p>
                  <div className="contributor-badge-row">
                    {(profile.badges || []).slice(0, 2).map((badge) => <span key={badge}>{badge}</span>)}
                  </div>
                </Link>
              ))}
            </div>

            <div className="contributor-table-wrap">
              <table className="contributor-impact-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Contributor</th>
                    <th>XP</th>
                    <th>Papers</th>
                    <th>Solutions</th>
                    <th>Resources</th>
                    <th>Requests</th>
                    <th>Impact</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((profile) => (
                    <tr key={profile.userId}>
                      <td><RankMark rank={profile.rank} /></td>
                      <td>
                        <div className="contributor-name-cell-v3">
                          <Avatar profile={profile} />
                          <div><strong>{profile.name}</strong><span>{profile.badges?.[0] || 'Contributor'}</span></div>
                        </div>
                      </td>
                      <td><strong>{formatNumber(profile.xp)}</strong></td>
                      <td>{formatNumber(profile.approvedPapers)}</td>
                      <td>{formatNumber(profile.approvedSolutions)}</td>
                      <td>{formatNumber(profile.approvedResources)}</td>
                      <td>{formatNumber(profile.fulfilledRequests)}</td>
                      <td>{formatNumber(profile.totalImpact)}</td>
                      <td><Link className="contributor-view-link" to={`/contributors/${profile.userId}`}>View profile</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="contributor-mobile-list">
              {leaderboard.map((profile) => (
                <Link className="contributor-mobile-card" to={`/contributors/${profile.userId}`} key={profile.userId}>
                  <div className="contributor-mobile-head"><RankMark rank={profile.rank} /><Avatar profile={profile} /><strong>{profile.name}</strong></div>
                  <div className="contributor-mobile-metrics">
                    <span><b>{formatNumber(profile.xp)}</b> XP</span>
                    <span><b>{profile.approvedPapers}</b> papers</span>
                    <span><b>{profile.approvedResources || 0}</b> resources</span>
                    <span><b>{formatNumber(profile.totalImpact)}</b> impact</span>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
