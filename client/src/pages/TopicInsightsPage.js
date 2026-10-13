import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ImportantTopicsPage from './ImportantTopicsPage';
import PyqIntelligencePage from './PyqIntelligencePage';
import './TopicInsightsPage.css';

export default function TopicInsightsPage({ toast }) {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'repeated' ? 'repeated' : 'top';
  const select = (nextView) => {
    const next = new URLSearchParams(params);
    next.set('view', nextView);
    setParams(next);
  };

  return <div className="topic-insights-page">
    <div className="topic-insights-nav">
      <div>
        <span className="topic-insights-kicker">Exam evidence</span>
        <h1>Topics and repeat patterns</h1>
        <p>Choose a subject, then compare what appeared often with how questions repeated across papers.</p>
      </div>
      <div className="topic-insights-tabs" role="tablist" aria-label="Topic analysis">
        <button type="button" role="tab" aria-selected={view === 'top'} onClick={() => select('top')}>Top exam topics</button>
        <button type="button" role="tab" aria-selected={view === 'repeated'} onClick={() => select('repeated')}>Repeated questions</button>
      </div>
    </div>
    <div role="tabpanel" aria-label={view === 'top' ? 'Top exam topics analysis' : 'Repeated question analysis'}>
      {view === 'top' ? <ImportantTopicsPage toast={toast} /> : <PyqIntelligencePage toast={toast} />}
    </div>
  </div>;
}
