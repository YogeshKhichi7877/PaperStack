import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  extractQuestionBatch,
  extractQuestionsForPaper,
  getQuestionExtractionJob,
  getQuestionExtractionPapers,
  getQuestionExtractionStatus,
} from '../services/questionExtractionApi';
import './AdminQuestionExtractionPage.css';
import QuestionText from '../components/QuestionText';
import BulkImportProgress from '../components/BulkImportProgress';
import { getImportBatches } from '../services/bulkPaperImportApi';

function statusLabel(value) {
  return String(value || 'not_started')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function waitForExtractionJob(jobId, onProgress = () => {}) {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const response = await getQuestionExtractionJob(jobId);
    const job = response?.job;
    onProgress(job);
    if (['complete', 'partial'].includes(job?.status)) return job.result;
    if (job?.status === 'failed') throw new Error(job.error || 'Question extraction failed');
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error('Question extraction is still processing. Refresh this page to check its status.');
}

export default function AdminQuestionExtractionPage({ toast }) {
  const [importBatches, setImportBatches] = useState([]);
  const [historyCursor, setHistoryCursor] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(() => new URLSearchParams(window.location.search).get('batch') || '');
  useEffect(() => {
    let disposed = false;
    getImportBatches().then((response) => {
      if (!disposed) { setImportBatches(response.batches || []); setHistoryCursor(response.nextCursor || null); setSelectedBatch((current) => current || response.batches?.[0]?.batchId || ''); }
    }).catch(() => {});
    return () => { disposed = true; };
  }, []);
  const loadOlderImports = async () => {
    setHistoryLoading(true);
    try { const response = await getImportBatches(historyCursor); setImportBatches((current) => [...current, ...(response.batches || [])]); setHistoryCursor(response.nextCursor || null); }
    catch { toast?.('Could not load older imports.', 'error'); }
    finally { setHistoryLoading(false); }
  };
  const [papers, setPapers] = useState([]);
  const [system, setSystem] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState('');
  const [batchRunning, setBatchRunning] = useState(false);
  const [useAiFallback, setUseAiFallback] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const activeRequests = useRef(new Set());
  const aiFallbackEnabled = useAiFallback ?? Boolean(system?.ai?.configured);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusResponse, papersResponse] = await Promise.all([
        getQuestionExtractionStatus(),
        getQuestionExtractionPapers({ limit: 200 }),
      ]);

      setSystem(statusResponse || null);
      setPapers(papersResponse?.papers || []);
    } catch (error) {
      const message =
        error.response?.data?.error ||
        'Failed to load question extraction console';
      if (toast) toast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const hasActivePapers = papers.some((paper) => ['queued', 'processing'].includes(paper.questionExtractionStatus));
  useEffect(() => {
    if (!hasActivePapers) return undefined;
    let disposed = false;
    const timer = setInterval(async () => {
      try {
        const response = await getQuestionExtractionPapers({ limit: 200 });
        if (!disposed) setPapers(response?.papers || []);
      } catch { /* Keep the last known progress while connectivity recovers. */ }
    }, 5000);
    return () => { disposed = true; clearInterval(timer); };
  }, [hasActivePapers]);

  const counts = useMemo(() => {
    const result = {
      all: papers.length,
      not_started: 0,
      queued: 0,
      processing: 0,
      complete: 0,
      partial: 0,
      failed: 0,
    };

    papers.forEach((paper) => {
      const status = paper.questionExtractionStatus || 'not_started';
      result[status] = (result[status] || 0) + 1;
    });

    return result;
  }, [papers]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return papers.filter((paper) => {
      const status = paper.questionExtractionStatus || 'not_started';
      const statusMatches = filter === 'all' || status === filter;
      const pool = [
        paper.title,
        paper.subject,
        paper.subjectCode,
        paper.branch,
        paper.semester,
        paper.year,
        paper.examType,
      ].filter(Boolean).join(' ').toLowerCase();

      return statusMatches && (!term || pool.includes(term));
    });
  }, [papers, filter, search]);

  const runOne = async (paper, force = false) => {
    const paperId = String(paper._id);
    if (activeRequests.current.has(paperId)) return;
    activeRequests.current.add(paperId);
    setRunningId(paperId);
    setLastResult(null);

    try {
      const response = await extractQuestionsForPaper(paper._id, {
        force,
        allowAi: aiFallbackEnabled,
        background: true,
      });
      setPapers((current) => current.map((item) => String(item._id) === paperId
        ? { ...item, questionExtractionStatus: response?.job?.status || 'queued' }
        : item));
      const result = response?.queued
        ? await waitForExtractionJob(response.job?.id, (job) => {
          if (job?.processing) setPapers((current) => current.map((item) => String(item._id) === paperId
            ? { ...item, processing: job.processing, questionExtractionStatus: job.status } : item));
        })
        : response?.result;
      setLastResult(result || null);
      if (toast) {
        toast(
          `Extracted ${result?.totalQuestionCount ?? result?.questionCount ?? 0} questions.${result?.reviewCount ? ` ${result.reviewCount} need review.` : ''}`,
          result?.reviewCount ? 'info' : 'success'
        );
      }
      await load();
    } catch (error) {
      if (error.response?.data?.result) {
        setLastResult(error.response.data.result);
        await load();
      }
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Question extraction failed';
      const retryAfter = Number(error.response?.data?.retryAfterSeconds || 0);
      if (toast) toast(retryAfter ? `${message} Retry in about ${retryAfter} seconds.` : message, 'error');
    } finally {
      activeRequests.current.delete(paperId);
      setRunningId('');
    }
  };

  const runBatch = async () => {
    setBatchRunning(true);
    setLastResult(null);

    try {
      const response = await extractQuestionBatch({
        limit: 5,
        allowAi: aiFallbackEnabled,
        force: false,
        background: true,
      });
      const result = response?.queued
        ? await waitForExtractionJob(response.job?.id)
        : response?.result;
      setLastResult(result || null);
      if (toast) {
        toast(
          `Batch completed: ${result?.successful || 0} succeeded, ${result?.failed || 0} failed.`,
          result?.failed ? 'error' : 'success'
        );
      }
      await load();
    } catch (error) {
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        'Batch extraction failed';
      if (toast) toast(message, 'error');
    } finally {
      setBatchRunning(false);
    }
  };

  return (
    <main className="qe-page">
      <Helmet>
        <title>Question Extraction - PaperStack Admin</title>
      </Helmet>

      <div className="qe-shell">
        <section className="qe-result">
          <h2>Bulk imports</h2>
          <p>PDFs are processed automatically after upload. You can return here to check progress and review uncertain details.</p>
          <label>Import batch <select value={selectedBatch} onChange={(event) => setSelectedBatch(event.target.value)}>
            <option value="">Choose an import batch</option>
            {selectedBatch && !importBatches.some((batch) => batch.batchId === selectedBatch) && <option value={selectedBatch}>Import #{selectedBatch.slice(-8)}</option>}
            {importBatches.map((batch) => <option key={batch.batchId} value={batch.batchId}>#{batch.batchId.slice(-8)} · {batch.totalFiles} papers · {new Date(batch.createdAt).toLocaleDateString()}</option>)}
          </select></label>
          {historyCursor && <button type="button" disabled={historyLoading} onClick={loadOlderImports}>{historyLoading ? 'Loading…' : 'Load older imports'}</button>}
          {selectedBatch && <BulkImportProgress batchId={selectedBatch} toast={toast} />}
        </section>
        <section className="qe-hero">
          <div>
            <span>Feature #9 · Admin Tool</span>
            <h1>Question Extraction Console</h1>
            <p>
              Convert approved PaperStack PDFs into individual question records.
              Local parsing runs first. Optional AI extraction is used only when enabled here
              and local confidence is low.
            </p>
          </div>

          <div className="qe-engine-card">
            <span>Extraction engine</span>
            <strong>Local rules first</strong>
            <p>
              Minimum confidence: {system?.minimumConfidence ?? '—'}%
            </p>
            <div className="qe-ai-line">
              AI: {system?.ai?.configured ? 'Configured' : 'Not configured'}
            </div>
          </div>
        </section>

        <section className="qe-stats">
          {[
            ['all', 'All papers'],
            ['not_started', 'Not started'],
            ['queued', 'Queued'],
            ['processing', 'Processing'],
            ['complete', 'Complete'],
            ['partial', 'Partial'],
            ['failed', 'Failed'],
          ].map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={filter === key ? 'active' : ''}
              onClick={() => setFilter(key)}
            >
              <span>{label}</span>
              <strong>{counts[key] || 0}</strong>
            </button>
          ))}
        </section>

        <section className="qe-toolbar">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search paper, subject, code, year..."
          />

          <label className="qe-ai-toggle">
            <input
              type="checkbox"
              checked={aiFallbackEnabled}
              onChange={(event) => setUseAiFallback(event.target.checked)}
              disabled={!system?.ai?.configured}
            />
            <span>
              Allow AI extraction for difficult or scanned PDFs
              {!system?.ai?.configured ? ' (not configured)' : ''}
            </span>
          </label>

          <button
            type="button"
            className="qe-batch"
            onClick={runBatch}
            disabled={batchRunning}
          >
            {batchRunning ? 'Processing 5 papers…' : 'Extract next 5'}
          </button>
        </section>

        {lastResult && (
          <section className="qe-result">
            <strong>Latest extraction result</strong>
            {lastResult.failureReason && (
              <p className="qe-failure-reason" role="alert">{lastResult.failureReason}</p>
            )}
            {'engine' in lastResult && (
              <p>
                Engine: {lastResult.engine || '—'} · Confidence: {lastResult.confidence ?? '—'}%
                · Questions: {lastResult.totalQuestionCount ?? lastResult.questionCount ?? 0}
              </p>
            )}
            {Array.isArray(lastResult.preview) && lastResult.preview.length > 0 && (
              <div className="qe-preview">
                {lastResult.preview.slice(0, 6).map((question, index) => (
                  <div key={`${question.questionLabel}-${index}`}>
                    <strong>{question.questionLabel}</strong>
                    <QuestionText inline>{question.questionText}</QuestionText>
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(lastResult.results) && (
              <>
                <p>Successful: {lastResult.successful || 0} · Failed: {lastResult.failed || 0}</p>
                {lastResult.results.filter((item) => !item.success).map((item) => (
                  <p className="qe-failure-reason" key={item.paperId}>
                    {item.title || 'Paper'}: {item.error || 'No questions were identified.'}
                  </p>
                ))}
              </>
            )}
          </section>
        )}

        {loading ? (
          <div className="qe-loading">Loading papers…</div>
        ) : (
          <section className="qe-list">
            {filtered.map((paper) => {
              const paperStatus = paper.questionExtractionStatus || 'not_started';
              const isRunning = runningId === String(paper._id);
              const isQueued = ['queued', 'processing'].includes(paperStatus);

              return (
                <article className="qe-paper" key={paper._id}>
                  <div className={`qe-status qe-status-${paperStatus}`}>
                    {statusLabel(paper.processing?.stage || paperStatus)}
                  </div>

                  <div className="qe-paper-main">
                    <h2>{paper.subject || paper.title || 'Untitled paper'}</h2>
                    <p>
                      {paper.subjectCode || '—'} · {paper.branch || '—'} · Sem {paper.semester || '—'}
                      {' · '}{paper.examType || '—'} · {paper.year || '—'}
                    </p>
                    {paper.processing?.reviewCount > 0 && <p>{paper.processing.reviewCount} questions need review</p>}
                    {paper.processing?.error?.code && <p>{paper.processing.error.code} · {statusLabel(paper.processing.error.stage)}</p>}
                  </div>

                  <div className="qe-count">
                    <span>Questions</span>
                    <strong>{paper.questionCount || 0}</strong>
                  </div>

                  <div className="qe-actions">
                    <button
                      type="button"
                      onClick={() => runOne(paper, paperStatus === 'complete')}
                      disabled={isRunning || isQueued || !paper.hasPdf}
                    >
                      {isRunning
                        ? 'Queued / Processing…'
                        : isQueued
                          ? paperStatus === 'queued' ? 'Queued…' : 'Processing…'
                        : paperStatus === 'complete'
                          ? 'Re-extract'
                          : paperStatus === 'failed' ? 'Retry' : 'Extract questions'}
                    </button>
                  </div>
                </article>
              );
            })}

            {!filtered.length && (
              <div className="qe-empty">No papers match this filter.</div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
