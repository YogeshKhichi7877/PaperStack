import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

const destinations = [['learn', '/learn', 'Today'], ['practice', '/practice', 'Practice'], ['progress', '/learning-dashboard', 'My progress'], ['profile', '/profile', 'Academic profile'], ['rankings', '/leaderboard', 'Rankings']];

export default function LearningNav({ active }) {
  return <nav className="u4-workspace-nav" aria-label="Learning workspace">
    <span className="u4-workspace-label">Your study desk</span>
    <div>{destinations.map(([key, to, label]) => <Link key={key} to={to} aria-current={active === key ? 'page' : undefined}>{label}</Link>)}</div>
    <Link className="u4-archive-link" to="/archive">Archive <ArrowUpRight size={15} /></Link>
  </nav>;
}
