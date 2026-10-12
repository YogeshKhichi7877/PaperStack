import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, Brain, CalendarClock, Check, ChevronRight, FileText, Gauge, Info, Loader2, Paperclip, RefreshCw, Trash2 } from 'lucide-react';
import { createPracticeSession, deletePrivateStudyResource, getLearningDashboard, getPrivateStudyResources, mapLearningTopics, practicePrivateStudyResource, retryPrivateStudyResource, saveLearningCheckin, uploadPrivateStudyResource } from '../services/learningApi';
import SearchableSubjectSelector from '../components/SearchableSubjectSelector';
import LearningNav from '../components/LearningNav';
import LearningClassPage from './LearningClassPage';
import './Update4.css';

function MasteryBar({ value = 0 }) {
  return <span className="u4-mastery-bar" aria-label={`${value}% mastery`}><i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></span>;
}

function LoginPrompt() {
  return (
    <main className="u4-page u4-guest-home">
      <section className="u4-guest-hero">
        <div className="u4-guest-copy"><span className="u4-eyebrow">PaperStack Learning · IIIT Surat</span>
        <h1>From the classroom<br />to <em>“I get it.”</em></h1>
        <p>A place for today’s class, the questions you still have, and a little practice to make it stick.</p>
        <div className="u4-actions"><Link className="u4-button primary" to="/login">Start learning <ChevronRight size={18} /></Link><Link className="u4-button secondary" to="/archive">Explore resources</Link></div>
        <small>Pick up one concept. Come back a little more confident.</small></div>
        <img className="u4-guest-art" src="/paperstack-learning-journey.png" alt="The PaperStack owl studying through learning, practice and review" width="1450" height="1079" />
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
  const [params] = useSearchParams();
  const classId = params.get('class');
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [text, setText] = useState('');
  const [note, setNote] = useState('');
  const [doubt, setDoubt] = useState('');
  const [noteType, setNoteType] = useState('CLASS_NOTE');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [mapping, setMapping] = useState(null);
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState('');
  const [materialFile, setMaterialFile] = useState(null);
  const [resources, setResources] = useState([]);
  const [showLearnInfo, setShowLearnInfo] = useState(false);
  const [showPsrInfo, setShowPsrInfo] = useState(false);
  const draftKey = user ? `paperstack-class-draft:${user._id || user.username}` : '';
  const [loadedDraftKey, setLoadedDraftKey] = useState('');
  useEffect(() => {
    if (!draftKey) return;
    let draft = {};
    try { draft = JSON.parse(sessionStorage.getItem(draftKey) || '{}'); } catch { /* Storage may be unavailable. */ }
    setText(draft.text || ''); setNote(draft.note || ''); setDoubt(draft.doubt || '');
    setSubjectCode(draft.subjectCode || ''); setSubjectName(draft.subjectName || '');
    setNoteType(draft.noteType || 'CLASS_NOTE'); setLoadedDraftKey(draftKey);
  }, [draftKey]);
  useEffect(() => {
    if (!draftKey || loadedDraftKey !== draftKey) return;
    try { sessionStorage.setItem(draftKey, JSON.stringify({ text, note, doubt, subjectCode, subjectName, noteType })); } catch { /* Saving a class to the server still works. */ }
  }, [draftKey, loadedDraftKey, text, note, doubt, subjectCode, subjectName, noteType]);

  const load = useCallback(async () => {
    if (!user || classId) return;
    setLoading(true);
    const [dashboardResult, resourceResult] = await Promise.allSettled([
      getLearningDashboard(),
      getPrivateStudyResources({ limit: 12 }),
    ]);
    if (dashboardResult.status === 'fulfilled') setDashboard(dashboardResult.value);
    else toast?.('Could not load your academic home.', 'error');
    if (resourceResult.status === 'fulfilled') setResources(resourceResult.value.resources || []);
    setLoading(false);
  }, [toast, user, classId]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!resources.some((item) => ['QUEUED', 'EXTRACTING', 'OCR', 'MAPPING_TOPICS'].includes(item.processingStatus))) return undefined;
    const timer = window.setInterval(() => {
      getPrivateStudyResources({ limit: 12 }).then((result) => setResources(result.resources || [])).catch(() => {});
    }, 5000);
    return () => window.clearInterval(timer);
  }, [resources]);
  if (classId) return <LearningClassPage key={classId} checkinId={classId} user={user} />;
  if (!user) return <LoginPrompt />;
  if (loading && !dashboard) return <main className="u4-page"><div className="u4-loading"><Loader2 className="spin" /> Building today’s focus…</div></main>;

  const mapTopics = async (event) => {
    event.preventDefault();
    if (!text.trim()) return toast?.('Write what you studied today.', 'info');
    setBusy('mapping');
    try {
      const result = await mapLearningTopics({ text, subjectCode, subjectName, semester: user.semester, branch: user.branch });
      setMapping(result);
      setSubjectCode(result.subject.code);
      setSubjectName(result.subject.name);
      setSelected(result.topics.map((item) => item.topicKey));
    } catch (error) { toast?.(error.response?.data?.error || 'Choose the topics manually.', 'error'); }
    finally { setBusy(''); }
  };

  const confirmLearning = async () => {
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
      setDashboard((current) => ({ ...current, recentCheckins: [saved.checkin, ...(current?.recentCheckins || []).filter((item) => item._id !== saved.checkin._id)] }));
      toast?.('Today’s learning is saved. Choose how you want to continue.', 'success');
      setMapping(null); setText(''); setNote(''); setDoubt(''); setMaterialFile(null);
      navigate(`/learn?class=${encodeURIComponent(saved.checkin._id)}`);
    } catch (error) { toast?.(error.response?.data?.error || 'Could not save today’s learning.', 'error'); }
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
      <LearningNav active="learn" />
      <header className="u4-today-header"><div><span className="u4-eyebrow">Today · {dashboard?.today || new Date().toLocaleDateString('en-IN')}</span><h1>Good to see you, {name.split(' ')[0]}.</h1><p>Tell PaperStack what your class covered. You choose when to understand or practice.</p></div><div className="u4-psr-wrap"><Link className="u4-rating-pill" to="/profile"><span>PSR</span><strong>{dashboard?.rating?.globalRating || 1000}</strong><small>{dashboard?.rating?.provisional ? 'Provisional' : dashboard?.rating?.tier}</small></Link><button type="button" aria-label="About PaperStack Rating" aria-expanded={showPsrInfo} onClick={() => setShowPsrInfo((shown) => !shown)} onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) setShowPsrInfo(true); }} onMouseEnter={() => setShowPsrInfo(true)} onMouseLeave={() => setShowPsrInfo(false)} onKeyDown={(event) => { if (event.key === 'Escape') setShowPsrInfo(false); }} onBlur={() => setShowPsrInfo(false)}><Info /></button>{showPsrInfo && <div role="tooltip">PaperStack Rating measures eligible verified academic practice. Reading AI explanations does not increase it.</div>}</div></header>

      <section className="u4-focus-grid u4-focus-single">
        <article className="u4-focus-main">
          <div className="u4-card-heading"><span><BookOpen /></span><div><small>Today’s learning</small><h2>What did your class cover today?</h2></div><div className="u4-info-wrap"><button type="button" className="u4-info-button" aria-label="About PaperStack Learn" aria-expanded={showLearnInfo} onMouseEnter={() => setShowLearnInfo(true)} onMouseLeave={() => setShowLearnInfo(false)} onClick={() => setShowLearnInfo((shown) => !shown)} onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) setShowLearnInfo(true); }} onKeyDown={(event) => { if (event.key === 'Escape') setShowLearnInfo(false); }} onBlur={() => setShowLearnInfo(false)}><Info /></button>{showLearnInfo && <div role="tooltip">Learn connects today’s topics and private material to AI explanations, practice, mastery and future revision.</div>}</div></div>
          {!mapping ? <form onSubmit={mapTopics}>
            <textarea aria-label="What did your class cover today?" value={text} onChange={(event) => setText(event.target.value)} placeholder="Today we covered semaphores and mutex. I’m still unsure when wait() blocks…" rows={5} maxLength={3000} />
            <details className="u4-note-details"><summary>Add class material, a private note or doubt</summary><div><select aria-label="Private note type" value={noteType} onChange={(event) => setNoteType(event.target.value)}><option value="CLASS_NOTE">Class note</option><option value="IMPORTANT_POINT">Important point</option><option value="FORMULA">Formula</option><option value="REVISION_NOTE">Revision note</option></select><textarea aria-label="Private note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Private note (never shown on your public profile)" rows={3} /><textarea aria-label="Private doubt" value={doubt} onChange={(event) => setDoubt(event.target.value)} placeholder="Something I still do not understand…" rows={2} /><label className="u4-material-input">
              <Paperclip aria-hidden="true" />
              <span><strong>{materialFile ? materialFile.name : 'Add class material'}</strong><small>Private study material · PDF, PPT, PPTX or text · max 20 MB</small></span>
              <input type="file" accept=".pdf,.ppt,.pptx,.txt,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain" onChange={(event) => setMaterialFile(event.target.files?.[0] || null)} />
            </label></div></details>
            <div className="u4-form-row"><SearchableSubjectSelector value={subjectCode} semester={user.semester} branch={user.branch} allowAuto onChange={(item) => { setSubjectCode(item.subjectCode); setSubjectName(item.subjectName); }} /><button className="u4-button primary" disabled={Boolean(busy)}>{busy === 'mapping' ? <><Loader2 className="spin" /> Mapping topics…</> : 'Continue'}</button></div>
          </form> : <div className="u4-confirm"><p>Confirm what you studied:</p><div className="u4-topic-choices">{mapping.availableTopics.map((topic) => <label key={topic.topicKey} className={selected.includes(topic.topicKey) ? 'selected' : ''}><input type="checkbox" checked={selected.includes(topic.topicKey)} onChange={() => setSelected((items) => items.includes(topic.topicKey) ? items.filter((key) => key !== topic.topicKey) : [...items, topic.topicKey])} /><Check /> <span>{topic.name}<small>{topic.questionCount} bank questions</small></span></label>)}</div><div className="u4-actions"><button className="u4-button secondary" onClick={() => setMapping(null)}>Edit learning</button><button className="u4-button primary" onClick={confirmLearning} disabled={!selected.length || Boolean(busy)}>{busy === 'saving' ? 'Saving…' : 'Confirm topics'}</button></div></div>}

        </article>
        <aside className="u4-desk-note"><span className="u4-eyebrow">One class at a time</span><h2>A small habit.<br />A stronger semester.</h2><ol><li><b>Log what you learned</b><span>A few lines from today’s class are enough.</span></li><li><b>Make sense of it</b><span>Use your notes and the topic tutor to clear a doubt.</span></li><li><b>Try it for yourself</b><span>Practice when you’re ready. Revisit what needs work.</span></li></ol><Link to="/learning-dashboard">See your progress <ChevronRight size={16} /></Link></aside>
      </section>

      {dashboard?.incompleteSession && <section className="u4-resume-strip"><div><b>Pick up your practice</b><span>{dashboard.incompleteSession.subjectName || dashboard.incompleteSession.subjectCode} · Your answers are saved</span></div><Link className="u4-button primary" to={'/practice?sessionId=' + dashboard.incompleteSession._id}>Resume practice <ChevronRight size={18} /></Link></section>}
      {dashboard?.recentCheckins?.length > 0 && <section className="u4-section u4-learning-timeline"><div className="u4-section-title"><div><span className="u4-eyebrow">Come back anytime</span><h2>My saved classes</h2></div></div><div>{dashboard.recentCheckins.map((checkin) => <article key={checkin._id}><div><b>{checkin.subjectName}</b><small>{new Date(checkin.createdAt).toLocaleDateString('en-IN')} · {(checkin.topics || []).map((topic) => topic.name).join(', ')}</small><small>{checkin.completedPractice ? 'Practice completed — ready to review' : checkin.practiceSessionId ? 'Practice in progress' : 'Saved and ready to continue'}</small></div><Link className="u4-button secondary" to={'/learn?class=' + encodeURIComponent(checkin._id)}>Continue learning <ChevronRight size={17} /></Link></article>)}</div></section>}

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

    </main>
  );
}

export { LoginPrompt, MasteryBar };
