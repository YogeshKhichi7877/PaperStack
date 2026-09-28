import React from 'react';
import owl from '../assets/Paperstack_auth_owl.png';
import './PaperStackLoader.css';

export default function PaperStackLoader({ label = 'Loading PaperStack...', compact = false }) {
  return <span className={`paperstack-loading${compact ? ' is-compact' : ''}`} role="status" aria-live="polite">
    <span className="paperstack-loading-art" aria-hidden="true">
      <span className="loading-sheet sheet-back" /><span className="loading-sheet sheet-front" />
      <img src={owl} alt="" />
    </span>
    <span className="paperstack-loading-label">{label}<span className="loading-dots" aria-hidden="true"><i /><i /><i /></span></span>
  </span>;
}
