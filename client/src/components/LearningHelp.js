import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import './LearningHelp.css';

export default function LearningHelp() {
  const dialog = useRef(null);
  return <>
    <button type="button" className="landing-button landing-button-secondary" onClick={() => dialog.current.showModal()}>See how it works</button>
    {createPortal(<dialog ref={dialog} className="learning-help" aria-labelledby="learning-help-title" onClick={(event) => { if (event.target === dialog.current) dialog.current.close(); }}>
      <h2 id="learning-help-title">A little practice after every class</h2>
      <p>Turn what your teacher covered into a study plan you can return to anytime.</p>
      <ol>
        <li><strong>Tell us what you learned.</strong> Write a few lines about your class, check the suggested topics and save.</li>
        <li><strong>Understand one topic.</strong> Read a simple explanation or ask a doubt. Your saved class stays in My learning.</li>
        <li><strong>Try practice questions.</strong> Check your answer and read the short explanation, especially when you get it wrong.</li>
        <li><strong>Come back and review.</strong> Use Continue learning to pick up where you left off. My progress in your dashboard shows what needs more practice.</li>
      </ol>
      <p>You do not need to finish everything at once. A short, regular review helps you remember more.</p>
      <form method="dialog"><button className="landing-button landing-button-primary" autoFocus>Got it</button></form>
    </dialog>, document.body)}
  </>;
}
