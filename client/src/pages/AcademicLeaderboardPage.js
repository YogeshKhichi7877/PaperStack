import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Medal, TrendingUp, Users } from 'lucide-react';
import { getAcademicLeaderboard } from '../services/learningApi';
import './Update4.css';

export default function AcademicLeaderboardPage() {
  const [type, setType] = useState('rating');
  const [data, setData] = useState(null);
  useEffect(() => { let active = true; getAcademicLeaderboard({ type }).then((value) => active && setData(value)); return () => { active = false; }; }, [type]);
  return <main className="u4-page"><header className="u4-simple-hero"><span className="u4-eyebrow">IIIT Surat academic rankings</span><h1>PaperStack Leaderboard</h1><p>Academic performance and community contribution are separate. This board ranks established practice ratings.</p></header><div className="u4-tabs"><button className={type === 'rating' ? 'active' : ''} onClick={() => setType('rating')}><Medal /> Academic Rating</button><button className={type === 'growth' ? 'active' : ''} onClick={() => setType('growth')}><TrendingUp /> Weekly Growth</button><Link to="/contributors"><Users /> Community Contributors</Link></div>
    {!data ? <div className="u4-loading"><Loader2 className="spin" /> Loading rankings…</div> : data.rows.length ? <div className="u4-leaderboard">{data.rows.map((row) => <Link to={`/u/${row.username}`} key={row.username}><strong>#{row.rank}</strong><span className="u4-avatar">{row.name.charAt(0).toUpperCase()}</span><span><b>{row.name}</b><small>{row.branch || 'IIIT Surat'} · Semester {row.semester || '—'} · {row.tier}</small></span><em>{type === 'growth' ? `${row.weeklyDelta >= 0 ? '+' : ''}${row.weeklyDelta}` : row.rating}</em></Link>)}</div> : <div className="u4-empty"><Medal /><div><b>No established public ratings yet.</b><span>Profiles enter rankings after 20 rated questions and opt-in visibility.</span></div></div>}
  </main>;
}
