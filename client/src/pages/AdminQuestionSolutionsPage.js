import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  getAdminQuestionSolutions,
  moderateQuestionSolution,
} from '../services/questionSolutionApi';

import './AdminQuestionSolutionsPage.css';
import QuestionText from '../components/QuestionText';

const MathAnswer = React.lazy(() => import('../components/MathAnswer'));

function formatDate(value) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    ).format(new Date(value));
  } catch {
    return '';
  }
}

export default function AdminQuestionSolutionsPage({
  toast,
}) {
  const [status, setStatus] = useState('pending');
  const [data, setData] = useState({
    solutions: [],
    stats: {},
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [notes, setNotes] = useState({});
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const result =
        await getAdminQuestionSolutions(
          status
        );

      setData(
        result || {
          solutions: [],
          stats: {},
        }
      );
    } catch (error) {
      console.error(
        'Admin student solutions failed:',
        error
      );

      if (toast) {
        toast(
          error.response?.data?.error ||
            'Failed to load student solutions.',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [status, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const term =
      search.trim().toLowerCase();

    if (!term) {
      return data.solutions || [];
    }

    return (data.solutions || []).filter(
      (solution) => {
        const q = solution.question || {};

        const pool = [
          solution.authorName,
          solution.answerText,
          q.subject,
          q.subjectCode,
          q.questionLabel,
          q.questionText,
          q.year,
          q.examType,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return pool.includes(term);
      }
    );
  }, [data.solutions, search]);

  const moderate = async (
    solution,
    nextStatus
  ) => {
    setBusy(solution._id);

    try {
      const result =
        await moderateQuestionSolution(
          solution._id,
          {
            status: nextStatus,
            moderationNote:
              notes[solution._id] || '',
          }
        );

      if (toast) {
        toast(
          result?.message ||
            'Solution updated.',
          'success'
        );
      }

      setNotes((current) => ({
        ...current,
        [solution._id]: '',
      }));

      await load();
    } catch (error) {
      if (toast) {
        toast(
          error.response?.data?.error ||
            'Failed to moderate solution.',
          'error'
        );
      }
    } finally {
      setBusy('');
    }
  };

  const stats = data.stats || {};

  return (
    <main className="as-page">
      <div className="as-shell">
        <section className="as-hero">
          <div>
            <span>Admin Moderation</span>
            <h1>
              Student Solution Review
            </h1>
            <p>
              Review question-level answers before
              they become visible to students.
            </p>
          </div>

          <div className="as-hero-stat">
            <strong>
              {stats.pending || 0}
            </strong>
            <span>pending review</span>
          </div>
        </section>

        <section className="as-stats">
          <article>
            <span>Total</span>
            <strong>
              {stats.total || 0}
            </strong>
          </article>

          <article>
            <span>Pending</span>
            <strong>
              {stats.pending || 0}
            </strong>
          </article>

          <article>
            <span>Approved</span>
            <strong>
              {stats.approved || 0}
            </strong>
          </article>

          <article>
            <span>Rejected</span>
            <strong>
              {stats.rejected || 0}
            </strong>
          </article>
        </section>

        <section className="as-toolbar">
          <div>
            {[
              ['pending', 'Pending'],
              ['approved', 'Approved'],
              ['rejected', 'Rejected'],
              ['all', 'All'],
            ].map(([value, label]) => (
              <button
                type="button"
                key={value}
                className={
                  status === value
                    ? 'active'
                    : ''
                }
                onClick={() =>
                  setStatus(value)
                }
              >
                {label}
              </button>
            ))}
          </div>

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search question, subject, student..."
          />
        </section>

        {loading ? (
          <div className="as-state">
            Loading student solutions…
          </div>
        ) : filtered.length ? (
          <section className="as-list">
            {filtered.map((solution) => {
              const q =
                solution.question || {};

              return (
                <article
                  key={solution._id}
                  className="as-card"
                >
                  <div className="as-card-head">
                    <div>
                      <span>
                        {q.subjectCode ||
                          'Question'}
                        {' · '}
                        {q.questionLabel ||
                          ''}
                      </span>

                      <h2>
                        {q.subject ||
                          'Student Solution'}
                      </h2>

                      <p>
                        {q.year || 'Year'}
                        {' · '}
                        {q.examType ||
                          'Exam'}
                        {' · Submitted by '}
                        {solution.authorName}
                      </p>
                    </div>

                    <div className="as-status">
                      {solution.status}
                    </div>
                  </div>

                  <div className="as-question">
                    <strong>
                      Question
                    </strong>
                    <p>
                      <QuestionText inline>
                        {q.questionText || 'Question text unavailable.'}
                      </QuestionText>
                    </p>

                    {q._id && (
                      <Link
                        to={`/questions/${q._id}`}
                        target="_blank"
                      >
                        Open question →
                      </Link>
                    )}
                  </div>

                  <div className="as-answer">
                    <strong>
                      Student answer
                    </strong>
                    <div>
                      <React.Suspense fallback={<p>{solution.answerText}</p>}>
                        <MathAnswer>{solution.answerText}</MathAnswer>
                      </React.Suspense>
                    </div>
                  </div>

                  <div className="as-meta">
                    <span>
                      Submitted{' '}
                      {formatDate(
                        solution.createdAt
                      )}
                    </span>
                    <span>
                      {solution.helpfulCount ||
                        0}{' '}
                      helpful votes
                    </span>
                  </div>

                  <label className="as-note">
                    Moderation note
                    <textarea
                      rows={2}
                      value={
                        notes[solution._id] ??
                        solution.moderationNote ??
                        ''
                      }
                      onChange={(event) =>
                        setNotes(
                          (current) => ({
                            ...current,
                            [solution._id]:
                              event.target
                                .value,
                          })
                        )
                      }
                      placeholder="Optional feedback for the contributor..."
                    />
                  </label>

                  <div className="as-actions">
                    <button
                      type="button"
                      className="approve"
                      disabled={
                        busy ===
                        solution._id
                      }
                      onClick={() =>
                        moderate(
                          solution,
                          'approved'
                        )
                      }
                    >
                      Approve solution
                    </button>

                    <button
                      type="button"
                      className="reject"
                      disabled={
                        busy ===
                        solution._id
                      }
                      onClick={() =>
                        moderate(
                          solution,
                          'rejected'
                        )
                      }
                    >
                      Reject / request correction
                    </button>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="as-state">
            No solutions match this filter.
          </div>
        )}
      </div>
    </main>
  );
}
