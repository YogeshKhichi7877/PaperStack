import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../config/appConfig';
import { adminHeader } from '../services/authHeaders';
import './LiveUsagePanel.css';

const time = (value) => new Date(value).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' });
function liveFailure(error) {
  const status = error?.response?.status;
  if (status === 401 || status === 403) return 'Your admin session has expired. Sign in to Admin again to see live usage.';
  if (status === 404) return 'Live usage is not available on the deployed backend yet.';
  if (status === 429) return 'Too many requests. Live usage will refresh shortly.';
  if (status === 503) return 'Live usage is unavailable on the backend. Check its Redis connection and Render logs.';
  if (!error?.response) return 'Could not reach the backend. Check your connection and try again.';
  return 'Could not load live usage. Please try again shortly.';
}
export default function LiveUsagePanel() {
  const [live, setLive] = useState(null);
  const [history, setHistory] = useState(null);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState(false);
  useEffect(() => {
    let active = true, pending = false;
    const controller = new AbortController();
    const refresh = async () => {
      if (document.visibilityState === 'hidden' || pending) return;
      pending = true;
      const options = { headers: adminHeader(), signal: controller.signal, timeout: 10000 };
      const [current, past] = await Promise.allSettled([
        axios.get(`${API_URL}/api/admin/analytics/live`, options),
        axios.get(`${API_URL}/api/admin/analytics/presence/history`, options),
      ]);
      pending = false;
      if (!active) return;
      setLive(current.status === 'fulfilled' ? current.value.data : null);
      setError(current.status === 'fulfilled' ? '' : liveFailure(current.reason));
      setHistory(past.status === 'fulfilled' ? past.value.data : null);
      setHistoryError(past.status !== 'fulfilled');
    };
    refresh();
    const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => { active = false; controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const samples = history?.samples || [];
  const max = Math.max(1, ...samples.map((item) => item.activeUsers));
  const end = Date.now(), start = end - 86400000;
  const point = (item) => `${Math.max(0, (new Date(item.sampledAt).getTime() - start) / 86400000 * 600)},${100 - item.activeUsers / max * 90}`;
  // Separate paths across missed snapshots rather than inventing continuous activity.
  const segments = samples.reduce((groups, item, index) => {
    if (!index || new Date(item.sampledAt) - new Date(samples[index - 1].sampledAt) > 450000) groups.push([]);
    groups[groups.length - 1].push(item); return groups;
  }, []);
  return <section className="live-usage" aria-labelledby="live-usage-title">
    <header><div><span>Admin only · PaperStack Live Analytics</span><h2 id="live-usage-title">Live usage</h2></div>{live && <small>Updated {time(live.sampledAt)} IST</small>}</header>
    <p>Approximate unique students and guests seen in the last 90 seconds. Hidden or idle tabs stop reporting. Admin visits are excluded.</p>
    {error ? <p role="status">{error}</p> : !live ? <p role="status">Loading live usage…</p> : <>
      <dl className="live-usage-metrics">{[['Active users', live.activeUsers], ['Signed in', live.authenticatedUsers], ['Guests', live.guests], ['Active sessions', live.activeSessions], ['Today’s sampled peak', history?.peakToday ?? '—']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      <div className="live-usage-pages"><h3>Pages in use</h3>{Object.entries(live.pages).length ? <ul>{Object.entries(live.pages).map(([page, count]) => <li key={page}><span>{page.replace(/_/g, ' ').toLowerCase()}</span><strong>{count}</strong></li>)}</ul> : <p>No active student or guest sessions.</p>}</div>
    </>}
    <h3>Last 24 hours</h3>
    {historyError ? <p>Usage history is temporarily unavailable.</p> : !history ? <p>Loading history…</p> : !samples.length ? <p>No samples yet. History is saved every five minutes when Redis and the database are available.</p> : <>
      <svg viewBox="0 0 600 115" role="img" aria-label={`Active users over 24 hours. Highest recorded sample: ${max}. ${samples.length} samples. Gaps indicate missing samples.`}>
        <line x1="0" y1="100" x2="600" y2="100" stroke="#c5dbde" />
        {segments.map((segment, index) => <polyline key={index} points={segment.map(point).join(' ')} fill="none" stroke="#00858d" strokeWidth="2" />)}
        {samples.map((sample) => { const [cx, cy] = point(sample).split(','); return <circle key={sample.bucket} cx={cx} cy={cy} r="2" fill="#00858d"><title>{time(sample.sampledAt)} IST: {sample.activeUsers} active users</title></circle>; })}
      </svg>
      <div className="live-usage-axis"><small>24 hours ago</small><small>Now</small></div>
      <p>Peak today: {history.peakToday ?? '—'}{history.peakTime ? ` at ${time(history.peakTime)} IST` : ''}. Based on five-minute samples, not every visit. History kept for 60 days.</p>
    </>}
  </section>;
}
