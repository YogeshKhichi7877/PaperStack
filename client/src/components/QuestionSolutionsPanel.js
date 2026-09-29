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
  deleteMyQuestionSolution,
  getApprovedQuestionSolutions,
  getMyQuestionSolution,
  submitQuestionSolution,
  toggleHelpfulSolution,
} from '../services/questionSolutionApi';

import './QuestionSolutionsPanel.css';

const MathAnswer = React.lazy(() => import('./MathAnswer'));

function formatDate(value) {
  if (!value) return '';

  try {
    return new Intl.DateTimeFormat(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    ).format(new Date(value));
  } catch {
    return '';
  }
}

function SolutionStatus({ status }) {
  const labels = {
    pending: 'Pending review',
    approved: 'Approved',
    rejected: 'Needs correction',
  };

  return (
    <span
      className={`qs-status qs-status-${status || 'pending'}`}
    >
      {labels[status] || labels.pending}
    </span>
  );
}

export default function QuestionSolutionsPanel({
  question,
  toast,
}) {
  const questionId = question?._id;
  const loggedIn = Boolean(
    localStorage.getItem('token')
  );

  const [solutions, setSolutions] = useState([]);
  const [mySolution, setMySolution] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [loading, setLoading] = useState(true);
  const [mineLoading, setMineLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [helpfulBusy, setHelpfulBusy] = useState('');

  const loadPublic = useCallback(async () => {
    if (!questionId) return;

    try {
      const data =
        await getApprovedQuestionSolutions(
          questionId
        );

      setSolutions(
        Array.isArray(data?.solutions)
          ? data.solutions
          : []
      );
    } catch (error) {
      console.error(
        'Question solutions load failed:',
        error
      );

      if (toast) {
        toast(
          'Could not load student solutions.',
          'error'
        );
      }
    } finally {
      setLoading(false);
    }
  }, [questionId, toast]);

  const loadMine = useCallback(async () => {
    if (!questionId || !loggedIn) return;

    setMineLoading(true);

    try {
      const data =
        await getMyQuestionSolution(
          questionId
        );

      const solution =
        data?.solution || null;

      setMySolution(solution);

      if (solution?.canEdit) {
        setAnswerText(
          solution.answerText || ''
        );
      }
    } catch (error) {
      if (
        error.response?.status !== 401
      ) {
        console.error(
          'My solution load failed:',
          error
        );
      }
    } finally {
      setMineLoading(false);
    }
  }, [questionId, loggedIn]);

  useEffect(() => {
    setLoading(true);
    loadPublic();
    loadMine();
  }, [loadPublic, loadMine]);

  const canEdit = Boolean(
    loggedIn &&
    (!mySolution || mySolution.canEdit)
  );

  const chars = answerText.length;

  const submit = async () => {
    if (!loggedIn) return;

    if (chars < 20) {
      if (toast) {
        toast(
          'Write at least 20 characters before submitting.',
          'warning'
        );
      }
      return;
    }

    setSaving(true);

    try {
      const data =
        await submitQuestionSolution(
          questionId,
          answerText
        );

      setMySolution(
        data?.solution || null
      );

      if (toast) {
        toast(
          data?.message ||
            'Solution submitted for review.',
          'success'
        );
      }
    } catch (error) {
      if (toast) {
        toast(
          error.response?.data?.error ||
            'Failed to submit solution.',
          'error'
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const removeMine = async () => {
    if (!mySolution?.canEdit) return;

    const confirmed = window.confirm(
      'Delete your pending solution?'
    );

    if (!confirmed) return;

    try {
      await deleteMyQuestionSolution(
        questionId
      );

      setMySolution(null);
      setAnswerText('');

      if (toast) {
        toast(
          'Your solution was deleted.',
          'success'
        );
      }
    } catch (error) {
      if (toast) {
        toast(
          error.response?.data?.error ||
            'Failed to delete solution.',
          'error'
        );
      }
    }
  };

  const toggleHelpful = async (
    solutionId
  ) => {
    if (!loggedIn) {
      if (toast) {
        toast(
          'Login to mark a solution as helpful.',
          'info'
        );
      }
      return;
    }

    setHelpfulBusy(solutionId);

    try {
      const data =
        await toggleHelpfulSolution(
          solutionId
        );

      setSolutions((current) =>
        current.map((solution) =>
          solution._id === solutionId
            ? {
                ...solution,
                helpfulCount:
                  data.helpfulCount,
              }
            : solution
        )
      );

      if (toast) {
        toast(
          data.helpful
            ? 'Marked as helpful.'
            : 'Helpful vote removed.',
          'success'
        );
      }
    } catch (error) {
      if (toast) {
        toast(
          error.response?.data?.error ||
            'Could not update helpful vote.',
          'error'
        );
      }
    } finally {
      setHelpfulBusy('');
    }
  };

  const paperSolutionUrl =
    question?.paper?.solutionPath || '';

  const solutionCountLabel = useMemo(
    () =>
      `${solutions.length} approved ${
        solutions.length === 1
          ? 'solution'
          : 'solutions'
      }`,
    [solutions.length]
  );

  return (
    <section className="qs-panel">
      <div className="qs-heading">
        <div>
          <span>Student Solutions</span>
          <h2>
            Learn from community answers.
          </h2>
          <p>
            Solutions are reviewed before they
            become public.
          </p>
        </div>

        <div className="qs-heading-actions">
          <strong>
            {solutionCountLabel}
          </strong>

          {paperSolutionUrl && (
            <a
              href={paperSolutionUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Paper solution PDF
            </a>
          )}
        </div>
      </div>

      {mySolution && (
        <div
          className={`qs-my qs-my-${mySolution.status}`}
        >
          <div>
            <SolutionStatus
              status={mySolution.status}
            />

            <strong>
              Your submitted solution
            </strong>

            {mySolution.status ===
              'pending' && (
              <p>
                An admin will review it before
                other students can see it.
              </p>
            )}

            {mySolution.status ===
              'approved' && (
              <p>
                Your solution is public on this
                question.
              </p>
            )}

            {mySolution.status ===
              'rejected' && (
              <p>
                {mySolution.moderationNote ||
                  'Please improve the solution and resubmit it.'}
              </p>
            )}
          </div>

          {mySolution.canEdit && (
            <button
              type="button"
              onClick={removeMine}
            >
              Delete draft
            </button>
          )}
        </div>
      )}

      {loggedIn ? (
        canEdit && (
          <div className="qs-compose">
            <div className="qs-compose-head">
              <div>
                <span>
                  {mySolution
                    ? 'Improve & resubmit'
                    : 'Contribute a solution'}
                </span>
                <strong>
                  Write clear steps, formulas,
                  and the final result.
                </strong>
              </div>

              <small>
                {chars}/12000
              </small>
            </div>

            <textarea
              rows={9}
              value={answerText}
              maxLength={12000}
              disabled={
                saving ||
                mineLoading
              }
              onChange={(event) =>
                setAnswerText(
                  event.target.value
                )
              }
              placeholder={
                `Example:\n\n1. Write the required formula.\n2. Substitute the given values.\n3. Show the intermediate calculation.\n4. State the final answer clearly.`
              }
            />

            <div className="qs-compose-foot">
              <p>
                Markdown is supported. Do not include
                passwords, personal data, or
                copied private material.
              </p>

              <button
                type="button"
                disabled={
                  saving ||
                  chars < 20
                }
                onClick={submit}
              >
                {saving
                  ? 'Submitting…'
                  : mySolution
                    ? 'Resubmit for review'
                    : 'Submit for review'}
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="qs-login">
          <div>
            <strong>
              Have a better solution?
            </strong>
            <p>
              Login with your IIIT Surat account
              to contribute one.
            </p>
          </div>

          <Link
            to={`/login?redirect=${encodeURIComponent(
              `/questions/${questionId}`
            )}`}
          >
            Login to contribute
          </Link>
        </div>
      )}

      <div className="qs-public">
        <div className="qs-public-title">
          <span>Approved answers</span>
          <strong>
            {solutions.length}
          </strong>
        </div>

        {loading ? (
          <div className="qs-state">
            Loading student solutions…
          </div>
        ) : solutions.length ? (
          <div className="qs-list">
            {solutions.map(
              (solution, index) => (
                <article
                  key={solution._id}
                  className="qs-solution"
                >
                  <div className="qs-solution-top">
                    <div>
                      <span>
                        Solution #{index + 1}
                      </span>
                      <strong>
                        {solution.authorName}
                      </strong>
                    </div>

                    <div>
                      <span>
                        {formatDate(
                          solution.approvedAt ||
                            solution.createdAt
                        )}
                      </span>
                      <strong>
                        {solution.helpfulCount || 0}
                        {' '}helpful
                      </strong>
                    </div>
                  </div>

                  <div className="qs-answer">
                    <React.Suspense fallback={<p>{solution.answerText}</p>}>
                      <MathAnswer>{solution.answerText}</MathAnswer>
                    </React.Suspense>
                  </div>

                  <button
                    type="button"
                    disabled={
                      helpfulBusy ===
                      solution._id
                    }
                    onClick={() =>
                      toggleHelpful(
                        solution._id
                      )
                    }
                  >
                    {helpfulBusy ===
                    solution._id
                      ? 'Updating…'
                      : `👍 Helpful · ${
                          solution.helpfulCount ||
                          0
                        }`}
                  </button>
                </article>
              )
            )}
          </div>
        ) : (
          <div className="qs-state">
            <strong>
              No approved solution yet.
            </strong>
            <p>
              This is a good opportunity to
              contribute the first one.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
