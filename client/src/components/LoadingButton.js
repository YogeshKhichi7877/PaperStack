import React from 'react';

import './LoadingButton.css';

export default function LoadingButton({
  loading = false,
  loadingText = 'Working…',
  children,
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) {
  return (
    <button
      {...props}
      type={type}
      className={`loading-button ${className}`.trim()}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      data-loading={loading ? 'true' : 'false'}
    >
      <span className={`loading-button__content${loading ? ' is-hidden' : ''}`} aria-hidden={loading}>
        {children}
      </span>

      <span className={`loading-button__status${loading ? ' is-visible' : ''}`} aria-hidden={!loading}>
        <span className="loading-button__spinner" aria-hidden="true" />
        <span>{loadingText}</span>
      </span>
    </button>
  );
}
