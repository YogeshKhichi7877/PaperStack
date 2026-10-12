import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Gauge, Loader2, TrendingUp } from 'lucide-react';
import { getLearningDashboard, updateDoubtStatus } from '../services/learningApi';
import { MasteryBar } from './LearningTodayPage';
import LearningNav from '../components/LearningNav';
import './Update4.css';

export default function LearningDashboardPage({ user, toast, embedded = false }) {
  const Page = embedded ? 'section' : 'main';
  const pageClass = `u4-page${embedded ? ' u4-progress-embedded' : ''}`;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setError('');
    getLearningDashboard()
      .then((value) => { if (active) setData(value); })
      .catch((error) => { if (active) setError(error.response?.data?.error || 'Could not load learning progress.'); });
    return () => { active = false; };
  }, [toast, user, retry]);

  if (!user) {
    return <Page className={pageClass}><div className="u4-empty"><Gauge /><div><b>Your learning intelligence is private.</b><Link to="/login">Sign in to continue</Link></div></div></Page>;
  }
  if (error) return <Page className={pageClass}>{!embedded && <LearningNav active="progress" />}<section className="u4-empty" role="alert"><div><b>{error}</b><button className="u4-button secondary" onClick={() => setRetry((value) => value + 1)}>Try again</button></div></section></Page>;
  if (!data) {
    return <Page className={pageClass}><div className="u4-loading"><Loader2 className="spin" /> Calculating learning intelligence…</div></Page>;
  }

  const resolveDoubt = async (id) => {
    try {
      await updateDoubtStatus(id, 'RESOLVED');
      setData((current) => ({
        ...current,
        openDoubts: (current.openDoubts || []).filter((item) => item._id !== id),
      }));
    } catch (error) {
      toast?.(error.response?.data?.error || 'Could not update this doubt.', 'error');
    }
  };

  return (
    <Page className={pageClass}>
      {!embedded && <LearningNav active="progress" />}
      {!embedded && <header className="u4-simple-hero">
        <div><span className="u4-eyebrow">My progress</span><h1>The work is adding up.</h1><p>See what’s sticking, what needs another look, and how far you’ve come.</p></div>
      </header>}

      <section className="u4-dashboard-metrics">
        <article><Gauge /><span>Overall mastery</span><strong>{data.overallMastery == null ? '—' : `${data.overallMastery}%`}</strong></article>
        <article><TrendingUp /><span>PaperStack Rating</span><strong>{data.rating.globalRating}</strong><small>{data.rating.provisional ? 'Provisional' : data.rating.tier}</small></article>
        <article><CalendarClock /><span>Reviews due</span><strong>{data.dueReviews.length}</strong></article>
      </section>

      <section className="u4-weekly-review" aria-labelledby="weekly-review-heading">
        <div><span className="u4-eyebrow">This week</span><h2 id="weekly-review-heading">Weekly review</h2></div>
        <dl>
          <div><dt>Topics learned</dt><dd>{data.weeklyReview?.topicsLearned || 0}</dd></div>
          <div><dt>Questions practiced</dt><dd>{data.weeklyReview?.questionsPracticed || 0}</dd></div>
          <div><dt>Reviews</dt><dd>{data.weeklyReview?.reviewsCompleted || 0}/{data.weeklyReview?.reviewsStarted || 0}</dd></div>
          <div><dt>PSR</dt><dd>{(data.weeklyReview?.ratingDelta || 0) >= 0 ? '+' : ''}{data.weeklyReview?.ratingDelta || 0}</dd></div>
        </dl>
        {data.weeklyReview?.mostImproved && <p>Most improved: <strong>{data.weeklyReview.mostImproved.topicName} +{data.weeklyReview.mostImproved.gain}</strong></p>}
      </section>

      <section className="u4-panel">
        <div className="u4-section-title"><div><span className="u4-eyebrow">Mastery map</span><h2>Topics</h2></div><Link to="/practice">Practice weak topics</Link></div>
        {data.mastery.length ? (
          <div className="u4-mastery-table">
            {data.mastery.map((item) => <div key={item.topicKey}>
              <span><b>{item.topicName}</b><small>{item.subjectName || item.subjectCode} · {item.status.replace('_', ' ')}</small></span>
              <MasteryBar value={item.masteryScore} />
              <strong>{item.masteryScore}%</strong>
              <small>{Math.round(item.masteryConfidence * 100)}% confidence</small>
            </div>)}
          </div>
        ) : <div className="u4-empty"><Gauge /><div><b>No mastery evidence yet.</b><span>Complete your first practice session to build this map.</span></div></div>}
      </section>

      <section className="u4-two-column u4-learning-details">
        <article className="u4-panel">
          <div className="u4-section-title"><div><span className="u4-eyebrow">Coverage is not mastery</span><h2>Course coverage</h2></div></div>
          {data.courseCoverage?.length ? data.courseCoverage.map((subject) => <div className="u4-coverage-row" key={subject.subjectCode}>
            <span><b>{subject.subjectName || subject.subjectCode}</b><small>{subject.taughtCount} taught · {subject.practicedCount} practiced · {subject.masteredCount} mastered</small></span>
            <Link to="/practice">Practice</Link>
          </div>) : <p className="u4-muted">Log a class to track what was taught separately from what you have mastered.</p>}
        </article>

        <article className="u4-panel">
          <div className="u4-section-title"><div><span className="u4-eyebrow">Private</span><h2>Open doubts</h2></div></div>
          {data.openDoubts?.length ? data.openDoubts.slice(0, 6).map((doubt) => <div className="u4-doubt-row" key={doubt._id}>
            <span><b>{doubt.topicName || doubt.subjectCode}</b><small>{doubt.content}</small></span>
            <button type="button" onClick={() => resolveDoubt(doubt._id)}>Mark resolved</button>
          </div>) : <p className="u4-muted">No open doubts. Record one with today’s learning.</p>}
        </article>
      </section>
    </Page>
  );
}
