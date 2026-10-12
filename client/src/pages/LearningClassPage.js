import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { createPracticeSession, getLearningCheckin } from '../services/learningApi';
import './Update4.css';

export default function LearningClassPage({ checkinId, user }) {
  const navigate = useNavigate();
  const [checkin, setCheckin] = useState(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const mounted = useRef(false);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    setCheckin(null); setError('');
    if (user) getLearningCheckin(checkinId).then((value) => { if (active) setCheckin(value.checkin); })
      .catch((err) => { if (active) setError(err.response?.data?.error || 'Could not load this saved class. Please try again.'); });
    return () => { active = false; mounted.current = false; };
  }, [checkinId, retry, user]);

  const practice = async () => {
    if (busy) return;
    if (checkin.practiceSessionId && !checkin.completedPractice) {
      navigate(`/practice?sessionId=${checkin.practiceSessionId}&checkinId=${encodeURIComponent(checkinId)}`);
      return;
    }
    setBusy(true); setError('');
    try {
      const result = await createPracticeSession({ checkinId, subjectCode: checkin.subjectCode, topics: checkin.topics, mode: 'DAILY', count: 5 });
      if (mounted.current) navigate(`/practice?sessionId=${result.session._id}&checkinId=${encodeURIComponent(checkinId)}`);
    } catch (err) { setError(err.response?.data?.error || 'Practice is temporarily unavailable. Your class is saved — try again shortly.'); }
    finally { setBusy(false); }
  };
  const openTopic = (topic) => {
    const query = new URLSearchParams({ subjectCode: checkin.subjectCode, subjectName: checkin.subjectName, topicName: topic.name, checkinId });
    navigate(`/learn/topic/${encodeURIComponent(topic.topicKey)}?${query}`);
  };
  const topics = checkin?.topics || [];
  const pendingTopics = topics.filter((topic) => !checkin?.understoodTopicKeys?.includes(topic.topicKey));
  const nextTopic = pendingTopics.find((topic) => topic.topicKey === checkin?.lastTopicKey) || pendingTopics[0];
  const resumePractice = checkin?.practiceSessionId && !checkin.completedPractice;
  return <main className="u4-page u4-class-page">
    <div className="u4-flow-nav"><Link to="/learn"><ArrowLeft size={17} /> My classes</Link><span>Class saved · Continue anytime</span></div>
    {!user ? <Link to="/login">Sign in to continue learning</Link> : <>
      {error && <div className="u4-inline-error" role="alert">{error}{!checkin && <button className="u4-button secondary" onClick={() => setRetry((value) => value + 1)}>Try again</button>}</div>}
      {!checkin && !error && <p role="status"><Loader2 className="spin" /> Opening your class…</p>}
      {checkin && <>
        <header className="u4-simple-hero"><span className="u4-eyebrow">Your saved class · {new Date(checkin.createdAt).toLocaleDateString('en-IN')}</span><h1>{checkin.subjectName}</h1><p>{checkin.originalText}</p></header>
        <div className="u4-class-layout">
          <section className="u4-panel u4-class-next"><span className="u4-eyebrow">{resumePractice ? 'Continue where you stopped' : checkin.completedPractice ? 'Class practice completed' : 'Your next step'}</span><h2>{resumePractice ? 'Your practice is waiting.' : nextTopic ? `Let’s understand ${nextTopic.name}.` : checkin.completedPractice ? 'A little more confident.' : 'Ready to try it yourself?'}</h2><p>{resumePractice ? 'Your submitted answers are saved. Pick up at the next unanswered question.' : nextTopic ? 'Read a short explanation, ask a doubt if you need to, then move on to practice.' : 'Practise your class topics and see a short explanation after each answer.'}</p>
            <button className="u4-button primary" disabled={busy} onClick={() => resumePractice || !nextTopic ? practice() : openTopic(nextTopic)}>{busy ? <><Loader2 className="spin" /> Preparing questions…</> : resumePractice ? 'Resume practice' : nextTopic ? 'Continue learning' : checkin.completedPractice ? 'Practise again' : 'Start practice'} <ArrowRight size={18} /></button>
            {nextTopic && !resumePractice && <button className="u4-text-button" disabled={busy} onClick={practice}>{busy ? 'Preparing questions…' : 'I understand these topics — practise now'}</button>}
            <small>Practice uses available questions and AI-generated questions when more are needed.</small>
          </section>
          <section className="u4-panel"><span className="u4-eyebrow">In this class</span><h2>{topics.length} {topics.length === 1 ? 'concept' : 'concepts'}, one step at a time</h2><ol className="u4-class-topics">{topics.map((topic) => <li key={topic.topicKey}><button onClick={() => openTopic(topic)}><span>{topic.name}</span>{checkin.understoodTopicKeys?.includes(topic.topicKey) ? <CheckCircle2 aria-label="Studied" size={18} /> : <ArrowRight size={17} />}</button></li>)}</ol></section>
        </div>
      </>}
    </>}
  </main>;
}
