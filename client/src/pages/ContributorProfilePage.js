import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getContributorProfile,
  getMyContributorProfile,
} from '../services/contributorApi';
import './ContributorPages.css';

function formatNumber(value) {
  return Number(value || 0).toLocaleString('en-IN');
}

function ProfileAvatar({ profile }) {
  if (profile?.avatar) return <img className="contributor-profile-avatar" src={profile.avatar} alt="" />;
  return <div className="contributor-profile-avatar contributor-avatar-fallback">{String(profile?.name || 'C').charAt(0).toUpperCase()}</div>;
}

export default function ContributorProfilePage({ user, toast }) {
  const { contributorId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setNotFound(false);
      try {
        const data = contributorId === 'me'
          ? await getMyContributorProfile()
          : await getContributorProfile(contributorId);
        if (active) setProfile(data);
      } catch (error) {
        if (!active) return;
        if (error.response?.status === 404 || error.response?.status === 401) setNotFound(true);
        else toast?.('Failed to load contributor profile', 'error');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [contributorId, toast]);

  if (loading) {
    return <main className="contributor-page-shell"><div className="contributor-state-card">Loading contributor profile...</div></main>;
  }

  if (notFound || !profile) {
    return (
      <main className="contributor-page-shell">
        <div className="contributor-state-card">
          <h2>Contributor profile unavailable.</h2>
          <p>{contributorId === 'me' && !user ? 'Login to view your contribution profile.' : 'This contributor does not have an approved public contribution yet.'}</p>
          <Link to="/contributors" className="contributor-primary-action">Back to leaderboard</Link>
        </div>
      </main>
    );
  }

  const progressTarget = profile.nextXpMilestone;
  const progress = progressTarget ? Math.min(100, Math.round((Number(profile.xp || 0) / progressTarget) * 100)) : 100;

  return (
    <main className="contributor-page-shell">
      <div className="contributor-profile-breadcrumb"><Link to="/contributors">Contributors</Link><span>/</span><span>{profile.name}</span></div>

      <section className="contributor-profile-hero">
        <div className="contributor-profile-identity">
          <ProfileAvatar profile={profile} />
          <div>
            <span className="contributor-eyebrow">PaperStack contributor</span>
            <h1>{profile.name}</h1>
            <p>{profile.rank ? `Campus contributor rank #${profile.rank}` : 'Building their first public contribution.'}</p>
            <div className="contributor-badge-row profile-badges">
              {(profile.badges || []).map((badge) => <span key={badge}>{badge}</span>)}
              {!profile.badges?.length && <span>New Contributor</span>}
            </div>
          </div>
        </div>

        <div className="contributor-xp-panel">
          <span>Contribution XP</span>
          <strong>{formatNumber(profile.xp)} XP</strong>
          {progressTarget ? (
            <>
              <div className="contributor-xp-progress"><div style={{ width: `${progress}%` }} /></div>
              <p>{formatNumber(progressTarget - profile.xp)} XP until {formatNumber(progressTarget)} XP</p>
            </>
          ) : <p>Highest XP milestone reached.</p>}
        </div>
      </section>

      <section className="contributor-profile-stat-grid">
        <div><span>Approved papers</span><strong>{formatNumber(profile.approvedPapers)}</strong></div>
        <div><span>Solutions</span><strong>{formatNumber(profile.approvedSolutions)}</strong></div>
        <div><span>Requests fulfilled</span><strong>{formatNumber(profile.fulfilledRequests)}</strong></div>
        <div><span>Paper views</span><strong>{formatNumber(profile.impactViews)}</strong></div>
        <div><span>Downloads</span><strong>{formatNumber(profile.impactDownloads)}</strong></div>
        <div><span>Total impact</span><strong>{formatNumber(profile.totalImpact)}</strong></div>
      </section>

      {profile.isOwnProfile && (
        <section className="contributor-private-status">
          <div><span>Pending review</span><strong>{formatNumber(profile.privateStats?.pending)}</strong></div>
          <div><span>Needs correction</span><strong>{formatNumber(profile.privateStats?.needsCorrection)}</strong></div>
          <div><span>Rejected</span><strong>{formatNumber(profile.privateStats?.rejected)}</strong></div>
          <Link to="/contribute">Add another contribution →</Link>
        </section>
      )}

      <section className="contributor-profile-content-grid">
        <article className="contributor-profile-panel">
          <div className="contributor-panel-heading">
            <div><span>Impact</span><h2>How these resources are being used</h2></div>
          </div>
          <div className="contributor-impact-breakdown">
            <div><strong>{formatNumber(profile.impactViews)}</strong><span>Views generated</span></div>
            <div><strong>{formatNumber(profile.impactDownloads)}</strong><span>Downloads generated</span></div>
            <div><strong>{formatNumber(profile.requestDemandServed)}</strong><span>Request votes served</span></div>
          </div>
          <p className="contributor-muted-copy">Impact is calculated from activity on approved papers connected to this contributor. It is not a unique-student count.</p>
        </article>

        <article className="contributor-profile-panel">
          <div className="contributor-panel-heading">
            <div><span>XP breakdown</span><h2>How XP is earned</h2></div>
          </div>
          <div className="contributor-xp-breakdown">
            <div><span>{profile.approvedPapers} approved papers × 100</span><strong>{formatNumber(profile.approvedPapers * 100)} XP</strong></div>
            <div><span>{profile.approvedSolutions} solutions × 150</span><strong>{formatNumber(profile.approvedSolutions * 150)} XP</strong></div>
            <div><span>{profile.fulfilledRequests} requested papers × 200</span><strong>{formatNumber(profile.fulfilledRequests * 200)} XP</strong></div>
          </div>
        </article>
      </section>

      <section className="contributor-recent-section">
        <div className="contributor-section-heading">
          <div><span>Archive activity</span><h2>Approved contributions</h2></div>
          <Link to="/contribute" className="contributor-secondary-action">Contribute another paper</Link>
        </div>

        {profile.recentContributions?.length ? (
          <div className="contributor-recent-grid">
            {profile.recentContributions.map((item) => (
              <article className="contributor-recent-card" key={item.contributionId}>
                <div className="contributor-recent-top">
                  <span>{item.examType || 'Exam'} {item.year || ''}</span>
                  {item.hasSolution && <span className="solution-chip">Solution included</span>}
                </div>
                <h3>{item.subject || item.title}</h3>
                <p>{item.subjectCode || ''}{item.semester ? ` • Sem ${item.semester}` : ''}{item.branch ? ` • ${item.branch}` : ''}</p>
                <div className="contributor-recent-stats"><span>{formatNumber(item.views)} views</span><span>{formatNumber(item.downloads)} downloads</span></div>
                {item.paperId && <Link to={`/paper/${item.paperId}`}>Open paper →</Link>}
              </article>
            ))}
          </div>
        ) : (
          <div className="contributor-state-card compact">No approved papers yet.</div>
        )}
      </section>
    </main>
  );
}
