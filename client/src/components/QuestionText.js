import React from 'react';

const MathAnswer = React.lazy(() => import('./MathAnswer'));

export default function QuestionText({ children, className = '', inline = false }) {
  const fallbackClassName = ['ps-question-math', className].filter(Boolean).join(' ');
  return (
    <React.Suspense fallback={inline
      ? <span className={fallbackClassName}>{children}</span>
      : <div className={fallbackClassName}>{children}</div>}
    >
      <MathAnswer
        className={fallbackClassName}
        inline={inline}
        normalizePlainMath
      >
        {children}
      </MathAnswer>
    </React.Suspense>
  );
}
