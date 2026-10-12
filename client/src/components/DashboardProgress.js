import React, { lazy, Suspense, useState } from 'react';
import './DashboardProgress.css';

const ActivityProgress = lazy(() => import('../pages/StreaksBadgesPage'));
const LearningProgress = lazy(() => import('../pages/LearningDashboardPage'));

export default function DashboardProgress({ user, toast }) {
  const [view, setView] = useState('activity');
  return <section className="dashboard-progress" aria-label="My progress details">
    <div className="dashboard-progress-tabs" role="tablist" aria-label="Progress views">
      {[['activity', 'Activity & badges'], ['learning', 'Mastery & reviews']].map(([key, label]) => <button
        key={key} type="button" role="tab" id={`progress-tab-${key}`} aria-controls={`progress-panel-${key}`}
        aria-selected={view === key} tabIndex={view === key ? 0 : -1}
        onClick={() => setView(key)} onKeyDown={(event) => {
          if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
            event.preventDefault(); const next = event.key === 'Home' ? 'activity' : event.key === 'End' ? 'learning' : view === 'activity' ? 'learning' : 'activity';
            setView(next); document.getElementById(`progress-tab-${next}`)?.focus();
          }
        }}>{label}</button>)}
    </div>
    <div role="tabpanel" id={`progress-panel-${view}`} aria-labelledby={`progress-tab-${view}`}>
      <Suspense fallback={<p className="dashboard-progress-loading" role="status">Loading your progress…</p>}>
        {view === 'activity' ? <ActivityProgress embedded toast={toast} /> : <LearningProgress embedded user={user} toast={toast} />}
      </Suspense>
    </div>
  </section>;
}
