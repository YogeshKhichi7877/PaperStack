import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBulkImportConfig, importPaperFiles } from '../services/bulkPaperImportApi';
import BulkImportProgress from './BulkImportProgress';
import './BulkPaperImport.css';

export default function BulkPaperImport({ toast }) {
  const [limits, setLimits] = useState(null);
  const [papers, setPapers] = useState([]);
  const [solutions, setSolutions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [communityAdded, setCommunityAdded] = useState(0);
  const [batchId, setBatchId] = useState(() => sessionStorage.getItem('lastPaperImportBatch') || '');
  const input = useRef(null), requestActive = useRef(false);
  const loadLimits = () => getBulkImportConfig().then(setLimits).catch(() => setError('Could not load import limits. Retry loading settings.'));
  useEffect(() => { let disposed = false; getBulkImportConfig().then((value) => { if (!disposed) setLimits(value); }).catch(() => { if (!disposed) setError('Could not load import limits. Retry loading settings.'); }); return () => { disposed = true; }; }, []);
  const select = (files, optional = false) => {
    if (busy || !limits) return;
    const existing = optional ? solutions : papers;
    const merged = [...existing];
    for (const file of Array.from(files || [])) if (!merged.some((item) => item.name === file.name && item.size === file.size && item.lastModified === file.lastModified)) merged.push(file);
    if (merged.some((file) => !/\.pdf$/i.test(file.name) || !['', 'application/pdf', 'application/octet-stream'].includes(file.type))) { setError('Select PDF files only.'); return; }
    if (merged.some((file) => file.size === 0 || file.size > limits.maxFileMb * 1024 * 1024)) { setError(`PDFs must be non-empty and no larger than ${limits.maxFileMb} MB.`); return; }
    if (merged.length > limits.maxFiles) { setError(`Select up to ${limits.maxFiles} ${optional ? 'solutions' : 'papers'} in one batch.`); return; }
    const total = [...merged, ...(optional ? papers : solutions)].reduce((sum, file) => sum + file.size, 0);
    if (total > limits.maxBatchMb * 1024 * 1024) { setError(`Keep each batch under ${limits.maxBatchMb} MB. Split these PDFs into smaller batches.`); return; }
    setError(''); (optional ? setSolutions : setPapers)(merged);
  };
  const run = async () => {
    if (requestActive.current || !papers.length || !limits) return;
    requestActive.current = true; setBusy(true); setProgress(0); setError('');
    try {
      const result = await importPaperFiles(papers, solutions, setProgress);
      sessionStorage.setItem('lastPaperImportBatch', result.batchId); setBatchId(result.batchId);
      setCommunityAdded(result.communityAdded || 0);
      setPapers([]); setSolutions([]);
      toast?.(`${result.queued} papers queued, ${result.skipped} duplicates skipped, ${result.failed} failed.`, result.failed ? 'warning' : 'success');
    } catch (failure) { setError(failure.response?.data?.message || 'Import interrupted. Retry with the same PDFs; already stored papers will be skipped.'); }
    finally { requestActive.current = false; setBusy(false); }
  };
  return <div className="bulk-import">
    <h2>Bulk Import</h2>
    <p>Upload question papers and PaperStack will automatically organize them and extract the questions.</p>
    {error && <p className="bulk-error" role="alert">{error}</p>}
    {!limits && <button type="button" onClick={loadLimits}>Retry loading settings</button>}
    <div className={`bulk-drop ${busy ? 'bulk-disabled' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); select(event.dataTransfer.files); }}>
      <span className="bulk-drop-icon" aria-hidden="true">↥</span>
      <h3>Drop PDFs here</h3><p>or</p>
      <input ref={input} hidden type="file" accept="application/pdf,.pdf" multiple disabled={busy || !limits} aria-label="Select paper PDFs" onChange={(event) => { select(event.target.files); event.target.value = ''; }} />
      <button type="button" className="login-btn-gradient" disabled={busy || !limits} onClick={() => input.current.click()}>Select Papers</button>
      <p>{limits ? `${limits.maxFiles} files maximum · ${limits.maxFileMb} MB per PDF · ${limits.maxBatchMb} MB per batch` : 'Loading import settings…'}</p>
    </div>
    <div className="bulk-selection-heading"><strong>{papers.length} / {limits?.maxFiles ?? '—'} papers selected</strong>
      {!!papers.length && <button type="button" disabled={busy} onClick={() => { setPapers([]); setError(''); }}>Clear selection</button>}
    </div>
    {!!papers.length && <ul className="bulk-file-list">{papers.map((file, index) => <li key={`${file.name}-${file.lastModified}-${index}`}>
      <span>✓ {file.name}</span><small>{(file.size / 1024 / 1024).toFixed(1)} MB</small>
      <button type="button" disabled={busy} aria-label={`Remove ${file.name}`} onClick={() => setPapers((files) => files.filter((_, position) => position !== index))}>×</button>
    </li>)}</ul>}
    <details className="bulk-solutions"><summary>Optional solution PDFs</summary>
      <p>Clear filename matches are attached automatically. Uncertain matches appear for review.</p>
      <input aria-label="Optional solution PDFs" type="file" accept="application/pdf,.pdf" multiple disabled={busy || !limits} onChange={(event) => { select(event.target.files, true); event.target.value = ''; }} />
      {solutions.map((file, index) => <p key={`${file.name}-${index}`}>{file.name} <button type="button" disabled={busy} aria-label={`Remove solution ${file.name}`} onClick={() => setSolutions((files) => files.filter((_, position) => index !== position))}>Remove</button></p>)}
    </details>
    <button type="button" className="login-btn-gradient bulk-submit" disabled={busy || !papers.length || !limits} onClick={run}>
      {busy ? progress === 100 ? 'Storing papers…' : `Uploading${progress == null ? '…' : ` ${progress}%…`}` : papers.length ? `Import ${papers.length} Papers` : 'Import Papers'}
    </button>
    {busy && <div className="bulk-upload-progress" role="status"><progress max="100" value={progress ?? undefined} /><p>Keep this page open while the PDFs upload. Question processing continues in the background once they are stored.</p></div>}
    {communityAdded > 0 && <p>PaperStack Community: +{communityAdded} contributions. Your personal contribution count is unchanged.</p>}
    {batchId && <><p><Link to={`/admin/question-extraction?batch=${batchId}`}>Open import progress</Link> · You can leave after the upload finishes.</p><BulkImportProgress batchId={batchId} toast={toast} /></>}
  </div>;
}
