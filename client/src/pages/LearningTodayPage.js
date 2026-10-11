import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { BookOpen, Brain, CalendarClock, Check, ChevronRight, FileText, Flame, Gauge, Loader2, Paperclip, RefreshCw, Target, Trash2 } from 'lucide-react';
import { API_URL } from '../config/appConfig';
import { createPracticeSession, deletePrivateStudyResource, getLearningDashboard, getPrivateStudyResources, mapLearningTopics, practicePrivateStudyResource, retryPrivateStudyResource, saveLearningCheckin, uploadPrivateStudyResource } from '../services/learningApi';
import './Update4.css';

function MasteryBar({ value = 0 }) {
  return <span className="u4-mastery-bar" aria-label={`${value}% mastery`}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span>;
}

function LoginPrompt() {
  return (
    <main className="u4-page u4-guest-home">
      <section className="u4-guest-hero">
        <span className="u4-eyebrow">PaperStack · IIIT Surat</span>
        <h1>Your academic profile,<br /><em>built one concept at a time.</em></h1>
        <p>Learn daily. Practice concepts. Strengthen weak areas. Build your PaperStack Rating.</p>
        <div className="u4-actions"><Link className="u4-button primary" to="/login">Start learning</Link><Link className="u4-button secondary" to="/archive">Explore resources</Link></div>
      </section>
      <section className="u4-loop" aria-label="PaperStack learning loop">
        {['Learn', 'Practice', 'Measure', 'Revise', 'Improve'].map((step, index) => <React.Fragment key={step}><div><b>{String(index + 1).padStart(2, '0')}</b><span>{step}</span></div>{index < 4 && <ChevronRight aria-hidden="true" />}</React.Fragment>)}
      </section>
      <section className="u4-guest-grid">
        <article><Brain /><h2>Concept-first learning</h2><p>Turn what happened in class into focused practice and a revision plan.</p></article>
        <article><Gauge /><h2>Evidence-based mastery</h2><p>See confidence, weak topics and subject growth from real attempts.</p></article>
        <article><BookOpen /><h2>PYQs with context</h2><p>Use previous-year questions as exam evidence inside each concept.</p></article>
      </section>
      <section className="u4-archive-bridge"><div><span className="u4-eyebrow">The archive stays</span><h2>Past papers are now part of a larger learning system.</h2><p>Search papers, inspect repeated topics, generate mocks and prepare for exams—now connected to daily progress.</p></div><Link to="/archive">Open archive <ChevronRight /></Link></section>
    </main>
  );
}

export default function LearningTodayPage({ user, toast }) {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [doubt, setDoubt] = useState('');
  const [noteType, setNoteType] = useState('CLASS_NOTE');
  const [subjectCode, setSubjectCode] = useState('');
  const [mapping, setMapping] = useState(null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState('');
  const [materialFile, setMaterialFile] = useState(null);
  const [resources, setResources] = useState([]);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [dashboardResult, subjectResult, resourceResult] = await Promise.allSettled([
      getLearningDashboard(),
      axios.get(`${API_URL}/api/ask-paperstack/subjects`),
      getPrivateStudyResources({ limit: 12 }),
    ]);
    if (dashboardResult.status === 'fulfilled') setDashboard(dashboardResult.value);
    else toast?.('Could not load your academic home.', 'error');
    if (subjectResult.status === 'fulfilled') setSubjects(subjectResult.value.data.subjects || []);
    if (resourceResult.status === 'fulfilled') setResources(resourceResult.value.resources || []);
    setLoading(false);
  }, [toast, user]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!resources.some((item) => ['QUEUED', 'EXTRACTING', 'OCR', 'MAPPING_TOPICS'].includes(item.processingStatus))) return undefined;
    const timer = window.setInterval(() => {
      getPrivateStudyResources({ limit: 12 }).then((result) => setResources(result.resources || [])).catch(() => {});
    }, 5000);
    return () => window.clearInterval(timer);
  }, [resources]);
  const chosenSubject = useMemo(() => subjects.find((item) => item.subjectCode === subjectCode), [subjectCode, subjects]);

  if (!user) return <LoginPrompt />;
  if (loading && !dashboard) return <main className="u4-page"><div className="u4-loading"><Loader2 className="spin" /> Building today’s focus…</div></main>;

  const mapTopics = async (event) => {
    event.preventDefault();
    if (!text.trim()) return toast?.('Write what you studied today.', 'info');
    setBusy('mapping');
    try {
      const result = await mapLearningTopics({ text, subjectCode, subjectName: chosenSubject?.subject, semester: user.semester, branch: user.branch });
      setMapping(result);
      setSubjectCode(result.subject.code);
      setSelected(result.topics.map((item) => item.topicKey));
    } catch (error) { toast?.(error.response?.data?.error || 'Choose the topics manually.', 'error'); }
    finally { setBusy(''); }
  };

  const saveAndPractice = async () => {
    if (!mapping) return;
    setBusy('saving');
    try {
      const topics = mapping.availableTopics.filter((item) => selected.includes(item.topicKey)).map((item) => ({ ...item, confidence: mapping.topics.find((mapped) => mapped.topicKey === item.topicKey)?.confidence || 1 }));
      const saved = await saveLearningCheckin({ originalText: text, subjectCode: mapping.subject.code, subjectName: mapping.subject.name, topics, note, noteType, doubt });
      if (materialFile) {
        try {
          const uploaded = await uploadPrivateStudyResource(materialFile, {
            subjectCode: mapping.subject.code,
            subjectName: mapping.subject.name,
            linkedCheckinId: saved.checkin._id,
          });
          setResources((items) => [uploaded.resource, ...items.filter((item) => item._id !== uploaded.resource._id)]);
          toast?.('Class material saved privately. Text extraction is running in the background.', 'success');
        } catch (uploadError) {
          toast?.(uploadError.response?.data?.error || 'Today’s learning was saved, but the class material could not be uploaded.', 'error');
        }
      }
      const practice = await createPracticeSession({ checkinId: saved.checkin._id, subjectCode: mapping.subject.code, subjectName: mapping.subject.name, topics, mode: 'DAILY', count: 5 });
      navigate(`/practice?sessionId=${practice.session._id}`);
    } catch (error) { toast?.(error.response?.data?.error || 'Could not prepare practice.', 'error'); }
    finally { setBusy(''); }
  };

  const practiceResource = async (resource) => {
    setBusy(`resource:${resource._id}`);
    try {
      const result = await practicePrivateStudyResource(resource._id, 5);
      navigate(`/practice?sessionId=${result.session._id}`);
    } catch (error) { toast?.(error.response?.data?.error || 'Could not prepare practice from this material.', 'error'); }
    finally { setBusy(''); }
  };

  const retryResource = async (resource) => {
    setBusy(`resource:${resource._id}`);
    try {
      const result = await retryPrivateStudyResource(resource._id);
      setResources((items) => items.map((item) => item._id === resource._id ? result.resource : item));
    } catch (error) { toast?.(error.response?.data?.error || 'Could not retry this material.', 'error'); }
    finally { setBusy(''); }
  };

  const removeResource = async (resource) => {
    setBusy(`resource:${resource._id}`);
    try {
      await deletePrivateStudyResource(resource._id);
      setResources((items) => items.filter((item) => item._id !== resource._id));
      toast?.('Private class material deleted.', 'success');
    } catch (error) { toast?.(error.response?.data?.error || 'Could not delete this material.', 'error'); }
    finally { setBusy(''); }
  };

  const startFocusedPractice = async (topic, mode = 'REVIEW') => {
    setBusy(topic.topicKey);
    try {
      const result = await createPracticeSession({ subjectCode: topic.subjectCode, subjectName: topic.subjectName, topics: [{ topicKey: topic.topicKey, name: topic.topicName }], mode, count: 5 });
      navigate(`/practice?sessionId=${result.session._id}`);
    } catch (error) { toast?.(error.response?.data?.error || 'Practice is not available yet.', 'error'); }
    finally { setBusy(''); }
  };

  const name = user.name || user.username || 'student';
  return (
    <main className="u4-page">
      <header className="u4-today-header"><div><span className="u4-eyebrow">Today · {dashboard?.today}</span><h1>Good to see you, {name.split(' ')[0]}.</h1><p>One focused session today becomes academic confidence over time.</p></div><Link className="u4-rating-pill" to="/profile"><span>PSR</span><strong>{dashboard?.rating?.globalRating || 1000}</strong><small>{dashboard?.rating?.provisional ? 'Provisional' : dashboard?.rating?.tier}</small></Link></header>

      <section className="u4-focus-grid">
        <article className="u4-focus-main">
          <div className="u4-card-heading"><span><BookOpen /></span><div><small>Today’s learning</small><h2>What did you study today?</h2></div></div>
          {!mapping ? <form onSubmit={mapTopics}>
            <textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="Today sir explained process synchronization, semaphores and mutex…" rows={4} maxLength={3000} />
            <details className="u4-note-details"><summary>Add a private note or doubt</summary><div><select value={noteType} onChange={(event) => setNoteType(event.target.value)}><option value="CLASS_NOTE">Class note</option><option value="IMPORTANT_POINT">Important point</option><option value="FORMULA">Formula</option><option value="REVISION_NOTE">Revision note</option></select><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Private note (never shown on your public profile)" rows={3} /><textarea value={doubt} onChange={(event) => setDoubt(event.target.value)} placeholder="Something I still do not understand…" rows={2} /></div></details>
            <label className="u4-material-input">
              <Paperclip aria-hidden="true" />
              <span><strong>{materialFile ? materialFile.name : 'Add class material'}</strong><small>Private study material · PDF, PPT, PPTX or text · max 20 MB</small></span>
              <input type="file" accept=".pdf,.ppt,.pptx,.txt,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain" onChange={(event) => setMaterialFile(event.target.files?.[0] || null)} />
            </label>
            <div className="u4-form-row"><select value={subjectCode} onChange={(event) => setSubjectCode(event.target.value)}><option value="">Let PaperStack detect the subject</option>{subjects.map((item) => <option key={item.subjectCode} value={item.subjectCode}>{item.subject} ({item.subjectCode})</option>)}</select><button className="u4-button primary" disabled={Boolean(busy)}>{busy === 'mapping' ? <><Loader2 className="spin" /> Mapping topics…</> : 'Map my learning'}</button></div>
          </form> : <div className="u4-confirm"><p>We think you studied:</p><div className="u4-topic-choices">{mapping.availableTopics.map((topic) => <label key={topic.topicKey} className={selected.includes(topic.topicKey) ? 'selected' : ''}><input type="checkbox" checked={selected.includes(topic.topicKey)} onChange={() => setSelected((items) => items.includes(topic.topicKey) ? items.filter((key) => key !== topic.topicKey) : [...items, topic.topicKey])} /><Check /> <span>{topic.name}<small>{topic.questionCount} bank questions</small></span></label>)}</div><div className="u4-actions"><button className="u4-button secondary" onClick={() => setMapping(null)}>Edit note</button><button className="u4-button primary" onClick={saveAndPractice} disabled={!selected.length || Boolean(busy)}>{busy === 'saving' ? 'Preparing practice…' : 'Confirm & practice 5 questions'}</button></div></div>}
        </article>
        <aside className="u4-daily-card"><div className="u4-card-heading"><span><Target /></span><div><small>Daily goal</small><h2>{dashboard?.dailyGoal?.attempted || 0} / {dashboard?.dailyGoal?.target || 6}</h2></div></div><MasteryBar value={Math.min(100, ((dashboard?.dailyGoal?.attempted || 0) / (dashboard?.dailyGoal?.target || 6)) * 100)} /><p>{dashboard?.dailyGoal?.complete ? 'Daily practice complete. Nice work.' : 'A few careful answers are better than empty activity.'}</p><div className="u4-streak"><Flame /> <strong>{dashboard?.streak?.current || 0} day</strong> meaningful streak</div></aside>
      </section>

      <section className="u4-section u4-resources" aria-labelledby="private-material-heading">
        <div className="u4-section-title"><div><span className="u4-eyebrow">Visible only to you</span><h2 id="private-material-heading">Private class material</h2></div></div>
        {resources.length ? <div className="u4-resource-list">{resources.map((resource) => {
          const processing = ['QUEUED', 'EXTRACTING', 'OCR', 'MAPPING_TOPICS'].includes(resource.processingStatus);
          return <article key={resource._id}>
            <FileText aria-hidden="true" />
            <div><strong>{resource.title}</strong><span>{resource.originalFileName}</span><small>{processing ? resource.processingStatus.replaceAll('_', ' ').toLowerCase() : resource.processingStatus === 'READY' ? `${resource.linkedTopicNames?.join(', ') || 'Ready'} · ${resource.chunkCount} text chunks` : resource.processingError?.message || 'Could not process file.'}</small></div>
            <div className="u4-resource-actions">
              {resource.processingStatus === 'READY' && <button type="button" onClick={() => practiceResource(resource)} disabled={Boolean(busy)}>Practice this lecture</button>}
              {resource.processingStatus === 'FAILED' && <button type="button" onClick={() => retryResource(resource)} disabled={Boolean(busy)}><RefreshCw /> Retry</button>}
              <button type="button" className="danger" onClick={() => removeResource(resource)} disabled={Boolean(busy)} aria-label={`Delete ${resource.title}`}><Trash2 /></button>
            </div>
          </article>;
        })}</div> : <div className="u4-empty"><Paperclip /><div><b>No private class material yet.</b><span>Attach a lecture file while logging today’s learning. It will never appear in the public archive.</span></div></div>}
      </section>

      <section className="u4-section"><div className="u4-section-title"><div><span className="u4-eyebrow">Next best action</span><h2>Reviews due</h2></div><Link to="/practice">Open Practice</Link></div>{dashboard?.dueReviews?.length ? <div className="u4-topic-grid">{dashboard.dueReviews.slice(0, 4).map((topic) => <button key={topic.topicKey} onClick={() => startFocusedPractice(topic)} disabled={Boolean(busy)}><span><b>{topic.topicName}</b><small>{topic.subjectName || topic.subjectCode} · due {new Date(topic.nextReviewAt).toLocaleDateString('en-IN')}</small></span><strong>{topic.masteryScore}%</strong><MasteryBar value={topic.masteryScore} /></button>)}</div> : <div className="u4-empty"><CalendarClock /><div><b>No scheduled review is overdue.</b><span>Log today’s learning or practice a subject to start your revision cycle.</span></div></div>}</section>

      <section className="u4-two-column"><article className="u4-panel"><div className="u4-section-title"><div><span className="u4-eyebrow">Learning intelligence</span><h2>Weak topics</h2></div><Link to="/learning-dashboard">Full progress</Link></div>{dashboard?.weakTopics?.length ? dashboard.weakTopics.slice(0, 4).map((topic, index) => <button className="u4-weak-row" key={topic.topicKey} onClick={() => startFocusedPractice(topic, 'WEAK_TOPIC')}><span className="u4-priority">P{index + 1}</span><span><b>{topic.topicName}</b><small>{topic.reason}</small></span><strong>{topic.masteryScore}%</strong></button>) : <p className="u4-muted">Your weak-topic engine will appear after practice evidence is recorded.</p>}</article>
        <article className="u4-panel u4-identity-card"><span className="u4-eyebrow">Your academic identity</span><div className="u4-big-rating"><strong>{dashboard?.rating?.globalRating || 1000}</strong><span>{dashboard?.rating?.tier}</span></div><p>{dashboard?.rating?.provisional ? `${Math.max(0, 20 - (dashboard?.rating?.ratedCount || 0))} rated questions until your ranking becomes established.` : `${dashboard?.rating?.weeklyDelta >= 0 ? '+' : ''}${dashboard?.rating?.weeklyDelta || 0} this week.`}</p>{dashboard?.rating?.nextTier && <small>{dashboard.rating.nextTier.pointsAway} points to {dashboard.rating.nextTier.name}</small>}<Link to="/profile">View academic profile <ChevronRight /></Link></article>
      </section>
    </main>
  );
}

export { LoginPrompt, MasteryBar };
