import React, {
  useEffect,
  useState,
} from 'react';

import {
  Helmet,
} from 'react-helmet-async';

import {
  Link,
  useParams,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileText,
  FolderUp,
  Gauge,
  Medal,
  Sparkles,
  Target,
  Trophy,
  UploadCloud,
} from 'lucide-react';

import {
  getContributorProfile,
  getMyContributorProfile,
} from '../services/contributorApi';

import './ContributorPages.css';
import './ContributorProfilePage.css';

function formatNumber(value) {
  return Number(
    value || 0
  ).toLocaleString(
    'en-IN'
  );
}

function ProfileAvatar({
  profile,
}) {
  if (profile?.avatar) {
    return (
      <img
        className="cp-avatar"
        src={profile.avatar}
        alt=""
      />
    );
  }

  return (
    <div className="cp-avatar cp-avatar--fallback">
      {String(
        profile?.name || 'C'
      )
        .charAt(0)
        .toUpperCase()}
    </div>
  );
}

function ProfileStat({
  icon,
  label,
  value,
  featured = false,
}) {
  return (
    <div
      className={`cp-stat ${
        featured
          ? 'cp-stat--featured'
          : ''
      }`}
    >
      <span className="cp-stat-icon">
        {icon}
      </span>

      <span className="cp-stat-copy">
        <strong>
          {formatNumber(value)}
        </strong>
        <small>{label}</small>
      </span>
    </div>
  );
}

function SectionHeading({
  icon,
  eyebrow,
  title,
  description,
  action,
}) {
  return (
    <header className="cp-section-heading">
      <div className="cp-section-title">
        <span className="cp-heading-icon">
          {icon}
        </span>

        <div>
          <small>{eyebrow}</small>
          <h2>{title}</h2>
          {description && (
            <p>{description}</p>
          )}
        </div>
      </div>

      {action}
    </header>
  );
}

export default function ContributorProfilePage({
  user,
  toast,
}) {
  const {
    contributorId,
  } = useParams();

  const [
    profile,
    setProfile,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    notFound,
    setNotFound,
  ] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      setNotFound(false);

      try {
        const data =
          contributorId === 'me'
            ? await getMyContributorProfile()
            : await getContributorProfile(
                contributorId
              );

        if (active) {
          setProfile(data);
        }
      } catch (error) {
        if (!active) {
          return;
        }

        if (
          error.response?.status === 404 ||
          error.response?.status === 401
        ) {
          setNotFound(true);
        } else {
          toast?.(
            'Failed to load contributor profile',
            'error'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      active = false;
    };
  }, [
    contributorId,
    toast,
  ]);

  if (loading) {
    return (
      <main className="contributor-page-shell cp-page">
        <div className="cp-state-card">
          <span className="contributor-loading-mark" />
          <strong>
            Loading contributor profile…
          </strong>
        </div>
      </main>
    );
  }

  if (
    notFound ||
    !profile
  ) {
    return (
      <main className="contributor-page-shell cp-page">
        <div className="cp-state-card">
          <Award size={30} />
          <h1>
            Contributor profile unavailable
          </h1>
          <p>
            {contributorId === 'me' &&
            !user
              ? 'Log in to view your contribution profile.'
              : 'This student does not have an approved public contribution yet.'}
          </p>
          <Link
            to="/contributors"
            className="cp-button cp-button--primary"
          >
            Back to leaderboard
          </Link>
        </div>
      </main>
    );
  }

  const progressTarget =
    profile.nextXpMilestone;

  const progress =
    progressTarget
      ? Math.min(
          100,
          Math.round(
            (Number(
              profile.xp || 0
            ) /
              progressTarget) *
              100
          )
        )
      : 100;

  const xpRemaining =
    progressTarget
      ? Math.max(
          0,
          Number(
            progressTarget
          ) -
            Number(
              profile.xp || 0
            )
        )
      : 0;

  return (
    <main className="contributor-page-shell cp-page">
      <Helmet>
        <title>
          {profile.name} - PaperStack
        </title>

        <meta
          name="description"
          content={`${profile.name}'s PaperStack contributor profile, contribution XP and approved archive activity.`}
        />
      </Helmet>

      <nav
        className="cp-breadcrumb"
        aria-label="Breadcrumb"
      >
        <Link to="/contributors">
          <ArrowLeft size={14} />
          Leaderboard
        </Link>
        <span>/</span>
        <span>{profile.name}</span>
      </nav>

      <section className="cp-hero">
        <div className="cp-hero-identity">
          <div className="cp-avatar-wrap">
            <ProfileAvatar
              profile={profile}
            />

            {profile.rank && (
              <span className="cp-avatar-rank">
                <Trophy size={12} />
                #{profile.rank}
              </span>
            )}
          </div>

          <div className="cp-identity-copy">
            <span className="cp-eyebrow">
              <CheckCircle2 size={14} />
              Verified PaperStack contributor
            </span>

            <h1>{profile.name}</h1>

            <p>
              {profile.rank
                ? `Ranked #${profile.rank} on the all-time contributor leaderboard.`
                : 'Building their first public contribution.'}
            </p>

            <div className="cp-badges">
              {(profile.badges || []).map(
                (badge) => (
                  <span key={badge}>
                    <Medal size={12} />
                    {badge}
                  </span>
                )
              )}

              {!profile.badges?.length && (
                <span>
                  <Sparkles size={12} />
                  New Contributor
                </span>
              )}
            </div>

            <div className="cp-hero-actions">
              <Link
                to="/contribute"
                className="cp-button cp-button--primary"
              >
                Contribute a paper
                <ArrowRight size={14} />
              </Link>

              <Link
                to="/contribute-resource"
                className="cp-button cp-button--secondary"
              >
                Share a resource
              </Link>
            </div>
          </div>
        </div>

        <aside className="cp-xp-card">
          <div className="cp-xp-heading">
            <span>
              <Gauge size={17} />
              Contribution XP
            </span>
            <Award size={20} />
          </div>

          <strong>
            {formatNumber(
              profile.xp
            )}
            <small> XP</small>
          </strong>

          <div className="cp-xp-progress-copy">
            <span>
              {progressTarget
                ? 'Next milestone'
                : 'Milestone status'}
            </span>
            <b>{progress}%</b>
          </div>

          <div
            className="cp-xp-progress"
            aria-label={`${progress}% progress toward the next XP milestone`}
          >
            <i
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          <p>
            {progressTarget
              ? `${formatNumber(
                  xpRemaining
                )} XP until ${formatNumber(
                  progressTarget
                )} XP`
              : 'Highest XP milestone reached.'}
          </p>
        </aside>
      </section>

      <section className="cp-stat-grid">
        <ProfileStat
          icon={<BookOpen size={20} />}
          label="Approved papers"
          value={profile.approvedPapers}
          featured
        />
        <ProfileStat
          icon={<FileCheck2 size={20} />}
          label="Solutions"
          value={profile.approvedSolutions}
        />
        <ProfileStat
          icon={<FolderUp size={20} />}
          label="Resources"
          value={profile.approvedResources}
        />
        <ProfileStat
          icon={<Target size={20} />}
          label="Requests fulfilled"
          value={profile.fulfilledRequests}
        />
        <ProfileStat
          icon={<Eye size={20} />}
          label="Paper views"
          value={profile.impactViews}
        />
        <ProfileStat
          icon={<Download size={20} />}
          label="Downloads"
          value={profile.impactDownloads}
        />
        <ProfileStat
          icon={<BarChart3 size={20} />}
          label="Total impact"
          value={profile.totalImpact}
          featured
        />
      </section>

      {profile.isOwnProfile && (
        <section className="cp-review-desk">
          <div className="cp-review-heading">
            <span className="cp-heading-icon">
              <FileText size={19} />
            </span>
            <div>
              <small>Private to you</small>
              <strong>Submission desk</strong>
            </div>
          </div>

          <div className="cp-review-statuses">
            <span>
              <b>
                {formatNumber(
                  profile.privateStats?.pending
                )}
              </b>
              Pending review
            </span>
            <span>
              <b>
                {formatNumber(
                  profile.privateStats?.needsCorrection
                )}
              </b>
              Needs correction
            </span>
            <span>
              <b>
                {formatNumber(
                  profile.privateStats?.rejected
                )}
              </b>
              Rejected
            </span>
            <span>
              <b>
                {formatNumber(
                  profile.privateStats?.resourcePending
                )}
              </b>
              Resources pending
            </span>
          </div>

          <Link
            to="/contribute-resource"
            className="cp-inline-action"
          >
            <UploadCloud size={15} />
            Upload Notes &amp; Resources
          </Link>
        </section>
      )}

      <section className="cp-insight-grid">
        <article className="cp-insight-card">
          <SectionHeading
            icon={<BarChart3 size={20} />}
            eyebrow="Archive impact"
            title="How students use this work"
            description="Activity generated by approved papers connected to this contributor."
          />

          <div className="cp-impact-grid">
            <div>
              <Eye size={17} />
              <strong>
                {formatNumber(
                  profile.impactViews
                )}
              </strong>
              <span>Views generated</span>
            </div>
            <div>
              <Download size={17} />
              <strong>
                {formatNumber(
                  profile.impactDownloads
                )}
              </strong>
              <span>Downloads generated</span>
            </div>
            <div>
              <Target size={17} />
              <strong>
                {formatNumber(
                  profile.requestDemandServed
                )}
              </strong>
              <span>Request votes served</span>
            </div>
          </div>

          <p className="cp-note">
            Impact represents archive activity,
            not a unique-student count.
          </p>
        </article>

        <article className="cp-insight-card">
          <SectionHeading
            icon={<Award size={20} />}
            eyebrow="XP breakdown"
            title="How this score was earned"
            description="Only reviewed and approved contributions add to the public score."
          />

          <div className="cp-xp-breakdown">
            <div>
              <span>
                {profile.approvedPapers} approved
                papers × 100
              </span>
              <strong>
                {formatNumber(
                  profile.approvedPapers *
                    100
                )}{' '}
                XP
              </strong>
            </div>
            <div>
              <span>
                {profile.approvedSolutions}{' '}
                solutions × 150
              </span>
              <strong>
                {formatNumber(
                  profile.approvedSolutions *
                    150
                )}{' '}
                XP
              </strong>
            </div>
            <div>
              <span>
                {profile.fulfilledRequests}{' '}
                requested papers × 200
              </span>
              <strong>
                {formatNumber(
                  profile.fulfilledRequests *
                    200
                )}{' '}
                XP
              </strong>
            </div>
            <div>
              <span>
                {profile.approvedResources ||
                  0}{' '}
                approved Subject Hub resources
              </span>
              <strong>
                {formatNumber(
                  profile.resourceXp
                )}{' '}
                XP
              </strong>
            </div>
          </div>
        </article>
      </section>

      <section className="cp-activity-section">
        <SectionHeading
          icon={<BookOpen size={20} />}
          eyebrow="Archive activity"
          title="Approved papers"
          description="Question papers and solutions this contributor has added to PaperStack."
          action={(
            <Link
              to="/contribute"
              className="cp-button cp-button--secondary"
            >
              Contribute a paper
              <ArrowRight size={14} />
            </Link>
          )}
        />

        {profile.recentContributions?.length ? (
          <div className="cp-activity-grid">
            {profile.recentContributions.map(
              (item) => (
                <article
                  className="cp-activity-card"
                  key={item.contributionId}
                >
                  <div className="cp-card-topline">
                    <span>
                      {item.examType || 'Exam'}{' '}
                      {item.year || ''}
                    </span>
                    {item.hasSolution && (
                      <span className="cp-status-chip">
                        <CheckCircle2 size={11} />
                        Solution included
                      </span>
                    )}
                  </div>

                  <h3>
                    {item.subject ||
                      item.title}
                  </h3>

                  <p>
                    {item.subjectCode || ''}
                    {item.semester
                      ? ` • Sem ${item.semester}`
                      : ''}
                    {item.branch
                      ? ` • ${item.branch}`
                      : ''}
                  </p>

                  <div className="cp-card-stats">
                    <span>
                      <Eye size={13} />
                      {formatNumber(
                        item.views
                      )}{' '}
                      views
                    </span>
                    <span>
                      <Download size={13} />
                      {formatNumber(
                        item.downloads
                      )}{' '}
                      downloads
                    </span>
                  </div>

                  {item.paperId && (
                    <Link
                      to={`/paper/${item.paperId}`}
                    >
                      Open paper
                      <ArrowRight size={13} />
                    </Link>
                  )}
                </article>
              )
            )}
          </div>
        ) : (
          <div className="cp-empty-card">
            <BookOpen size={22} />
            No approved papers yet.
          </div>
        )}
      </section>

      <section className="cp-activity-section">
        <SectionHeading
          icon={<FolderUp size={20} />}
          eyebrow="Knowledge contributions"
          title="Approved study resources"
          description="Notes, formula sheets and other resources shared through Subject Hubs."
          action={(
            <Link
              to="/contribute-resource"
              className="cp-button cp-button--secondary"
            >
              Upload a resource
              <ArrowRight size={14} />
            </Link>
          )}
        />

        {profile.recentResources?.length ? (
          <div className="cp-activity-grid">
            {profile.recentResources.map(
              (item) => (
                <article
                  className="cp-activity-card cp-activity-card--resource"
                  key={item.contributionId}
                >
                  <div className="cp-card-topline">
                    <span>
                      {String(
                        item.kind ||
                          'resource'
                      ).replace(
                        /_/g,
                        ' '
                      )}
                    </span>
                    <span className="cp-status-chip">
                      +
                      {formatNumber(
                        item.pointsAwarded
                      )}{' '}
                      XP
                    </span>
                  </div>

                  <h3>{item.title}</h3>

                  <p>
                    {item.subject || ''}
                    {item.subjectCode
                      ? ` • ${item.subjectCode}`
                      : ''}
                    {item.semester
                      ? ` • Sem ${item.semester}`
                      : ''}
                  </p>

                  {(item.subjectKey ||
                    item.subjectCode ||
                    item.subject) && (
                    <Link
                      to={`/subject/${encodeURIComponent(
                        item.subjectKey ||
                          item.subjectCode ||
                          item.subject ||
                          ''
                      )}`}
                    >
                      Open subject hub
                      <ArrowRight size={13} />
                    </Link>
                  )}
                </article>
              )
            )}
          </div>
        ) : (
          <div className="cp-empty-card">
            <FolderUp size={22} />
            No approved Subject Hub resources yet.
          </div>
        )}
      </section>
    </main>
  );
}
