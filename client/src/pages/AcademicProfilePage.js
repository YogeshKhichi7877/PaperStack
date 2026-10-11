import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Award, Eye, EyeOff, Loader2 } from 'lucide-react';
import { getAcademicProfile, getLearningDashboard, setAcademicProfileVisibility } from '../services/learningApi';
import LearningNav from '../components/LearningNav';
import './Update4.css';

export default function AcademicProfilePage({ user, toast }) {
  const { username } = useParams();
  const own = !username || username === user?.username;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [isPublic, setIsPublic] = useState(Boolean(user?.academicProfilePublic));
  useEffect(() => {
    if (own && !user) return undefined;
    let active = true;
    setData(null); setError('');
    setIsPublic(Boolean(user?.academicProfilePublic));
    const request = own ? getLearningDashboard().then((dashboard) => ({ user, rating: dashboard.rating, masteryOverview: dashboard.mastery.slice(0, 12), masteredTopics: dashboard.mastery.filter((item) => item.status === 'STRONG').length, streak: dashboard.streak, badges: dashboard.badges, subjectRatings: dashboard.rating.subjectRatings || [] })) : getAcademicProfile(username);
    request.then((value) => { if (active) setData(value); }).catch((error) => { if (active) setError(error.response?.data?.error || 'Profile is private or unavailable.'); });
    return () => { active = false; };
  }, [own, toast, user, username]);
  if (own && !user) return <main className="u4-page"><div className="u4-empty"><Award /><div><b>Sign in to view your academic profile.</b><Link to="/login">Continue with Google</Link></div></div></main>;
  if (error) return <main className="u4-page"><LearningNav active="profile" /><section className="u4-empty" role="alert"><div><b>{error}</b><Link to="/learn">Back to learning</Link></div></section></main>;
  if (!data) return <main className="u4-page"><div className="u4-loading"><Loader2 className="spin" /> Loading academic profile…</div></main>;
  const profileUser = data.user || user;
  const toggle = async () => { if (saving) return; setSaving(true); const next = !isPublic; try { await setAcademicProfileVisibility(next); setIsPublic(next); toast?.(next ? 'Academic profile is now public.' : 'Academic profile is now private.', 'success'); } catch { toast?.('Could not change profile privacy.', 'error'); } finally { setSaving(false); } };
  return <main className="u4-page"><LearningNav active="profile" /><section className="u4-profile-hero"><div className="u4-profile-avatar">{(profileUser?.name || profileUser?.displayName || profileUser?.username || 'P').charAt(0).toUpperCase()}</div><div><span className="u4-eyebrow">PaperStack academic profile</span><h1>{profileUser?.name || profileUser?.displayName || profileUser?.username}</h1><p>{profileUser?.branch || 'IIIT Surat'} · Semester {profileUser?.semester || '—'}</p></div><div className="u4-profile-rating"><small>PSR</small><strong>{data.rating?.globalRating || 1000}</strong><span>{data.rating?.provisional ? 'PROVISIONAL' : data.rating?.tier}</span></div></section>
    {own && <button className="u4-privacy" onClick={toggle} disabled={saving}>{isPublic ? <Eye /> : <EyeOff />} {isPublic ? 'Public profile enabled' : 'Profile is private'}<small>{isPublic ? `Share /u/${user.username}` : 'Turn on visibility to join rankings'}</small></button>}
    <section className="u4-dashboard-metrics"><article><Award /><span>Mastered topics</span><strong>{data.masteredTopics || 0}</strong></article><article><span>Meaningful streak</span><strong>{data.streak?.current || 0}</strong><small>days</small></article><article><span>Community reputation</span><strong>{data.communityReputation || 0}</strong></article></section>
    <section className="u4-two-column"><article className="u4-panel"><div className="u4-section-title"><div><span className="u4-eyebrow">Subject ratings</span><h2>Academic strengths</h2></div></div>{data.subjectRatings?.length ? data.subjectRatings.map((item) => <div className="u4-rating-row" key={item.subjectCode}><span><b>{item.subjectCode}</b><small>{item.ratedCount} rated questions</small></span><strong>{item.rating}</strong></div>) : <p className="u4-muted">Subject ratings appear after rating-eligible objective practice.</p>}</article><article className="u4-panel"><div className="u4-section-title"><div><span className="u4-eyebrow">Mastery overview</span><h2>Topic overview</h2></div></div>{data.masteryOverview?.length ? data.masteryOverview.slice(0, 8).map((item) => <div className="u4-rating-row" key={item.topicKey || item._id}><span><b>{item.topicName}</b><small>{item.subjectCode} · {item.status}</small></span><strong>{item.masteryScore}%</strong></div>) : <p className="u4-muted">No public mastery summary yet.</p>}</article></section>
    {own && <div className="u4-profile-links"><Link to="/learning-dashboard">Learning dashboard</Link><Link to="/settings">Account settings</Link></div>}
  </main>;
}
