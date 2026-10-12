import React from 'react';
import { Link } from 'react-router-dom';

const destinations = [['learn', '/learn', 'My learning'], ['practice', '/practice', 'Practice'], ['progress', '/learning-dashboard', 'My progress']];

export default function LearningNav({ active }) {
  return <nav className="u4-workspace-nav" aria-label="Learning workspace">
    <span className="u4-workspace-label">Your study desk</span>
    <div>{destinations.map(([key, to, label]) => <Link key={key} to={to} aria-current={active === key ? 'page' : undefined}>{label}</Link>)}</div>
    <details className="u4-more-nav"><summary>More</summary><div><Link to="/profile">Academic profile</Link><Link to="/leaderboard">Rankings</Link><Link to="/archive">Archive</Link></div></details>
  </nav>;
}
