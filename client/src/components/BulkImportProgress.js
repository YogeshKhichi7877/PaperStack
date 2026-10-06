import React, { useCallback, useEffect, useState } from 'react';
import { getImportBatch, getImportReview, saveImportMetadata, approveImportQuestion, attachImportSolution } from '../services/bulkPaperImportApi';
import { extractQuestionsForPaper } from '../services/questionExtractionApi';
import QuestionText from './QuestionText';
import './BulkPaperImport.css';

const branches = ['CSE', 'CSE (AI-ML)', 'Cyber Security', 'Mathematics and Computing', 'ECE'];
const label = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
function PaperReview({ paperId, onDone }) {
  const [review, setReview] = useState(null), [form, setForm] = useState({}), [error, setError] = useState(''), [busy, setBusy] = useState(false), [questionEdits, setQuestionEdits] = useState({});
  const load = useCallback(async () => {
    try { const data = await getImportReview(paperId); setReview(data); setForm(data.paper); }
    catch { setError('Could not load detected questions.'); }
  }, [paperId]);
  useEffect(() => { load(); }, [load]);
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try { await saveImportMetadata(paperId, form); await load(); onDone(); }
    catch (failure) { setError(failure.response?.data?.message || 'Could not save metadata.'); }
    finally { setBusy(false); }
  };
  const moderate = async (question, status) => {
    setBusy(true); setError('');
    try { await approveImportQuestion(question._id, { status, ...(questionEdits[question._id] || {}) }); await load(); setQuestionEdits({}); onDone(); }
    catch (failure) { setError(failure.response?.data?.error || 'Could not save the question review.'); } finally { setBusy(false); }
  };
  if (!review) return <div role="status">{error || 'Loading detected details…'}</div>;
  return <div className="bulk-review">
    <h4>Review detected details</h4>
    {error && <p role="alert" className="bulk-error">{error}</p>}
    <p>Check the detected information and extracted questions against the original paper.</p>
    <a href={review.paper.filePath} target="_blank" rel="noreferrer">View Original Paper</a>
    {!!review.paper.processing?.metadata?.missing?.length && <p>Missing: {review.paper.processing.metadata.missing.join(', ')}</p>}
    {!!review.paper.processing?.metadata?.uncertain?.length && <p>Uncertain: {review.paper.processing.metadata.uncertain.join(', ')}</p>}
    <form onSubmit={save} className="bulk-review-form">
      {['subject', 'subjectCode', 'semester', 'year'].map((key) => <label key={key}>{label(key.replace(/([A-Z])/g, ' $1'))}
        <input value={form[key] ?? ''} required={key !== 'subjectCode'} type={['semester', 'year'].includes(key) ? 'number' : 'text'} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />
      </label>)}
      <label>Branch<select required value={form.branch || ''} onChange={(event) => setForm({ ...form, branch: event.target.value })}><option value="">Choose detected branch</option>{branches.map((branch) => <option key={branch}>{branch}</option>)}</select></label>
      <label>Exam type<select required value={form.examType || ''} onChange={(event) => setForm({ ...form, examType: event.target.value })}><option value="">Choose exam type</option><option>Mid-Sem</option><option>End-Sem</option></select></label>
      <button type="submit" disabled={busy}>Approve metadata</button>
    </form>
    <h4>{review.questions.length} questions already extracted</h4>
    {review.questions.map((question) => <article key={question._id} className="bulk-review-question">
      <strong>{question.questionLabel} · {question.marks ?? 'Unknown'} marks · Page {question.sourceLocation?.pageStart ?? '—'}</strong>
      <QuestionText>{question.questionText}</QuestionText>
      <details><summary>Correct question text or marks</summary>
        <label>Question text<textarea rows={4} value={questionEdits[question._id]?.questionText ?? question.questionText} onChange={(event) => setQuestionEdits({ ...questionEdits, [question._id]: { ...questionEdits[question._id], questionText: event.target.value } })} /></label>
        <label>Marks<input type="number" min="0" max="200" value={questionEdits[question._id]?.marks ?? question.marks ?? ''} onChange={(event) => setQuestionEdits({ ...questionEdits, [question._id]: { ...questionEdits[question._id], marks: event.target.value } })} /></label>
        <button type="button" disabled={busy} onClick={() => moderate(question, 'reviewed')}>Save correction</button>
      </details>
      <span>{question.needsReview ? 'Needs review' : '✓ Checked'}</span>
      {question.needsReview && <><button type="button" disabled={busy} onClick={() => moderate(question, 'reviewed')}>Approve question</button><button type="button" disabled={busy} onClick={() => moderate(question, 'rejected')}>Reject fragment</button></>}
    </article>)}
  </div>;
}
export default function BulkImportProgress({ batchId, toast }) {
  const [batch, setBatch] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(''), [reviewId, setReviewId] = useState(''), [solutionMatches, setSolutionMatches] = useState({});
  const load = useCallback(async () => {
    try { const data = await getImportBatch(batchId); setBatch(data); setError(''); }
    catch { setError('Could not refresh batch progress.'); }
  }, [batchId]);
  useEffect(() => { let disposed = false; setBatch(null); setReviewId(''); getImportBatch(batchId).then((data) => { if (!disposed) { setBatch(data); setError(''); } }).catch(() => { if (!disposed) setError('Could not load batch progress.'); }); return () => { disposed = true; }; }, [batchId]);
  const active = batch && batch.status !== 'finished';
  useEffect(() => {
    if (!active) return undefined;
    let disposed = false, inFlight = false;
    const timer = setInterval(async () => {
      if (inFlight) return; inFlight = true;
      try { const data = await getImportBatch(batchId); if (!disposed) { setBatch(data); setError(''); } }
      catch { if (!disposed) setError('Connection interrupted. Background processing continues; progress will refresh.'); }
      finally { inFlight = false; }
    }, 5000);
    return () => { disposed = true; clearInterval(timer); };
  }, [active, batchId]);
  const retry = async (id) => {
    setBusy(id); setError('');
    try { await extractQuestionsForPaper(id, { force: false, allowAi: true }); await load(); toast?.('Paper queued for retry.', 'success'); }
    catch (failure) { setError(failure.response?.data?.error || 'Could not retry this paper.'); } finally { setBusy(''); }
  };
  const attach = async (solution) => {
    setBusy(solution.fileHash);
    try { await attachImportSolution(batchId, solution.fileHash, solutionMatches[solution.fileHash]); await load(); }
    catch (failure) { setError(failure.response?.data?.message || 'Could not attach solution.'); } finally { setBusy(''); }
  };
  return <section className="bulk-progress" aria-label="Bulk import progress">
    <h3>Bulk Import #{batchId.slice(-8)}</h3>
    {error && <p role="alert" className="bulk-error">{error} <button type="button" onClick={load}>Refresh</button></p>}
    {!batch ? <p role="status">Loading batch progress…</p> : <>
      <p>{batch.totalFiles} papers · {batch.status === 'finished' ? 'Processing finished' : 'Processing in the background'}</p>
      {batch.interrupted && <p role="alert" className="bulk-error">Upload was interrupted. {batch.missingFiles} files were not stored. Select the original PDFs again to resume; stored files will be skipped.</p>}
      <div className="bulk-counts">{[['completed', '✓ Completed'], ['processing', '● Processing'], ['waiting', '○ Waiting'], ['needsReview', '⚠ Needs Review'], ['failed', '✕ Failed'], ['skipped', 'Duplicates skipped']].map(([key, name]) => <div key={key}><span>{name}</span><strong>{batch[key] || 0}</strong></div>)}</div>
      <p><strong>Questions extracted: {batch.questions || 0}</strong></p>
      <ul className="bulk-result-list">{batch.results.map((result, index) => <li key={`${result.fileHash}-${index}`}>
        <div><strong>{result.fileName}</strong><span className={`bulk-result-status status-${result.status}`}>{label(result.status)}</span>
          {result.paper && <><p>{label(result.paper.processing?.stage)} · {result.paper.questionCount || 0} questions saved</p><p>{[result.paper.subjectCode, result.paper.subject, result.paper.semester && `Semester ${result.paper.semester}`, result.paper.examType, result.paper.year].filter(Boolean).join(' · ') || 'Detecting paper details…'}</p></>}
          {(result.message || result.paper?.processing?.error?.message) && <p>{result.message || result.paper.processing.error.message}</p>}
        </div>
        {result.paperId && result.status === 'failed' && <button type="button" disabled={!!busy} onClick={() => retry(result.paperId)}>{busy === result.paperId ? 'Queuing…' : 'Retry'}</button>}
        {!result.paperId && result.status === 'failed' && <small>Select this file again above to retry its upload.</small>}
        {result.paperId && ['needsReview', 'completed'].includes(result.status) && <button type="button" onClick={() => setReviewId(reviewId === result.paperId ? '' : result.paperId)}>{reviewId === result.paperId ? 'Close review' : 'Review'}</button>}
        {reviewId === result.paperId && <PaperReview paperId={result.paperId} onDone={load} />}
      </li>)}</ul>
      {batch.solutions.filter((solution) => solution.status === 'needs_review').map((solution) => <div key={solution.fileHash} className="bulk-solution-review"><strong>Match solution: {solution.fileName}</strong><select aria-label={`Paper for ${solution.fileName}`} value={solutionMatches[solution.fileHash] || ''} onChange={(event) => setSolutionMatches({ ...solutionMatches, [solution.fileHash]: event.target.value })}><option value="">Choose the correct paper</option>{batch.results.filter((result) => result.status !== 'skipped' && result.paperId).map((result, index) => <option key={index} value={result.paperId}>{result.fileName}</option>)}</select><button type="button" disabled={!!busy || !solutionMatches[solution.fileHash]} onClick={() => attach(solution)}>Attach solution</button></div>)}
      {batch.solutions.filter((solution) => solution.status === 'failed').map((solution, index) => <p role="alert" key={index}>{solution.fileName}: {solution.message}</p>)}
    </>}
  </section>;
}
