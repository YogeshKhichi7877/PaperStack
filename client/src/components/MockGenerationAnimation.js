import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import './MockGenerationAnimation.css';

export default function MockGenerationAnimation({ subject, totalMarks, durationMinutes, mockType }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="me-state me-generation-animation me-no-print" aria-busy="true" aria-label="Mock paper generation">
      <div className="me-assembly" aria-hidden="true">
        <span className="me-floating-symbol me-symbol-one">∑</span>
        <span className="me-floating-symbol me-symbol-two">x²</span>
        <span className="me-floating-symbol me-symbol-three">√</span>
        <div className="me-assembly-sheet">
          <div className="me-assembly-heading"><span /><Sparkles size={18} /></div>
          {[0, 1, 2, 3].map((row) => (
            <div className="me-assembly-row" key={row} style={{ '--row': row }}>
              <b>{row + 1}</b><div><span /><span /></div><i>✓</i>
            </div>
          ))}
          <div className="me-assembly-scan" />
        </div>
      </div>
      <div role="status" aria-live="polite">
        <h2>Building your mock paper<span className="me-loading-dots" aria-hidden="true">…</span></h2>
        <p>{elapsed >= 30
          ? 'Still working on your paper. AI questions can take a little longer to create and check.'
          : 'Preparing questions for your selected topics and checking the completed paper.'}</p>
      </div>
      <div className="me-assembly-settings">
        <span>{subject || 'Your subject'}</span><span>{totalMarks} marks</span>
        <span>{durationMinutes} min</span>
        <span>{mockType === 'new' ? 'Fresh Only' : mockType === 'pyq' ? 'PYQ Only' : 'PYQ + New'}</span>
      </div>
      <small>Your questions will appear here when the paper is ready.</small>
    </section>
  );
}
