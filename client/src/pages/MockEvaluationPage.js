import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Helmet } from 'react-helmet-async';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  Clock3,
  FileQuestion,
  Flag,
  GraduationCap,
  Lightbulb,
  RotateCcw,
  Send,
  Sparkles,
  Target,
} from 'lucide-react';

import {
  evaluateMockAnswers,
  getMockEvaluationStatus,
} from '../services/mockEvaluationApi';

import {
  saveMockEvidence,
} from '../utils/studyEvidence';

import './MockEvaluationPage.css';

const MathAnswer = React.lazy(
  () =>
    import(
      '../components/MathAnswer'
    )
);

/* =========================================================
   STORAGE
========================================================= */

function loadMock(mockId) {
  try {
    if (mockId) {
      const direct =
        localStorage.getItem(
          `paperstack_mock_definition_${mockId}`
        );

      if (direct) {
        return JSON.parse(direct);
      }
    }

    const last =
      localStorage.getItem(
        'paperstack_last_mock'
      );

    return last
      ? JSON.parse(last)
      : null;
  } catch {
    return null;
  }
}

function answerStorageKey(mockId) {
  return `paperstack_mock_answers_${
    mockId || 'unknown'
  }`;
}

function resultStorageKey(mockId) {
  return `paperstack_mock_evaluation_${
    mockId || 'unknown'
  }`;
}

function sessionStorageKey(mockId) {
  return `paperstack_mock_${
    mockId || 'unknown'
  }`;
}

function flagStorageKey(mockId) {
  return `paperstack_mock_flags_${
    mockId || 'unknown'
  }`;
}

function loadAnswers(mockId) {
  try {
    const raw =
      localStorage.getItem(
        answerStorageKey(mockId)
      );

    return raw
      ? JSON.parse(raw)
      : {};
  } catch {
    return {};
  }
}

function loadResult(mockId) {
  try {
    const raw =
      localStorage.getItem(
        resultStorageKey(mockId)
      );

    return raw
      ? JSON.parse(raw)
      : null;
  } catch {
    return null;
  }
}

function loadFlags(mockId) {
  try {
    const raw =
      localStorage.getItem(
        flagStorageKey(mockId)
      );

    const parsed = raw
      ? JSON.parse(raw)
      : [];

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function loadStartedAt(mockId) {
  try {
    const raw =
      localStorage.getItem(
        sessionStorageKey(mockId)
      );

    const parsed = raw
      ? JSON.parse(raw)
      : {};

    return (
      parsed.startedAt ||
      null
    );
  } catch {
    return null;
  }
}

/* =========================================================
   HELPERS
========================================================= */

function formatClock(seconds) {
  if (
    seconds === null ||
    seconds === undefined
  ) {
    return '--:--';
  }

  const safe = Math.max(
    0,
    Number(seconds)
  );

  const minutes =
    Math.floor(safe / 60);

  const remaining =
    safe % 60;

  return `${minutes}:${String(
    remaining
  ).padStart(2, '0')}`;
}

function answerExists(
  answers,
  questionId
) {
  return Boolean(
    String(
      answers[questionId] || ''
    ).trim()
  );
}

function getSourceLabel(question) {
  return question.source ===
    'generated'
    ? 'Fresh practice question'
    : 'Previous paper';
}

/* =========================================================
   QUESTION NAVIGATOR
========================================================= */

function QuestionNavigator({
  questions,
  answers,
  flagged,
  activeIndex,
  onSelect,
}) {
  return (
    <nav
      className="mv-question-index"
      aria-label="Mock questions"
    >
      {questions.map(
        (question, index) => {
          const answered =
            answerExists(
              answers,
              question._id
            );

          const isFlagged =
            flagged.includes(
              question._id
            );

          return (
            <button
              key={question._id}
              type="button"
              aria-current={
                activeIndex === index
                  ? 'step'
                  : undefined
              }
              className={[
                answered
                  ? 'answered'
                  : '',
                isFlagged
                  ? 'flagged'
                  : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() =>
                onSelect(index)
              }
              title={`Question ${
                index + 1
              }${
                answered
                  ? ', answered'
                  : ''
              }${
                isFlagged
                  ? ', flagged'
                  : ''
              }`}
            >
              <span>
                {index + 1}
              </span>

              {isFlagged && (
                <Flag size={9} />
              )}
            </button>
          );
        }
      )}
    </nav>
  );
}

/* =========================================================
   RESULT STAT
========================================================= */

function ResultStat({
  icon: Icon,
  label,
  value,
  tone = 'teal',
}) {
  return (
    <article
      className={`mv-result-stat mv-result-${tone}`}
    >
      <span className="mv-result-stat-icon">
        <Icon size={20} />
      </span>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function MockEvaluationPage({
  toast,
}) {
  const [
    searchParams,
  ] = useSearchParams();

  const queryMockId =
    searchParams.get('mockId') ||
    '';

  const [mock, setMock] =
    useState(() =>
      loadMock(queryMockId)
    );

  const mockId =
    mock?.mockId ||
    queryMockId;

  const [
    answers,
    setAnswers,
  ] = useState(() =>
    loadAnswers(mockId)
  );

  const [
    aiAvailable,
    setAiAvailable,
  ] = useState(false);

  const [
    evaluating,
    setEvaluating,
  ] = useState(false);

  const [
    result,
    setResult,
  ] = useState(() =>
    loadResult(mockId)
  );

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  const [
    clockNow,
    setClockNow,
  ] = useState(Date.now());

  const [
    startedAt,
    setStartedAt,
  ] = useState(() =>
    loadStartedAt(mockId)
  );

  const [
    flagged,
    setFlagged,
  ] = useState(() =>
    loadFlags(mockId)
  );

  /* =========================================================
     INITIALIZE MOCK
  ========================================================= */

  useEffect(() => {
    const loaded =
      loadMock(queryMockId);

    setMock(loaded);

    const nextId =
      loaded?.mockId ||
      queryMockId;

    setAnswers(
      loadAnswers(nextId)
    );

    setResult(
      loadResult(nextId)
    );

    setFlagged(
      loadFlags(nextId)
    );

    setActiveIndex(0);

    try {
      const raw =
        localStorage.getItem(
          sessionStorageKey(
            nextId
          )
        );

      const saved = raw
        ? JSON.parse(raw)
        : {};

      const start =
        saved.startedAt ||
        new Date().toISOString();

      setStartedAt(start);

      if (!saved.startedAt) {
        localStorage.setItem(
          sessionStorageKey(
            nextId
          ),
          JSON.stringify({
            ...saved,
            startedAt:
              start,
            completed:
              saved.completed ||
              [],
          })
        );
      }
    } catch {
      setStartedAt(
        new Date().toISOString()
      );
    }
  }, [queryMockId]);

  /* =========================================================
     TIMER
  ========================================================= */

  useEffect(() => {
    const timer =
      setInterval(() => {
        setClockNow(
          Date.now()
        );
      }, 1000);

    return () =>
      clearInterval(timer);
  }, []);

  /* =========================================================
     EVALUATION AVAILABILITY
  ========================================================= */

  useEffect(() => {
    getMockEvaluationStatus()
      .then((data) => {
        setAiAvailable(
          Boolean(
            data?.aiAvailable
          )
        );
      })
      .catch((error) => {
        console.error(
          'Evaluation status failed:',
          error
        );

        setAiAvailable(false);
      });
  }, []);

  /* =========================================================
     AUTOSAVE ANSWERS
  ========================================================= */

  useEffect(() => {
    if (!mockId) return;

    try {
      localStorage.setItem(
        answerStorageKey(
          mockId
        ),
        JSON.stringify(
          answers
        )
      );
    } catch {}
  }, [
    answers,
    mockId,
  ]);

  /* =========================================================
     DERIVED DATA
  ========================================================= */

  const evaluationById =
    useMemo(
      () =>
        new Map(
          (
            result?.items ||
            []
          ).map(
            (item) => [
              String(
                item.questionId
              ),
              item,
            ]
          )
        ),
      [result]
    );

  const answeredCount =
    useMemo(
      () =>
        mock?.questions?.filter(
          (question) =>
            answerExists(
              answers,
              question._id
            )
        ).length || 0,
      [
        mock,
        answers,
      ]
    );

  const questionCount =
    mock?.questions?.length ||
    0;

  const completion =
    questionCount
      ? Math.round(
          (answeredCount /
            questionCount) *
            100
        )
      : 0;

  const secondsLeft =
    useMemo(() => {
      if (
        !startedAt ||
        !mock
      ) {
        return null;
      }

      const duration =
        Number(
          mock.durationMinutes ||
          0
        );

      if (!duration) {
        return null;
      }

      const elapsed =
        Math.floor(
          (clockNow -
            new Date(
              startedAt
            ).getTime()) /
            1000
        );

      return Math.max(
        0,
        duration * 60 -
          elapsed
      );
    }, [
      startedAt,
      mock,
      clockNow,
    ]);

  const currentQuestion =
    mock?.questions?.[
      activeIndex
    ];

  const mode =
    aiAvailable
      ? 'ai'
      : 'local';

  /* =========================================================
     ACTIONS
  ========================================================= */

  function updateAnswer(
    questionId,
    value
  ) {
    setAnswers(
      (current) => ({
        ...current,
        [questionId]:
          value,
      })
    );
  }

  function toggleFlag(
    questionId
  ) {
    const next =
      flagged.includes(
        questionId
      )
        ? flagged.filter(
            (item) =>
              item !==
              questionId
          )
        : [
            ...flagged,
            questionId,
          ];

    setFlagged(next);

    try {
      localStorage.setItem(
        flagStorageKey(
          mockId
        ),
        JSON.stringify(
          next
        )
      );
    } catch {}
  }

  async function evaluate() {
    if (
      !mock?.questions?.length ||
      evaluating
    ) {
      return;
    }

    const payload = {
      mockId:
        mock.mockId,

      mode:
        mode === 'ai' &&
        aiAvailable
          ? 'ai'
          : 'local',

      answers:
        mock.questions.map(
          (question) => ({
            questionId:
              question._id,

            answerText:
              answers[
                question._id
              ] || '',
          })
        ),
    };

    setEvaluating(true);

    try {
      const data =
        await evaluateMockAnswers(
          payload
        );

      setResult(data);

      saveMockEvidence(
        mock,
        data
      );

      try {
        localStorage.setItem(
          resultStorageKey(
            mock.mockId
          ),
          JSON.stringify(
            data
          )
        );
      } catch {}

      toast?.(
        'Mock evaluation complete.',
        'success'
      );
    } catch (error) {
      toast?.(
        error.response?.data
          ?.error ||
          'Failed to evaluate the mock.',
        'error'
      );
    } finally {
      setEvaluating(false);
    }
  }

  function clearAnswers() {
    setAnswers({});
    setResult(null);
    setActiveIndex(0);

    try {
      localStorage.removeItem(
        answerStorageKey(
          mockId
        )
      );

      localStorage.removeItem(
        resultStorageKey(
          mockId
        )
      );
    } catch {}
  }

  /* =========================================================
     EMPTY STATE
  ========================================================= */

  if (!mock) {
    return (
      <main className="mv-page">
        <Helmet>
          <title>
            Mock Evaluation -
            PaperStack
          </title>
        </Helmet>

        <div className="mv-shell">
          <section className="mv-empty-state">
            <span className="mv-empty-icon">
              <FileQuestion
                size={34}
              />
            </span>

            <h1>
              No mock exam is
              loaded.
            </h1>

            <p>
              Generate a mock first,
              then PaperStack will
              open it here as an
              exam-style workspace.
            </p>

            <Link to="/mock-exams">
              Generate a Mock
              <ArrowRight size={16} />
            </Link>
          </section>
        </div>
      </main>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main className="mv-page">
      <Helmet>
        <title>
          Mock Evaluation -
          PaperStack
        </title>

        <meta
          name="description"
          content="Practice PaperStack mock exams, submit answers and receive detailed feedback."
        />
      </Helmet>

      <div className="mv-shell">
        {/* =================================================
            PAGE HEADER
        ================================================= */}

        <header className="mv-page-header">
          <div>
            <span className="mv-eyebrow">
              <ClipboardCheck
                size={15}
              />
              Mock Exam Center
            </span>

            <h1>
              Write like it's the
              exam.
              <span>
                {' '}
                Learn from every
                answer.
              </span>
            </h1>

            <p>
              Attempt your mock in
              exam conditions, then
              submit it for
              PaperStack feedback.
            </p>
          </div>

          <Link
            className="mv-back-link"
            to="/mock-exams"
          >
            <ArrowLeft size={16} />
            Mock Center
          </Link>
        </header>

        {/* =================================================
            EXAM STRIP
        ================================================= */}

        <section className="mv-exam-strip">
          <div className="mv-paper-identity">
            <span className="mv-paper-icon">
              <GraduationCap
                size={22}
              />
            </span>

            <div>
              <span>
                {
                  mock.subject
                    ?.subjectCode
                }
              </span>

              <strong>
                {
                  mock.subject
                    ?.subject
                }
              </strong>

              <small>
                {mock.examType ||
                  'Practice Exam'}
                {' · '}
                {
                  mock.generatedMarks
                }{' '}
                marks
                {mock.durationMinutes
                  ? ` · ${mock.durationMinutes} min`
                  : ''}
              </small>
            </div>
          </div>

          {!result && (
            <div className="mv-exam-progress">
              <div className="mv-progress-copy">
                <span>
                  Progress
                </span>

                <strong>
                  {answeredCount}/
                  {questionCount}
                </strong>
              </div>

              <div className="mv-progress-track">
                <span
                  style={{
                    width: `${completion}%`,
                  }}
                />
              </div>
            </div>
          )}

          {!result &&
            secondsLeft !==
              null && (
              <div
                className={`mv-timer ${
                  secondsLeft <= 300
                    ? 'is-low'
                    : ''
                }`}
              >
                <Clock3
                  size={18}
                />

                <div>
                  <span>
                    Time left
                  </span>

                  <strong>
                    {formatClock(
                      secondsLeft
                    )}
                  </strong>
                </div>
              </div>
            )}

          {!result && (
            <button
              type="button"
              className="mv-submit"
              disabled={
                evaluating
              }
              onClick={evaluate}
            >
              {evaluating ? (
                <>
                  <span className="mv-button-loader" />
                  Evaluating…
                </>
              ) : (
                <>
                  <Send size={16} />
                  Submit Mock
                </>
              )}
            </button>
          )}

          {result && (
            <div className="mv-result-score-badge">
              <strong>
                {
                  result.totalScore
                }
                /
                {
                  result.totalMarks
                }
              </strong>

              <span>
                {
                  result.percentage
                }
                %
              </span>
            </div>
          )}
        </section>

        {/* =================================================
            WARNINGS
        ================================================= */}

        {result?.warnings?.length >
          0 && (
          <section className="mv-warning">
            <AlertTriangle
              size={18}
            />

            <div>
              <strong>
                Evaluation note
              </strong>

              {result.warnings.map(
                (warning) => (
                  <p key={warning}>
                    {warning}
                  </p>
                )
              )}
            </div>
          </section>
        )}

        {/* =================================================
            EXAM MODE
        ================================================= */}

        {!result && (
          <section className="mv-exam-layout">
            {/* LEFT NAV */}

            <aside className="mv-exam-sidebar">
              <div className="mv-sidebar-head">
                <div>
                  <span>
                    Questions
                  </span>

                  <strong>
                    {questionCount}
                  </strong>
                </div>

                <small>
                  {flagged.length}{' '}
                  flagged
                </small>
              </div>

              <QuestionNavigator
                questions={
                  mock.questions
                }
                answers={answers}
                flagged={flagged}
                activeIndex={
                  activeIndex
                }
                onSelect={
                  setActiveIndex
                }
              />

              <div className="mv-index-legend">
                <span>
                  <i className="answered" />
                  Answered
                </span>

                <span>
                  <i className="flagged" />
                  Review
                </span>
              </div>

              <div className="mv-save-note">
                <CheckCircle2
                  size={16}
                />

                <span>
                  Answers save
                  automatically on
                  this device.
                </span>
              </div>

              <button
                type="button"
                className="mv-clear-button"
                onClick={
                  clearAnswers
                }
              >
                <RotateCcw
                  size={15}
                />
                Clear Answers
              </button>
            </aside>

            {/* QUESTION */}

            {currentQuestion && (
              <article className="mv-exam-question">
                <header className="mv-question-head">
                  <div className="mv-question-heading">
                    <div className="mv-question-number">
                      Q
                      {
                        currentQuestion.number
                      }
                    </div>

                    <div>
                      <span>
                        {
                          currentQuestion.marks
                        }{' '}
                        marks
                        {' · '}
                        {getSourceLabel(
                          currentQuestion
                        )}
                      </span>

                      <h2>
                        {
                          currentQuestion.questionText
                        }
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="mv-flag"
                    aria-pressed={
                      flagged.includes(
                        currentQuestion._id
                      )
                    }
                    onClick={() =>
                      toggleFlag(
                        currentQuestion._id
                      )
                    }
                  >
                    <Flag
                      size={15}
                    />

                    {flagged.includes(
                      currentQuestion._id
                    )
                      ? 'Flagged'
                      : 'Review later'}
                  </button>
                </header>

                <label className="mv-answer">
                  <span>
                    Your answer
                  </span>

                  <textarea
                    rows={Math.min(
                      14,
                      Math.max(
                        7,
                        Number(
                          currentQuestion.marks ||
                            2
                        ) + 4
                      )
                    )}
                    value={
                      answers[
                        currentQuestion._id
                      ] || ''
                    }
                    onChange={(
                      event
                    ) =>
                      updateAnswer(
                        currentQuestion._id,
                        event.target
                          .value
                      )
                    }
                    placeholder="Write your answer exactly as you would in the exam. Include definitions, formulas, steps, reasoning and diagrams in words where required."
                  />
                </label>

                <div className="mv-answer-footer">
                  <div>
                    <Sparkles
                      size={15}
                    />

                    <span>
                      Focus on
                      correctness and
                      clear steps. You
                      will get detailed
                      feedback after
                      submission.
                    </span>
                  </div>

                  <span>
                    {String(
                      answers[
                        currentQuestion
                          ._id
                      ] || ''
                    )
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .length}{' '}
                    words
                  </span>
                </div>

                <nav className="mv-question-navigation">
                  <button
                    type="button"
                    disabled={
                      activeIndex ===
                      0
                    }
                    onClick={() =>
                      setActiveIndex(
                        (value) =>
                          value - 1
                      )
                    }
                  >
                    <ChevronLeft
                      size={17}
                    />
                    Previous
                  </button>

                  <span>
                    Question{' '}
                    {activeIndex + 1}{' '}
                    of {questionCount}
                  </span>

                  <button
                    type="button"
                    disabled={
                      activeIndex >=
                      questionCount -
                        1
                    }
                    onClick={() =>
                      setActiveIndex(
                        (value) =>
                          value + 1
                      )
                    }
                  >
                    Next
                    <ChevronRight
                      size={17}
                    />
                  </button>
                </nav>
              </article>
            )}
          </section>
        )}

        {/* =================================================
            RESULT SUMMARY
        ================================================= */}

        {result && (
          <>
            <section className="mv-results-head">
              <div>
                <span className="mv-eyebrow">
                  <BarChart3
                    size={15}
                  />
                  Mock Result
                </span>

                <h2>
                  Here's what your
                  answers show.
                </h2>

                <p>
                  Use the feedback
                  below to decide what
                  to revise before your
                  next attempt.
                </p>
              </div>

              <div className="mv-result-actions">
                <Link
                  to={`/exam-war-room?subjectCode=${encodeURIComponent(
                    mock.subject
                      ?.subjectCode ||
                      ''
                  )}`}
                >
                  <Target
                    size={15}
                  />
                  War Room
                </Link>

                <Link
                  to={`/revision-sheets?subjectCode=${encodeURIComponent(
                    mock.subject
                      ?.subjectCode ||
                      ''
                  )}`}
                >
                  <BookOpen
                    size={15}
                  />
                  Revise Mistakes
                </Link>

                <Link
                  to={`/mock-exams?subjectCode=${encodeURIComponent(
                    mock.subject
                      ?.subjectCode ||
                      ''
                  )}`}
                >
                  Try Another
                  <ArrowRight
                    size={14}
                  />
                </Link>
              </div>
            </section>

            <section className="mv-overall">
              <ResultStat
                icon={
                  ClipboardCheck
                }
                label="Practice score"
                value={`${result.totalScore}/${result.totalMarks}`}
              />

              <ResultStat
                icon={Target}
                label="Estimated accuracy"
                value={`${result.percentage}%`}
                tone="blue"
              />

              <ResultStat
                icon={
                  CheckCircle2
                }
                label="Answered"
                value={`${result.answeredCount}/${result.questionCount}`}
                tone="green"
              />

              <article className="mv-overall-feedback">
                <span>
                  Overall feedback
                </span>

                <React.Suspense fallback={<p>{result.overallFeedback}</p>}>
                  <MathAnswer>{result.overallFeedback}</MathAnswer>
                </React.Suspense>
              </article>
            </section>

            {/* =============================================
                RESULT QUESTIONS
            ============================================= */}

            <section className="mv-result-question-list">
              {mock.questions.map(
                (
                  question,
                  index
                ) => {
                  const evaluation =
                    evaluationById.get(
                      String(
                        question._id
                      )
                    );

                  return (
                    <article
                      key={
                        question._id
                      }
                      className="mv-result-question"
                    >
                      <header className="mv-result-question-head">
                        <div className="mv-result-question-id">
                          <span>
                            Q
                            {
                              question.number
                            }
                          </span>

                          <div>
                            <small>
                              {
                                question.marks
                              }{' '}
                              marks
                              {' · '}
                              {getSourceLabel(
                                question
                              )}
                            </small>

                            <h3>
                              {
                                question.questionText
                              }
                            </h3>
                          </div>
                        </div>

                        {evaluation && (
                          <div className="mv-mini-score">
                            <strong>
                              {
                                evaluation.score
                              }
                              /
                              {
                                evaluation.maxMarks
                              }
                            </strong>

                            <span>
                              {
                                evaluation.estimatedAccuracy
                              }
                              %
                            </span>
                          </div>
                        )}
                      </header>

                      <div className="mv-result-answer">
                        <span>
                          Your answer
                        </span>

                        <p>
                          {String(
                            answers[
                              question._id
                            ] || ''
                          ).trim() ||
                            'No answer was written.'}
                        </p>
                      </div>

                      {evaluation && (
                        <section className="mv-feedback">
                          <div className="mv-feedback-grid">
                            <div>
                              <span>
                                Accuracy
                              </span>

                              <strong>
                                {
                                  evaluation.estimatedAccuracy
                                }
                                %
                              </strong>
                            </div>

                            <div>
                              <span>
                                Confidence
                              </span>

                              <strong>
                                {
                                  evaluation.confidence
                                }
                              </strong>
                            </div>

                            <div>
                              <span>
                                Evaluation
                                basis
                              </span>

                              <strong>
                                {
                                  evaluation.referenceBasis
                                }
                              </strong>
                            </div>
                          </div>

                          <div className="mv-main-feedback">
                            <div className="mv-feedback-heading">
                              <Lightbulb
                                size={17}
                              />

                              <strong>
                                Feedback
                              </strong>
                            </div>

                            <React.Suspense fallback={<p>{evaluation.feedback}</p>}>
                              <MathAnswer>{evaluation.feedback}</MathAnswer>
                            </React.Suspense>
                          </div>

                          <div className="mv-feedback-columns">
                            {evaluation
                              .strengths
                              ?.length >
                              0 && (
                              <div className="mv-feedback-good">
                                <div className="mv-feedback-heading">
                                  <CheckCircle2
                                    size={16}
                                  />

                                  <strong>
                                    What
                                    worked
                                  </strong>
                                </div>

                                <ul>
                                  {evaluation.strengths.map(
                                    (
                                      item
                                    ) => (
                                      <li key={item}>
                                        <React.Suspense fallback={item}>
                                          <MathAnswer>{item}</MathAnswer>
                                        </React.Suspense>
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                            )}

                            {evaluation
                              .missingPoints
                              ?.length >
                              0 && (
                              <div className="mv-feedback-missing">
                                <div className="mv-feedback-heading">
                                  <CircleAlert
                                    size={16}
                                  />

                                  <strong>
                                    Missing
                                    or weak
                                  </strong>
                                </div>

                                <div className="mv-tags">
                                  {evaluation.missingPoints.map(
                                    (
                                      item
                                    ) => (
                                      <div className="mv-tag" key={item}>
                                        <React.Suspense fallback={item}>
                                          <MathAnswer>{item}</MathAnswer>
                                        </React.Suspense>
                                      </div>
                                    )
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {evaluation.nextStep && (
                            <div className="mv-next-step">
                              <Target
                                size={17}
                              />

                              <div>
                                <strong>
                                  What to
                                  do next
                                </strong>

                                <React.Suspense fallback={<p>{evaluation.nextStep}</p>}>
                                  <MathAnswer>{evaluation.nextStep}</MathAnswer>
                                </React.Suspense>
                              </div>
                            </div>
                          )}

                          {!!evaluation
                            .markingScheme
                            ?.length && (
                            <details className="mv-detail-block">
                              <summary>
                                Practice
                                marking
                                guide
                              </summary>

                              <ul>
                                {evaluation.markingScheme.map(
                                  (
                                    item,
                                    schemeIndex
                                  ) => (
                                    <li
                                      key={
                                        schemeIndex
                                      }
                                    >
                                      {
                                        item.criterion
                                      }
                                      {' — '}
                                      {
                                        item.marks
                                      }{' '}
                                      marks
                                    </li>
                                  )
                                )}
                              </ul>
                            </details>
                          )}

                          {evaluation.betterAnswer && (
                            <details
                              className="mv-detail-block mv-better-answer"
                              open
                            >
                              <summary>
                                Better
                                exam-style
                                answer
                              </summary>

                              <div className="mv-answer-key">
                                <React.Suspense
                                  fallback={
                                    <p>
                                      Loading
                                      answer…
                                    </p>
                                  }
                                >
                                  <MathAnswer>
                                    {
                                      evaluation.betterAnswer
                                    }
                                  </MathAnswer>
                                </React.Suspense>
                              </div>
                            </details>
                          )}

                          {question.source !==
                            'generated' && (
                            <div className="mv-question-actions">
                              <Link
                                to={`/questions/${question._id}`}
                              >
                                <FileQuestion
                                  size={14}
                                />
                                Open
                                Question
                              </Link>

                              <Link
                                to={`/questions/${question._id}`}
                              >
                                <Sparkles
                                  size={14}
                                />
                                Ask
                                PaperStack
                              </Link>
                            </div>
                          )}
                        </section>
                      )}
                    </article>
                  );
                }
              )}
            </section>
          </>
        )}

        {/* =================================================
            DISCLAIMER
        ================================================= */}

        <section className="mv-disclaimer">
          <CircleAlert
            size={18}
          />

          <div>
            <strong>
              Practice feedback, not
              official grading.
            </strong>

            <p>
              {result?.disclaimer ||
                'PaperStack evaluation is designed for self-practice. Final grading can differ based on faculty marking schemes, diagrams, derivations, partial credit, and expected wording.'}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
