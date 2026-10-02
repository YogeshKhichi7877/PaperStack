import React from 'react';

import './ContentSkeleton.css';

export default function ContentSkeleton({
  count = 4,
  variant = 'cards',
  label = 'Loading content…',
  className = '',
}) {
  return (
    <section className={`content-skeleton is-${variant} ${className}`.trim()} role="status" aria-label={label}>
      {Array.from({ length: count }, (_, index) => (
        <article key={index} className="content-skeleton__item" aria-hidden="true">
          <span className="content-skeleton__eyebrow" />
          <span className="content-skeleton__title" />
          <span className="content-skeleton__line" />
          <span className="content-skeleton__line is-short" />
        </article>
      ))}
      <span className="sr-only">{label}</span>
    </section>
  );
}
