import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Brain, CheckCircle2, Clock3, Loader2, RotateCcw, Target } from 'lucide-react';
import { createPracticeSession, getLearningDashboard, getPracticeSession, submitPracticeAttempt } from '../services/learningApi';
import { MasteryBar } from './LearningTodayPage';
import './Update4.css';

export default function PracticePage({ user, toast }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get('sessionId');
  const requestedSubjectCode = params.get('subjectCode');
  const requestedTopicKey = params.get('topicKey');
  const requestedTopicName = params.get('topicName') || 'Topic';
  const [data, setData] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [answer, setAnswer] = useState('');
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const startedAt = useRef(Date.now());
  const autoLaunchKey = useRef('');

  useEffect(() => {
    let active = true;
    if (!user) return undefined;
    const request = sessionId ? getPracticeSession(sessionId) : getLearningDashboard();
    request.then((value) => { if (active) sessionId ? setData(value) : setDashboard(value); }).catch((error) => toast?.(error.response?.data?.error || 'Could not load practice.', 'error'));
    return () => { active = false; };
  }, [sessionId, toast, user]);

  useEffect(() => {
    if (!user || sessionId || !requestedSubjectCode || !requestedTopicKey) return;
    const key = `${requestedSubjectCode}:${requestedTopicKey}`;
    if (autoLaunchKey.current === key) return;
    autoLaunchKey.current = key;
    setBusy(true);
    createPracticeSession({
      subjectCode: requestedSubjectCode,
      subjectName: requestedSubjectCode,
      topics: [{ topicKey: requestedTopicKey, name: requestedTopicName }],
      mode: 'TOPIC',
      count: 5,
    }).then((created) => navigate(`/practice?sessionId=${created.session._id}`, { replace: true }))
      .catch((error) => {
        toast?.(error.response?.data?.error || 'No suitable questions are available for this topic yet.', 'error');
        autoLaunchKey.current = '';
      })
      .finally(() => setBusy(false));
  }, [navigate, requestedSubjectCode, requestedTopicKey, requestedTopicName, sessionId, toast, user]);

  const question = data?.questions?.[index];
  const answeredIds = useMemo(() => new Set((data?.attempts || []).map((item) => String(item.questionId))), [data]);

  if (!user) return <main className="u4-page"><div className="u4-empty"><Brain /><div><b>Sign in to build mastery.</b><span>Practice attempts belong to your private academic record.</span><Link to="/login">Continue with Google</Link></div></div></main>;
  if (!data && sessionId) return <main className="u4-page"><div className="u4-loading"><Loader2 className="spin" /> Loading practice…</div></main>;

  const launch = async (topic, mode) => {
    setBusy(true);
    try {
      const created = await createPracticeSession({ subjectCode: topic.subjectCode, subjectName: topic.subjectName, topics: [{ topicKey: topic.topicKey, name: topic.topicName }], mode, count: mode === 'WEAK_TOPIC' ? 10 : 5 });
      navigate(`/practice?sessionId=${created.session._id}`);
    } catch (error) { toast?.(error.response?.data?.error || 'No suitable questions are available yet.', 'error'); }
    finally { setBusy(false); }
  };

  if (!sessionId) return (
    <main className="u4-page"><header className="u4-simple-hero"><span className="u4-eyebrow">Practice</span><h1>What should you do right now?</h1><p>PaperStack prioritizes due reviews and weak concepts before broad exam practice.</p></header>
      <section className="u4-practice-launch-grid">
        <article><Clock3 /><h2>Review due</h2><p>{dashboard?.dueReviews?.length || 0} concepts scheduled</p>{dashboard?.dueReviews?.[0] ? <button disabled={busy} onClick={() => launch(dashboard.dueReviews[0], 'REVIEW')}>Review {dashboard.dueReviews[0].topicName}<ArrowRight /></button> : <span>Nothing overdue</span>}</article>
        <article><Target /><h2>Weak topics</h2><p>Practice where improvement matters most.</p>{dashboard?.weakTopics?.[0] ? <button disabled={busy} onClick={() => launch(dashboard.weakTopics[0], 'WEAK_TOPIC')}>Practice {dashboard.weakTopics[0].topicName}<ArrowRight /></button> : <span>Complete practice to reveal weak topics</span>}</article>
        <article><Brain /><h2>Mock exams</h2><p>Longer, exam-shaped practice from the PYQ bank.</p><Link to="/mock-exams">Build a mock <ArrowRight /></Link></article>
        <article><RotateCcw /><h2>PYQ practice</h2><p>Explore real exam questions by subject and topic.</p><Link to="/questions">Open question bank <ArrowRight /></Link></article>
      </section>
    </main>
  );

  const submit = async () => {
    if (!answer.trim()) return toast?.('Write or select an answer first.', 'info');
    setBusy(true);
    try {
      const response = await submitPracticeAttempt(sessionId, { questionId: question._id, answer, timeSpentSeconds: Math.round((Date.now() - startedAt.current) / 1000), hintsUsed: 0, clientAttemptId: `${sessionId}-${question._id}-${Date.now()}` });
      setResult(response);
      setData((current) => ({ ...current, attempts: [...(current.attempts || []), response.attempt] }));
    } catch (error) { toast?.(error.response?.data?.error || 'Evaluation temporarily unavailable.', 'error'); }
    finally { setBusy(false); }
  };

  const next = () => {
    const nextIndex = data.questions.findIndex((item, itemIndex) => itemIndex > index && !answeredIds.has(String(item._id)));
    if (nextIndex >= 0) { setIndex(nextIndex); setAnswer(''); setResult(null); startedAt.current = Date.now(); }
    else navigate('/dashboard');
  };

  return (
    <main className="u4-page u4-practice-page"><header className="u4-practice-header"><div><span className="u4-eyebrow">{data.session.mode.replace(/_/g, ' ')} practice</span><h1>{data.session.subjectName || data.session.subjectCode}</h1></div><div><strong>{index + 1} / {data.questions.length}</strong><MasteryBar value={((index + (result ? 1 : 0)) / data.questions.length) * 100} /></div></header>
      <section className="u4-question-card"><div className="u4-question-meta"><span>{question.sourceType === 'PYQ' ? 'Previous-year question' : 'PaperStack practice'}</span><span>{question.difficulty}</span><span>{question.marks || 1} marks</span></div><h2>{question.questionText}</h2>{question.options?.length ? <div className="u4-options">{question.options.map((option) => <label key={option} className={answer === option ? 'selected' : ''}><input type="radio" name="answer" checked={answer === option} onChange={() => setAnswer(option)} />{option}</label>)}</div> : <textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={7} placeholder="Write your answer. Explain the concept clearly…" maxLength={12000} />}
        {!result ? <button className="u4-button primary" disabled={busy} onClick={submit}>{busy ? <><Loader2 className="spin" /> Evaluating your answer…</> : 'Submit answer'}</button> : <div className={`u4-result ${result.evaluation.correct ? 'correct' : ''}`}><div><CheckCircle2 /><span><b>{Math.round(result.evaluation.actualScore * 100)}% estimated</b><small>{result.evaluation.feedback}</small></span></div>{result.mastery?.map((item) => <p key={item.topicKey}>{item.topicName}: <strong>{item.masteryScore}% mastery</strong> · {Math.round(item.masteryConfidence * 100)}% confidence</p>)}{result.rating && <p>PSR {result.rating.oldRating} → <strong>{result.rating.globalRating} ({result.rating.delta >= 0 ? '+' : ''}{result.rating.delta})</strong></p>}<button className="u4-button primary" onClick={next}>{result.complete ? 'Finish session' : 'Next question'} <ArrowRight /></button></div>}
      </section>
    </main>
  );
}
