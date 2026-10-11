import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Brain, CheckCircle2, FileText, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import MathAnswer from '../components/MathAnswer';
import { askLearningTutor, completeLearningTutorSession } from '../services/learningApi';
import './Update4.css';

const MODES = [
  ['SIMPLE', 'Simple'], ['DEEP', 'Go deeper'], ['EXAMPLE', 'Show example'],
  ['LECTURE', 'Use my lecture'], ['EXAM', 'Exam focus'], ['DOUBT', 'Clear a doubt'],
];
const LOADING = ['Checking your topic history…', 'Reading the most relevant sources…', 'Building the explanation…'];

export default function LearningTutorPage({ user, toast }) {
  const { topicId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const subjectCode = params.get('subjectCode') || String(topicId || '').split(':')[0];
  const subjectName = params.get('subjectName') || subjectCode;
  const topicName = params.get('topicName') || String(topicId || '').split(':').slice(1).join(' ').replaceAll('-', ' ');
  const checkinId = params.get('checkinId') || '';
  const initialMode = params.get('mode')?.toUpperCase() || 'SIMPLE';
  const [mode, setMode] = useState(initialMode);
  const [data, setData] = useState(null);
  const [question, setQuestion] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const requestTutor = useCallback(async (nextMode, text = '', sessionId = '') => {
    setBusy(true); setLoadingStep(0);
    const timer = window.setInterval(() => setLoadingStep((step) => Math.min(LOADING.length - 1, step + 1)), 900);
    try {
      const result = await askLearningTutor({
        subjectCode, subjectName, topicKey: decodeURIComponent(topicId), topicName,
        checkinId: checkinId || undefined, sessionId: sessionId || data?.session?._id, mode: nextMode, question: text,
      });
      setData(result); setMode(nextMode); setQuestion('');
    } catch (error) {
      const response = error.response?.data;
      if (response?.fallback) setData(response);
      toast?.(response?.error || 'PaperStack AI could not prepare this explanation.', 'error');
    } finally { window.clearInterval(timer); setBusy(false); }
  }, [checkinId, data?.session?._id, subjectCode, subjectName, toast, topicId, topicName]);

  useEffect(() => { if (user && !data && !busy) requestTutor(initialMode); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const reply = data?.reply;
  const practiceUrl = useMemo(() => `/practice?subjectCode=${encodeURIComponent(subjectCode)}&topicKey=${encodeURIComponent(topicId)}&topicName=${encodeURIComponent(topicName)}`, [subjectCode, topicId, topicName]);

  if (!user) return <main className="u4-page"><section className="u4-empty"><Brain /><div><b>Sign in to use your personal topic tutor.</b><Link to="/login">Sign in</Link></div></section></main>;

  const complete = async () => {
    if (data?.session?._id) await completeLearningTutorSession(data.session._id).catch(() => {});
    navigate(practiceUrl);
  };
  const runAction = (label) => {
    if (/example/i.test(label)) requestTutor('EXAMPLE');
    else if (/deeper/i.test(label)) requestTutor('DEEP');
    else if (/compare/i.test(label)) requestTutor('DOUBT', `Compare ${topicName} with Mutex and focus on the practical difference.`);
    else if (/practice/i.test(label)) complete();
    else { setMode('DOUBT'); document.getElementById('tutor-follow-up')?.focus(); }
  };

  return <main className="u4-page u4-tutor-page">
    <header className="u4-tutor-header"><div><span className="u4-eyebrow">{subjectName} · Topic tutor</span><h1>{topicName}</h1><p>Explanation shaped by your practice, doubts and private class material.</p></div>{data?.studentContext && <div className="u4-level-card"><span>Learning level</span><strong>{data.studentContext.learningLevel}</strong><small>{data.studentContext.mastery.score}% mastery · {data.studentContext.mastery.attempts} attempts</small></div>}</header>
    <nav className="u4-tutor-modes" aria-label="Explanation style">{MODES.map(([key, label]) => <button type="button" key={key} className={mode === key ? 'active' : ''} onClick={() => requestTutor(key)} disabled={busy}>{label}</button>)}</nav>
    {busy && <section className="u4-tutor-loading" role="status"><Loader2 className="spin" /><strong>{LOADING[loadingStep]}</strong><span>PaperStack sends only compact topic context, not your full history.</span></section>}
    {!busy && data?.fallback && <section className="u4-tutor-fallback"><Brain /><div><h2>AI is taking a break</h2><p>Your learning data is safe. You can open the available sources or start question-bank practice now.</p><Link className="u4-button primary" to={practiceUrl}>Practice this topic</Link></div></section>}
    {!busy && reply && <>
      <section className="u4-tutor-answer"><div className="u4-card-heading"><span><Sparkles /></span><div><small>{mode.replace('_', ' ').toLowerCase()} explanation</small><h2>{reply.title}</h2></div></div><MathAnswer normalizePlainMath>{reply.explanation}</MathAnswer>{reply.keyPoints?.length > 0 && <div className="u4-key-points"><h3>Remember</h3>{reply.keyPoints.map((point) => <p key={point}><CheckCircle2 /> {point}</p>)}</div>}{reply.example && <div className="u4-tutor-example"><h3>Example</h3><MathAnswer normalizePlainMath>{reply.example}</MathAnswer></div>}{reply.misconception && <div className="u4-misconception"><strong>Watch for this</strong><p>{reply.misconception}</p></div>}</section>
      {reply.quickCheck?.question && <section className="u4-quick-check"><span className="u4-eyebrow">Optional quick check</span><h2>{reply.quickCheck.question}</h2><p>This helps the tutor respond, but it does not change mastery or PSR.</p><button className="u4-button secondary" type="button" onClick={() => { setMode('QUICK_CHECK'); setQuestion(''); document.getElementById('tutor-follow-up')?.focus(); }}>Answer this check</button></section>}
      <section className="u4-tutor-followup"><div><MessageCircle /><span><b>Still unsure?</b><small>Ask within {topicName}; the tutor keeps this topic’s recent context.</small></span></div><textarea id="tutor-follow-up" value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} maxLength={3000} placeholder={mode === 'QUICK_CHECK' ? 'Write your answer to the quick check…' : 'Ask a specific doubt…'} /><button className="u4-button primary" type="button" onClick={() => requestTutor(mode === 'QUICK_CHECK' ? 'QUICK_CHECK' : 'DOUBT', question)} disabled={!question.trim() || busy}>Ask follow-up</button></section>
      <div className="u4-tutor-actions">{(reply.suggestedActions || []).map((label) => <button type="button" key={label} onClick={() => runAction(label)}>{label}</button>)}<button type="button" className="primary" onClick={complete}>Practice now <ArrowRight /></button></div>
    </>}
    {data?.sources?.length > 0 && <section className="u4-tutor-sources"><h2><BookOpen /> Sources used</h2><p>Private material is visible only to you.</p><div>{data.sources.map((source, index) => <article key={`${source.sourceType}-${source.resourceId}-${index}`}><FileText /><span><b>{source.title}</b><small>{source.sourceType === 'PRIVATE_CLASS_MATERIAL' ? `Your private class material${source.locatorNumber ? ` · ${source.locatorType.toLowerCase()} ${source.locatorNumber}` : ''}` : source.sourceType === 'PAPERSTACK_PYQ' ? 'Verified previous-year question' : 'Verified PaperStack resource'}</small></span></article>)}</div></section>}
  </main>;
}
