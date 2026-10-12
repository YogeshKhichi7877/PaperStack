import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Brain, CheckCircle2, Clock3, Loader2, RotateCcw, Target, XCircle } from 'lucide-react';
import MathAnswer from '../components/MathAnswer';
import { createPracticeSession, getLearningDashboard, getPracticeSession, submitPracticeAttempt } from '../services/learningApi';
import { MasteryBar } from './LearningTodayPage';
import LearningNav from '../components/LearningNav';
import './Update4.css';

export default function PracticePage({ user, toast }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = params.get('sessionId');
  const requestedSubjectCode = params.get('subjectCode');
  const requestedTopicKey = params.get('topicKey');
  const requestedTopicName = params.get('topicName') || 'Topic';
  const checkinId = params.get('checkinId') || '';
  const [data, setData] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [answer, setAnswer] = useState('');
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const submitting = useRef(false);
  const startedAt = useRef(Date.now());
  const autoLaunchKey = useRef('');

  useEffect(() => {
    let active = true;
    if (!user) return undefined;
    setLoadError(''); setSubmitError(''); setLoaded(false); setData(null); setResult(null); setAnswer(''); setIndex(0);
    const request = sessionId ? getPracticeSession(sessionId) : getLearningDashboard();
    request.then((value) => {
      if (!active) return;
      if (sessionId) {
        setData(value);
        const completedIds = new Set((value.attempts || []).map((attempt) => String(attempt.questionId)));
        const firstUnanswered = (value.questions || []).findIndex((item) => !completedIds.has(String(item._id)));
        setIndex(firstUnanswered < 0 ? value.questions.length : firstUnanswered);
        startedAt.current = Date.now();
      } else setDashboard(value);
      setLoaded(true);
    }).catch((error) => { if (active) { setLoadError(error.response?.data?.error || 'Could not load practice.'); setLoaded(true); } });
    return () => { active = false; };
  }, [sessionId, toast, user, reload]);

  useEffect(() => {
    if (!user || sessionId || !requestedSubjectCode || !requestedTopicKey) return;
    const key = `${checkinId}:${requestedSubjectCode}:${requestedTopicKey}`;
    if (autoLaunchKey.current === key) return;
    autoLaunchKey.current = key;
    let active = true;
    setBusy(true);
    createPracticeSession({
      subjectCode: requestedSubjectCode,
      subjectName: requestedSubjectCode,
      topics: [{ topicKey: requestedTopicKey, name: requestedTopicName }],
      mode: 'TOPIC',
      checkinId: checkinId || undefined,
      count: 5,
    }).then((created) => { if (active) navigate(`/practice?sessionId=${created.session._id}${checkinId ? `&checkinId=${encodeURIComponent(checkinId)}` : ''}`, { replace: true }); })
      .catch((error) => {
        if (!active) return;
        toast?.(error.response?.data?.error || 'No suitable questions are available for this topic yet.', 'error');
        setLoadError(error.response?.data?.error || 'No suitable questions are available for this topic yet.');
      })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; if (autoLaunchKey.current === key) autoLaunchKey.current = ''; };
  }, [navigate, requestedSubjectCode, requestedTopicKey, requestedTopicName, sessionId, toast, user, reload, checkinId]);

  const question = data?.questions?.[index];
  const answeredIds = useMemo(() => new Set((data?.attempts || []).map((item) => String(item.questionId))), [data]);
  const savedClassId = data?.session?.checkinId || checkinId;
  const classUrl = savedClassId ? `/learn?class=${encodeURIComponent(savedClassId)}` : '/learn';

  if (!user) return <main className="u4-page"><div className="u4-empty"><Brain /><div><b>Sign in to build mastery.</b><span>Practice attempts belong to your private academic record.</span><Link to="/login">Continue with Google</Link></div></div></main>;
  if (loadError) return <main className="u4-page"><LearningNav active="practice" /><section className="u4-empty" role="alert"><div><b>{loadError}</b><div className="u4-actions"><button className="u4-button secondary" onClick={() => { autoLaunchKey.current = ''; setReload((value) => value + 1); }}>Try again</button><Link to="/learn">Back to learning</Link></div></div></section></main>;
  if ((!data && sessionId) || (!loaded && !sessionId) || (!sessionId && busy && requestedTopicKey)) return <main className="u4-page"><div className="u4-flow-nav"><Link to={classUrl}><ArrowLeft size={17} /> Back to class</Link></div><div className="u4-loading" role="status"><Loader2 className="spin" /> {sessionId ? 'Opening your saved practice…' : 'Preparing questions for your topics…'}</div><p className="u4-muted">Your class is saved. Preparing new questions can take a moment.</p></main>;

  const launch = async (topic, mode) => {
    setBusy(true);
    try {
      const created = await createPracticeSession({ subjectCode: topic.subjectCode, subjectName: topic.subjectName, topics: [{ topicKey: topic.topicKey, name: topic.topicName }], mode, count: mode === 'WEAK_TOPIC' ? 10 : 5 });
      navigate(`/practice?sessionId=${created.session._id}`);
    } catch (error) { toast?.(error.response?.data?.error || 'No suitable questions are available yet.', 'error'); }
    finally { setBusy(false); }
  };

  if (!sessionId) return (
    <main className="u4-page"><LearningNav active="practice" /><header className="u4-simple-hero"><span className="u4-eyebrow">Practice</span><h1>A little practice. A clearer understanding.</h1><p>Start with a review, work on a tricky concept, or sit down with a past paper.</p></header>{busy && <p role="status" className="u4-muted">Preparing your questions…</p>}
      {dashboard?.incompleteSession && <section className="u4-resume-strip"><div><b>Continue your last practice</b><span>{dashboard.incompleteSession.subjectName || dashboard.incompleteSession.subjectCode}</span></div><Link className="u4-button primary" to={'/practice?sessionId=' + dashboard.incompleteSession._id}>Resume practice <ArrowRight size={18} /></Link></section>}
      <section className="u4-practice-launch-grid">
        <article><Clock3 /><h2>Review due</h2><p>{dashboard?.dueReviews?.length || 0} concepts scheduled</p>{dashboard?.dueReviews?.[0] ? <button disabled={busy} onClick={() => launch(dashboard.dueReviews[0], 'REVIEW')}>Review {dashboard.dueReviews[0].topicName}<ArrowRight /></button> : <span>Nothing overdue</span>}</article>
        <article><Target /><h2>Weak topics</h2><p>Practice where improvement matters most.</p>{dashboard?.weakTopics?.[0] ? <button disabled={busy} onClick={() => launch(dashboard.weakTopics[0], 'WEAK_TOPIC')}>Practice {dashboard.weakTopics[0].topicName}<ArrowRight /></button> : <span>Complete practice to reveal weak topics</span>}</article>
        <article><Brain /><h2>Mock exams</h2><p>Longer, exam-shaped practice from the PYQ bank.</p><Link to="/mock-exams">Build a mock <ArrowRight /></Link></article>
        <article><RotateCcw /><h2>PYQ practice</h2><p>Explore real exam questions by subject and topic.</p><Link to="/questions">Open question bank <ArrowRight /></Link></article>
      </section>
    </main>
  );

  if (!question) return <main className="u4-page"><LearningNav active="practice" /><section className="u4-panel"><span className="u4-eyebrow">Practice</span><h1>{data.questions?.length ? 'Session complete.' : 'No questions available.'}</h1><p className="u4-muted">{data.questions?.length ? 'Your answers are saved. Take a look at your progress or choose your next topic.' : 'The questions for this session are no longer available. Choose another topic to continue.'}</p><div className="u4-actions"><Link className="u4-button primary" to="/learning-dashboard">View progress</Link><Link className="u4-button secondary" to="/learn">Back to learning</Link></div></section></main>;

  const submit = async () => {
    if (submitting.current || result) return;
    if (!answer.trim()) return toast?.('Write or select an answer first.', 'info');
    submitting.current = true;
    setBusy(true); setSubmitError('');
    try {
      const response = await submitPracticeAttempt(sessionId, { questionId: question._id, answer, timeSpentSeconds: Math.round((Date.now() - startedAt.current) / 1000), hintsUsed: 0, clientAttemptId: `${sessionId}-${question._id}` });
      if (response.duplicate) { setReload((value) => value + 1); return; }
      setResult(response);
      setData((current) => ({ ...current, attempts: [...(current.attempts || []), response.attempt] }));
    } catch (error) { setSubmitError(error.response?.data?.error || 'Your answer could not be submitted. It is still here — please try again.'); }
    finally { submitting.current = false; setBusy(false); }
  };

  const next = () => {
    const nextIndex = data.questions.findIndex((item, itemIndex) => itemIndex > index && !answeredIds.has(String(item._id)));
    if (nextIndex >= 0) { setIndex(nextIndex); setAnswer(''); setResult(null); startedAt.current = Date.now(); }
    else navigate(classUrl);
  };

  const correctAnswer = result?.evaluation?.correctAnswer;
  const objective = result?.evaluation?.evaluationMode === 'objective';
  return (
    <main className="u4-page u4-practice-page">
      <div className="u4-flow-nav"><Link to={classUrl}><ArrowLeft size={17} /> Back to class</Link><span>Answers save after each submission</span></div>
      <header className="u4-practice-header"><div><span className="u4-eyebrow">Class practice</span><h1>{data.session.subjectName || data.session.subjectCode}</h1></div><div><strong>Question {index + 1} of {data.questions.length}</strong><MasteryBar value={((answeredIds.size) / data.questions.length) * 100} /></div></header>
      <div className="u4-practice-layout">
        <section className="u4-question-card" aria-labelledby="practice-question">
          <div className="u4-question-meta"><span>{question.sourceType === 'PYQ' ? 'Previous-year question' : question.generatedByAI || question.sourceType === 'PAPERSTACK_GENERATED' ? 'AI-generated practice' : 'PaperStack practice'}</span><span>{question.difficulty}</span><span>{question.marks || 1} marks</span></div>
          <h2 id="practice-question">{question.questionText}</h2>
          {question.options?.length ? <fieldset className="u4-options" aria-labelledby="practice-question">{question.options.map((option, optionIndex) => {
            const isCorrect = Boolean(result && correctAnswer === option);
            const isWrong = Boolean(result && answer === option && !result.evaluation.correct);
            return <label key={option} className={[answer === option ? 'selected' : '', isCorrect ? 'is-correct' : '', isWrong ? 'is-wrong' : ''].join(' ')}>
              <input type="radio" name="answer" checked={answer === option} disabled={Boolean(result) || busy} onChange={() => setAnswer(option)} />
              <span className="u4-option-letter" aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</span><span className="u4-option-copy">{option}{isCorrect && <small><CheckCircle2 size={16} /> {answer === option ? 'Your answer · Correct' : 'Correct answer'}</small>}{isWrong && <small><XCircle size={16} /> Your answer · Incorrect</small>}</span>
            </label>;
          })}</fieldset> : <textarea aria-label="Your answer" disabled={Boolean(result) || busy} value={answer} onChange={(event) => setAnswer(event.target.value)} rows={7} placeholder="Write your answer. Explain the concept clearly…" maxLength={12000} />}
          {submitError && <p className="u4-inline-error" role="alert">{submitError}</p>}
          {!result && <button className="u4-button primary" disabled={busy || !answer.trim()} onClick={submit}>{busy ? <><Loader2 className="spin" /> Checking answer…</> : 'Submit answer'}</button>}
        </section>
        <aside className="u4-practice-feedback" aria-live="polite">
          {!result ? <div className="u4-panel"><span className="u4-eyebrow">One question at a time</span><h2>Try it yourself first.</h2><p>Choose an answer, then submit. You’ll see the correct answer and a short explanation here.</p><small>You can leave and resume your saved practice anytime.</small></div> : <section className={'u4-result ' + (result.evaluation.correct ? 'correct' : 'incorrect')}>
            <div className="u4-result-heading">{result.evaluation.correct ? <CheckCircle2 /> : <XCircle />}<h2>{objective ? result.evaluation.correct ? 'That’s correct!' : 'Not quite. Let’s clear it up.' : Math.round(result.evaluation.actualScore * 100) + '% estimated'}</h2></div>
            {correctAnswer && <div className="u4-correct-answer"><small>Correct answer</small><MathAnswer>{correctAnswer}</MathAnswer></div>}
            <h3>Short explanation</h3><MathAnswer>{result.evaluation.explanation || result.evaluation.feedback || 'An explanation is not available for this question yet.'}</MathAnswer>
            {!result.evaluation.explanation && objective && <p className="u4-muted">A detailed explanation is temporarily unavailable. Your answer has been marked and saved.</p>}
            <button className="u4-button primary" onClick={next}>{result.complete ? 'Finish practice' : 'Next question'} <ArrowRight size={18} /></button>
            {(result.mastery?.length > 0 || result.rating) && <details className="u4-score-details"><summary>Progress from this answer</summary>{result.mastery?.map((item) => <p key={item.topicKey}>{item.topicName}: {item.previousMasteryScore}% → {item.masteryScore}% mastery</p>)}{result.rating && <p>PSR {result.rating.oldRating} → {result.rating.globalRating}</p>}</details>}
          </section>}
        </aside>
      </div>
    </main>
  );
}
