import React from 'react';
import { ArrowRight, Home, RefreshCw } from 'lucide-react';
import './ErrorState.css';

export function ErrorState({ notFound = false, onRetry }) {
  return <main className="ps-error-page">
    <header className="ps-error-header">
      <a className="ps-error-brand" href="/"><img src="/logo2.png" alt="" />PaperStack</a>
    </header>
    <section className="ps-error-layout" aria-labelledby="ps-error-title">
      <div className="ps-error-copy">
        <span className="ps-error-kicker">{notFound ? '404 / PAGE NOT FOUND' : 'A LITTLE INTERRUPTION'}</span>
        <h1 id="ps-error-title">{notFound ? 'This page is missing from the stack.' : 'Something went wrong.'}</h1>
        <p>{notFound ? 'The link may have moved or the address may be incorrect. Your next paper is still waiting in the archive.' : 'We could not display this page. Try loading it again, or head home to keep exploring.'}</p>
        <div className="ps-error-actions">
          {!notFound && <button type="button" onClick={onRetry || (() => window.location.reload())}><RefreshCw size={18} /> Try again</button>}
          <a className={notFound ? 'primary' : ''} href="/"><Home size={18} /> Back to home</a>
          {notFound && <a href="/archive">Browse archive <ArrowRight size={18} /></a>}
        </div>
        {!notFound && <a className="ps-error-report" href="/report">Report a problem</a>}
      </div>
      <div className="ps-error-scene" aria-hidden="true"><img src={notFound ? '/404_not_found.png' : '/oops.png'} alt="" /></div>
    </section>
  </main>;
}

export default class ErrorBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error, info) { console.error('PaperStack render error:', error, info); }
  render() { return this.state.failed ? <ErrorState /> : this.props.children; }
}
