import React, { useEffect, useMemo, useState } from 'react';
import {
  getPaperVerification,
  submitPaperVerification,
} from '../services/verificationApi';
import './PaperVerificationModal.css';

const DEFAULT_ISSUES = [
  { value: 'wrong_subject', label: 'Wrong subject' },
  { value: 'wrong_branch', label: 'Wrong branch' },
  { value: 'wrong_semester', label: 'Wrong semester' },
  { value: 'wrong_year', label: 'Wrong year' },
  { value: 'wrong_exam_type', label: 'Wrong exam type' },
  { value: 'unreadable_pdf', label: 'PDF unreadable' },
  { value: 'duplicate', label: 'Duplicate paper' },
  { value: 'solution_issue', label: 'Solution issue' },
  { value: 'other', label: 'Other issue' },
];

export function VerificationStatusBadge({ summary }) {
  const status = summary?.status || 'unverified';
  const label = summary?.statusLabel || 'Unverified';
  return <span className={`pv-status pv-status-${status}`}>{label}</span>;
}

export default function PaperVerificationModal({
  paper,
  user,
  onClose,
  toast,
  navigate,
  onUpdated,
}) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [issueOptions, setIssueOptions] = useState(DEFAULT_ISSUES);
  const [metadataCorrect, setMetadataCorrect] = useState(null);
  const [pdfReadable, setPdfReadable] = useState(null);
  const [issues, setIssues] = useState([]);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const paperId = paper?._id;

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!paperId) return;
      setLoading(true);
      try {
        const data = await getPaperVerification(paperId);
        if (!mounted) return;
        setSummary(data.summary || null);
        if (Array.isArray(data.issueTypes) && data.issueTypes.length) {
          setIssueOptions(data.issueTypes);
        }
      } catch (error) {
        if (toast) toast('Could not load verification status', 'error');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [paperId, toast]);

  const canSubmit = useMemo(() => (
    metadataCorrect !== null ||
    pdfReadable !== null ||
    issues.length > 0 ||
    note.trim().length > 0
  ), [metadataCorrect, pdfReadable, issues, note]);

  const toggleIssue = (value) => {
    setIssues((current) => (
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    ));
  };

  const markEverythingCorrect = () => {
    setMetadataCorrect(true);
    setPdfReadable(true);
    setIssues([]);
  };

  const submit = async () => {
    if (!user) {
      if (toast) toast('Login with your IIIT Surat account to verify papers.', 'info');
      if (navigate) {
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      }
      return;
    }

    if (!canSubmit) {
      if (toast) toast('Choose at least one verification option.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const data = await submitPaperVerification(paperId, {
        metadataCorrect,
        pdfReadable,
        issueTypes: issues,
        note,
      });

      setSummary(data.summary || null);
      if (toast) toast('Thanks — your verification was saved.', 'success');
      if (onUpdated) onUpdated(data.summary || null);
      setMetadataCorrect(null);
      setPdfReadable(null);
      setIssues([]);
      setNote('');
    } catch (error) {
      const message =
        error.response?.data?.error ||
        error.message ||
        'Failed to save verification';
      if (toast) toast(message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!paper) return null;

  return (
    <div className="pv-overlay" onClick={onClose}>
      <div className="pv-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <button className="pv-close" type="button" onClick={onClose} aria-label="Close verification">
          ×
        </button>

        <div className="pv-head">
          <div>
            <span className="pv-eyebrow">Community Verification</span>
            <h2>Check this paper</h2>
            <p>{paper.subject} · {paper.examType} · {paper.year}</p>
          </div>
          <VerificationStatusBadge summary={summary} />
        </div>

        {loading ? (
          <div className="pv-loading">Loading verification status…</div>
        ) : (
          <>
            <section className="pv-summary">
              <div>
                <span>Responses</span>
                <strong>{summary?.totalResponses || 0}</strong>
              </div>
              <div>
                <span>Metadata correct</span>
                <strong>{summary?.metadataCorrectPercentage == null ? '—' : `${summary.metadataCorrectPercentage}%`}</strong>
              </div>
              <div>
                <span>PDF readable</span>
                <strong>{summary?.pdfReadablePercentage == null ? '—' : `${summary.pdfReadablePercentage}%`}</strong>
              </div>
            </section>

            {summary?.issueBreakdown?.length > 0 && (
              <div className="pv-existing-issues">
                <strong>Community flags</strong>
                <div>
                  {summary.issueBreakdown.map((item) => (
                    <span key={item.type}>{item.label} · {item.count}</span>
                  ))}
                </div>
              </div>
            )}

            <section className="pv-form">
              <button type="button" className="pv-correct-all" onClick={markEverythingCorrect}>
                ✓ Everything looks correct
              </button>

              <div className="pv-check-grid">
                <div>
                  <span>Are subject, branch, semester, year and exam type correct?</span>
                  <div className="pv-choice-row">
                    <button
                      type="button"
                      className={metadataCorrect === true ? 'active' : ''}
                      onClick={() => setMetadataCorrect(true)}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={metadataCorrect === false ? 'active danger' : ''}
                      onClick={() => setMetadataCorrect(false)}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div>
                  <span>Does the PDF open and remain readable?</span>
                  <div className="pv-choice-row">
                    <button
                      type="button"
                      className={pdfReadable === true ? 'active' : ''}
                      onClick={() => setPdfReadable(true)}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={pdfReadable === false ? 'active danger' : ''}
                      onClick={() => setPdfReadable(false)}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>

              <div className="pv-issues">
                <span>If something is wrong, select the exact issue:</span>
                <div className="pv-issue-grid">
                  {issueOptions.map((option) => (
                    <button
                      type="button"
                      key={option.value}
                      className={issues.includes(option.value) ? 'selected' : ''}
                      onClick={() => toggleIssue(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="pv-note">
                Optional note
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value.slice(0, 500))}
                  rows={3}
                  placeholder="Example: year printed on page 1 is 2025, not 2024."
                />
                <small>{note.length}/500</small>
              </label>

              {!user && (
                <div className="pv-login-note">
                  You can inspect community status without logging in. Sign in to submit a verification.
                </div>
              )}

              <button
                type="button"
                className="pv-submit"
                disabled={submitting || (!canSubmit && Boolean(user))}
                onClick={submit}
              >
                {submitting ? 'Saving…' : user ? 'Submit verification' : 'Login to verify'}
              </button>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
