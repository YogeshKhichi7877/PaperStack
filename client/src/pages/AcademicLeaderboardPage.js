import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Medal, TrendingUp, Users } from 'lucide-react';
import { getAcademicLeaderboard } from '../services/learningApi';
import LearningNav from '../components/LearningNav';
import './Update4.css';

export default function AcademicLeaderboardPage() {
  const [type, setType] = useState('rating');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; setData(null); setError(''); getAcademicLeaderboard({ type }).then((value) => active && setData(value)).catch(() => { if (active) setError('Rankings could not be loaded. Please try again.'); }); return () => { active = false; }; }, [type, retry]);
  return <main className="u4-page"><LearningNav active="rankings" /><header className="u4-simple-hero"><span className="u4-eyebrow">IIIT Surat academic rankings</span><h1>PaperStack Leaderboard</h1><p>Academic performance and community contribution are separate. This board ranks established practice ratings.</p></header><div className="u4-tabs"><button className={type === 'rating' ? 'active' : ''} onClick={() => setType('rating')}><Medal /> Academic Rating</button><button className={type === 'growth' ? 'active' : ''} onClick={() => setType('growth')}><TrendingUp /> Weekly Growth</button><Link to="/contributors"><Users /> Community Contributors</Link></div>
    {error ? <section className="u4-empty" role="alert"><div><b>{error}</b><button className="u4-button secondary" onClick={() => setRetry((value) => value + 1)}>Try again</button></div></section> : !data ? <div className="u4-loading"><Loader2 className="spin" /> Loading rankings…</div> : data.rows.length ? <div className="u4-leaderboard">{data.rows.map((row) => <Link to={`/u/${row.username}`} key={row.username}><strong>#{row.rank}</strong><span className="u4-avatar">{row.name.charAt(0).toUpperCase()}</span><span><b>{row.name}</b><small>{row.branch || 'IIIT Surat'} · Semester {row.semester || '—'} · {row.tier}</small></span><em>{type === 'growth' ? `${row.weeklyDelta >= 0 ? '+' : ''}${row.weeklyDelta}` : row.rating}</em></Link>)}</div> : <div className="u4-empty"><Medal /><div><b>No established public ratings yet.</b><span>Profiles enter rankings after 20 rated questions and opt-in visibility.</span></div></div>}
  </main>;
}
