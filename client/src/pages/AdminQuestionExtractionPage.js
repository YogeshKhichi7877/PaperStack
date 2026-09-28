import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  extractQuestionBatch,
  extractQuestionsForPaper,
  getQuestionExtractionPapers,
  getQuestionExtractionStatus,
} from '../services/questionExtractionApi';
import './AdminQuestionExtractionPage.css';

function statusLabel(value) {
  return String(value || 'not_started')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function AdminQuestionExtractionPage({ toast }) {
  const [papers, setPapers] = useState([]);
  const [system, setSystem] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [runningId, setRunningId] = useState('');
  const [batchRunning, setBatchRunning] = useState(false);
  const [useAiFallback, setUseAiFallback] = useState(false);
  const [lastResult, setLastResult] = useState(null);

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

  const counts = useMemo(() => {
    const result = {
      all: papers.length,
      not_started: 0,
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
    setRunningId(String(paper._id));
    setLastResult(null);

    try {
      const response = await extractQuestionsForPaper(paper._id, {
        force,
        allowAi: useAiFallback,
      });

      setLastResult(response?.result || null);
      if (toast) {
        toast(
          `Extracted ${response?.result?.totalQuestionCount ?? response?.result?.questionCount ?? 0} questions.`,
          'success'
        );
      }
      await load();
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Question extraction failed';
      if (toast) toast(message, 'error');
    } finally {
      setRunningId('');
    }
  };

  const runBatch = async () => {
    setBatchRunning(true);
    setLastResult(null);

    try {
      const response = await extractQuestionBatch({
        limit: 5,
        allowAi: useAiFallback,
        force: false,
      });

      setLastResult(response?.result || null);
      if (toast) {
        toast(
          `Batch processed ${response?.result?.processed || 0} papers.`,
          'success'
        );
      }
      await load();
    } catch (error) {
      const message =
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
        <section className="qe-hero">
          <div>
            <span>Feature #9 · Admin Tool</span>
            <h1>Question Extraction Console</h1>
            <p>
              Convert approved PaperStack PDFs into individual question records.
              Local parsing runs first. Optional Gemini fallback is used only when enabled here
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
              Gemini: {system?.ai?.configured ? 'Configured' : 'Not configured'}
            </div>
          </div>
        </section>

        <section className="qe-stats">
          {[
            ['all', 'All papers'],
            ['not_started', 'Not started'],
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
              checked={useAiFallback}
              onChange={(event) => setUseAiFallback(event.target.checked)}
              disabled={!system?.ai?.configured}
            />
            <span>
              Allow Gemini fallback
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
                    <span>{question.questionText}</span>
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(lastResult.results) && (
              <p>
                Successful: {lastResult.successful || 0} · Failed: {lastResult.failed || 0}
              </p>
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

              return (
                <article className="qe-paper" key={paper._id}>
                  <div className={`qe-status qe-status-${paperStatus}`}>
                    {statusLabel(paperStatus)}
                  </div>

                  <div className="qe-paper-main">
                    <h2>{paper.subject || paper.title || 'Untitled paper'}</h2>
                    <p>
                      {paper.subjectCode || '—'} · {paper.branch || '—'} · Sem {paper.semester || '—'}
                      {' · '}{paper.examType || '—'} · {paper.year || '—'}
                    </p>
                  </div>

                  <div className="qe-count">
                    <span>Questions</span>
                    <strong>{paper.questionCount || 0}</strong>
                  </div>

                  <div className="qe-actions">
                    <button
                      type="button"
                      onClick={() => runOne(paper, paperStatus === 'complete')}
                      disabled={isRunning || !paper.hasPdf}
                    >
                      {isRunning
                        ? 'Extracting…'
                        : paperStatus === 'complete'
                          ? 'Re-extract'
                          : 'Extract questions'}
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
