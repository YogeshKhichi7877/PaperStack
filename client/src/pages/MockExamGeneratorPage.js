import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Helmet,
} from 'react-helmet-async';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileQuestion,
  FileText,
  GraduationCap,
  History,
  Printer,
  RefreshCw,
  RotateCcw,
  Settings2,
  Sparkles,
  Target,
  WandSparkles,
} from 'lucide-react';

import {
  generateMockExam,
  getMockExamSubjects,
  regenerateMockQuestion,
} from '../services/mockExamApi';

import {
  mockWeaknesses,
  readMockEvidence,
} from '../utils/studyEvidence';

import './MockExamGeneratorPage.css';

const MathAnswer = React.lazy(() => import('../components/MathAnswer'));

/* =========================================================
   HELPERS
========================================================= */

function createSeed() {
  return [
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join('-');
}

function sourceUrl(question) {
  const base =
    question?.paper?.filePath ||
    '';

  if (!base) {
    return '';
  }

  const page = Number(
    question?.sourceLocation
      ?.pageStart || 0
  );

  return page > 0
    ? `${base}#page=${page}`
    : base;
}

function mockStorageKey(mockId) {
  return `paperstack_mock_${mockId}`;
}

function readAttempt(mockId) {
  if (!mockId) {
    return {
      startedAt: null,
      completed: [],
    };
  }

  try {
    const raw =
      localStorage.getItem(
        mockStorageKey(mockId)
      );

    const parsed = raw
      ? JSON.parse(raw)
      : null;

    return {
      startedAt:
        parsed?.startedAt ||
        null,

      completed:
        Array.isArray(
          parsed?.completed
        )
          ? parsed.completed
          : [],
    };
  } catch {
    return {
      startedAt: null,
      completed: [],
    };
  }
}

function sourceLabel(question) {
  return question.source ===
    'generated'
    ? 'Fresh practice'
    : 'Previous paper';
}

/* =========================================================
   OPTION BUTTON
========================================================= */

function OptionButton({
  active,
  children,
  onClick,
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/* =========================================================
   MAIN
========================================================= */

export default function MockExamGeneratorPage({
  toast,
}) {
  const navigate =
    useNavigate();

  const [searchParams] =
    useSearchParams();

  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    subjectCode,
    setSubjectCode,
  ] = useState(
    searchParams.get(
      'subjectCode'
    ) || ''
  );

  const [
    examType,
    setExamType,
  ] = useState(
    searchParams.get(
      'examType'
    ) || ''
  );

  const [
    totalMarks,
    setTotalMarks,
  ] = useState(25);

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState(() => {
    const requested = Number(
      searchParams.get(
        'durationMinutes'
      )
    );

    return Number.isInteger(
      requested
    ) &&
      requested >= 10 &&
      requested <= 180
      ? requested
      : 60;
  });

  const [
    strategy,
    setStrategy,
  ] = useState('balanced');

  const [
    mockType,
    setMockType,
  ] = useState('mixed');

  const [
    difficulty,
    setDifficulty,
  ] = useState(
    'balanced'
  );

  const [
    adaptive,
    setAdaptive,
  ] = useState(false);

  const [
    aiAvailable,
    setAiAvailable,
  ] = useState(false);

  const generationMode =
    aiAvailable
      ? 'ai'
      : 'local';

  const [
    loadingSubjects,
    setLoadingSubjects,
  ] = useState(true);

  const [
    generating,
    setGenerating,
  ] = useState(false);

  const [
    replacingQuestionId,
    setReplacingQuestionId,
  ] = useState('');

  const [
    subjectsError,
    setSubjectsError,
  ] = useState('');

  const [
    mock,
    setMock,
  ] = useState(null);

  const [
    attempt,
    setAttempt,
  ] = useState({
    startedAt: null,
    completed: [],
  });

  const [
    showSources,
    setShowSources,
  ] = useState(false);

  /* =========================================================
     SUBJECT DATA
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    getMockExamSubjects()
      .then((data) => {
        if (!mounted) {
          return;
        }

        const list = [
          ...new Map(
            (
              Array.isArray(
                data?.subjects
              )
                ? data.subjects
                : []
            )
              .filter(
                (subject) =>
                  subject?.subjectCode
              )
              .map(
                (subject) => [
                  subject.subjectCode,
                  subject,
                ]
              )
          ).values(),
        ];

        setSubjects(list);

        setSubjectsError('');

        setAiAvailable(
          Boolean(
            data?.aiAvailable
          )
        );

        if (list.length) {
          setSubjectCode(
            (current) =>
              current ||
              list[0]
                .subjectCode
          );
        }
      })
      .catch((error) => {
        if (mounted) {
          setSubjectsError(
            error.response?.data
              ?.error ||
              'Could not load mock-exam subjects.'
          );
        }

        toast?.(
          'Failed to load mock-exam subjects.',
          'error'
        );
      })
      .finally(() => {
        if (mounted) {
          setLoadingSubjects(
            false
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [toast]);

  /* =========================================================
     DERIVED DATA
  ========================================================= */

  const selectedSubject =
    useMemo(
      () =>
        subjects.find(
          (subject) =>
            subject.subjectCode ===
            subjectCode
        ) || null,
      [
        subjects,
        subjectCode,
      ]
    );

  const examTypes =
    selectedSubject?.examTypes ||
    [];

  const mockHistory =
    useMemo(
      () =>
        readMockEvidence(
          subjectCode
        ),
      [subjectCode]
    );

  const recentWeaknesses =
    useMemo(
      () =>
        mockWeaknesses(
          mockHistory
        )
          .filter(
            (item) =>
              item.accuracy < 70
          )
          .slice(0, 4),
      [mockHistory]
    );

  const completeCount =
    mock
      ? mock.questions.filter(
          (question) =>
            attempt.completed.includes(
              question._id
            )
        ).length
      : 0;

  const progress =
    mock?.questions?.length
      ? Math.round(
          (
            completeCount /
            mock.questions.length
          ) * 100
        )
      : 0;

  /* =========================================================
     GENERATION
  ========================================================= */

  async function createMock(
    customSeed
  ) {
    if (
      !subjectCode ||
      generating
    ) {
      return;
    }

    setGenerating(true);

    try {
      const result =
        await generateMockExam({
          subjectCode,
          examType,
          totalMarks,
          durationMinutes,
          strategy,
          mockType,
          difficulty,

          adaptiveTopics:
            adaptive
              ? mockWeaknesses(
                  readMockEvidence(
                    subjectCode
                  )
                )
                  .filter(
                    (item) =>
                      item.accuracy <
                      70
                  )
                  .slice(0, 8)
                  .map(
                    (item) =>
                      item.topic
                  )
              : [],

          mode:
            generationMode,

          seed:
            customSeed ||
            createSeed(),
        });

      setMock(result);

      try {
        localStorage.setItem(
          'paperstack_last_mock',
          JSON.stringify(
            result
          )
        );

        localStorage.setItem(
          `paperstack_mock_definition_${result.mockId}`,
          JSON.stringify(
            result
          )
        );
      } catch {}

      setAttempt(
        readAttempt(
          result.mockId
        )
      );

      setShowSources(false);

      toast?.(
        'Mock exam generated.',
        'success'
      );
    } catch (error) {
      console.error(
        'Mock generation failed:',
        error
      );

      toast?.(
        error.response?.data
          ?.error ||
          'Failed to generate mock exam.',
        'error'
      );
    } finally {
      setGenerating(false);
    }
  }

  /* =========================================================
     ATTEMPT
  ========================================================= */

  function persistAttempt(
    next
  ) {
    setAttempt(next);

    if (!mock?.mockId) {
      return;
    }

    try {
      localStorage.setItem(
        mockStorageKey(
          mock.mockId
        ),
        JSON.stringify(next)
      );
    } catch {}
  }

  function startMock() {
    if (!mock) return;

    if (!attempt.startedAt) {
      persistAttempt({
        ...attempt,
        startedAt:
          new Date().toISOString(),
      });
    }

    navigate(
      `/mock-evaluation?mockId=${encodeURIComponent(
        mock.mockId
      )}`
    );
  }

  function toggleQuestion(
    questionId
  ) {
    const completed =
      new Set(
        attempt.completed
      );

    if (
      completed.has(
        questionId
      )
    ) {
      completed.delete(
        questionId
      );
    } else {
      completed.add(
        questionId
      );
    }

    persistAttempt({
      ...attempt,
      completed: [
        ...completed,
      ],
    });
  }

  function resetAttempt() {
    persistAttempt({
      startedAt: null,
      completed: [],
    });
  }

  /* =========================================================
     QUESTION REPLACEMENT
  ========================================================= */

  async function replaceQuestion(
    question,
    direction
  ) {
    if (
      !mock ||
      replacingQuestionId
    ) {
      return;
    }

    setReplacingQuestionId(
      question._id
    );

    try {
      const data =
        await regenerateMockQuestion({
          mockId:
            mock.mockId,

          questionId:
            question._id,

          number:
            question.number,

          direction,
        });

      if (
        data.unchanged ||
        !data.question
      ) {
        toast?.(
          data.message ||
            'The current question is unchanged.',
          'info'
        );

        return;
      }

      const replacement = {
        ...data.question,
        number:
          question.number,
      };

      const updated = {
        ...mock,

        questions:
          mock.questions.map(
            (item) =>
              item._id ===
              question._id
                ? replacement
                : item
          ),

        sections:
          mock.sections.map(
            (section) => ({
              ...section,

              questions:
                section.questions.map(
                  (item) =>
                    item._id ===
                    question._id
                      ? replacement
                      : item
                ),
            })
          ),
      };

      setMock(updated);

      try {
        localStorage.setItem(
          `paperstack_mock_definition_${mock.mockId}`,
          JSON.stringify(
            updated
          )
        );

        localStorage.setItem(
          'paperstack_last_mock',
          JSON.stringify(
            updated
          )
        );
      } catch {}

      toast?.(
        'Question replaced.',
        'success'
      );
    } catch (error) {
      toast?.(
        error.response?.data
          ?.error ||
          'Could not replace this question.',
        'error'
      );
    } finally {
      setReplacingQuestionId(
        ''
      );
    }
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main className="me-page">
      <Helmet>
        <title>
          Mock Exam Center -
          PaperStack
        </title>

        <meta
          name="description"
          content="Create PaperStack practice exams using previous-year questions and fresh practice questions."
        />
      </Helmet>

      <div className="me-shell">
        {/* =================================================
            HERO
        ================================================= */}

        <section className="me-hero">
          <div className="me-hero-copy">
            <span className="me-eyebrow">
              <FileQuestion
                size={15}
              />
              Mock Exam Center
            </span>

            <h1>
              Build a paper.
              <br />

              <span>
                Then sit the exam.
              </span>
            </h1>

            <p>
              Create subject-wise practice
              papers using previous-year
              questions and fresh questions
              matched to your selected exam
              style.
            </p>

            <div className="me-hero-points">
              <span>
                <Check size={14} />
                Past-paper grounded
              </span>

              <span>
                <Check size={14} />
                Adjustable difficulty
              </span>

              <span>
                <Check size={14} />
                Timed exam mode
              </span>

              <span>
                <Check size={14} />
                Detailed evaluation
              </span>
            </div>
          </div>

          <div className="me-hero-side">
            <div className="me-hero-side-icon">
              <GraduationCap
                size={30}
              />
            </div>

            <span>
              Your current setup
            </span>

            <strong>
              {selectedSubject
                ?.subjectCode ||
                'Choose subject'}
            </strong>

            <p>
              {totalMarks} marks
              {' · '}
              {durationMinutes} min
              {' · '}
              {difficulty}
            </p>

            <small>
              Change anything below before
              generating the paper.
            </small>
          </div>
        </section>

        {/* =================================================
            QUICK CONFIGURATION
        ================================================= */}

        <section className="me-options me-no-print">
          <fieldset>
            <legend>
              Question source
            </legend>

            <div className="me-option-buttons">
              <OptionButton
                active={
                  mockType ===
                  'mixed'
                }
                onClick={() =>
                  setMockType(
                    'mixed'
                  )
                }
              >
                PYQ + New
              </OptionButton>

              <OptionButton
                active={
                  mockType ===
                  'pyq'
                }
                onClick={() =>
                  setMockType('pyq')
                }
              >
                PYQ Only
              </OptionButton>

              <OptionButton
                active={
                  mockType ===
                  'new'
                }
                onClick={() =>
                  setMockType('new')
                }
              >
                Fresh Only
              </OptionButton>
            </div>
          </fieldset>

          <fieldset>
            <legend>
              Quick duration
            </legend>

            <div className="me-option-buttons">
              {[10, 20, 30, 60].map(
                (value) => (
                  <OptionButton
                    key={value}
                    active={
                      durationMinutes ===
                      value
                    }
                    onClick={() => {
                      setDurationMinutes(
                        value
                      );

                      setTotalMarks(
                        value === 10
                          ? 10
                          : value ===
                            20
                          ? 20
                          : value ===
                            30
                          ? 25
                          : 50
                      );
                    }}
                  >
                    {value} min
                  </OptionButton>
                )
              )}
            </div>
          </fieldset>

          <fieldset>
            <legend>
              Difficulty
            </legend>

            <div className="me-option-buttons">
              {[
                [
                  'balanced',
                  'Balanced',
                ],
                [
                  'easy',
                  'Easy',
                ],
                [
                  'hard',
                  'Challenging',
                ],
              ].map(
                ([
                  value,
                  label,
                ]) => (
                  <OptionButton
                    key={value}
                    active={
                      difficulty ===
                      value
                    }
                    onClick={() =>
                      setDifficulty(
                        value
                      )
                    }
                  >
                    {label}
                  </OptionButton>
                )
              )}
            </div>
          </fieldset>

          <label className="me-adaptive">
            <input
              type="checkbox"
              checked={adaptive}
              onChange={(event) =>
                setAdaptive(
                  event.target.checked
                )
              }
            />

            <span>
              <Brain size={17} />

              <span>
                <strong>
                  Focus on my weak topics
                </strong>

                <small>
                  Uses your previous mock
                  results when available.
                </small>
              </span>
            </span>
          </label>
        </section>

        {/* =================================================
            BUILDER
        ================================================= */}

        <section className="me-builder me-no-print">
          <div className="me-builder-head">
            <div>
              <span className="me-builder-icon">
                <Settings2
                  size={20}
                />
              </span>

              <div>
                <h2>
                  Build your mock
                </h2>

                <p>
                  Set the paper exactly the
                  way you want it.
                </p>
              </div>
            </div>
          </div>

          <div className="me-builder-grid">
            <label className="me-field-subject">
              <span>Subject</span>

              <select
                value={subjectCode}
                disabled={
                  loadingSubjects
                }
                onChange={(
                  event
                ) => {
                  setSubjectCode(
                    event.target.value
                  );

                  setExamType('');
                }}
              >
                {!subjects.length && (
                  <option value="">
                    No extracted subjects
                  </option>
                )}

                {subjects.map(
                  (subject) => (
                    <option
                      key={
                        subject.subjectCode
                      }
                      value={
                        subject.subjectCode
                      }
                    >
                      {
                        subject.subjectCode
                      }
                      {' · '}
                      {
                        subject.subject
                      }
                      {' ('}
                      {
                        subject.totalQuestions
                      }
                      {')'}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>Exam scope</span>

              <select
                value={examType}
                onChange={(
                  event
                ) =>
                  setExamType(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All exams
                </option>

                {examTypes.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      {item}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>Marks</span>

              <select
                value={totalMarks}
                onChange={(
                  event
                ) =>
                  setTotalMarks(
                    Number(
                      event.target.value
                    )
                  )
                }
              >
                {[
                  10,
                  20,
                  25,
                  30,
                  50,
                  75,
                  100,
                ].map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value} marks
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>Duration</span>

              <select
                value={
                  durationMinutes
                }
                onChange={(
                  event
                ) =>
                  setDurationMinutes(
                    Number(
                      event.target.value
                    )
                  )
                }
              >
                {[
                  10,
                  20,
                  30,
                  60,
                  90,
                  120,
                  180,
                ].map(
                  (value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value} min
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Paper strategy
              </span>

              <select
                value={strategy}
                onChange={(
                  event
                ) =>
                  setStrategy(
                    event.target.value
                  )
                }
              >
                <option value="balanced">
                  Balanced
                </option>

                <option value="repeat-focused">
                  Repeat focused
                </option>

                <option value="broad-coverage">
                  Broad coverage
                </option>
              </select>
            </label>

            <button
              type="button"
              className="me-generate"
              disabled={
                generating ||
                !subjectCode
              }
              onClick={() =>
                createMock()
              }
            >
              {generating ? (
                <>
                  <span className="me-spinner" />
                  Building Paper…
                </>
              ) : (
                <>
                  <WandSparkles
                    size={17}
                  />
                  Generate Mock
                </>
              )}
            </button>
          </div>
        </section>

        {/* =================================================
            HISTORY
        ================================================= */}

        {!!mockHistory.length && (
          <section className="me-history me-no-print">
            <div className="me-history-title">
              <History size={17} />

              <div>
                <strong>
                  Recent practice
                </strong>

                <span>
                  Your last attempts for
                  this subject.
                </span>
              </div>
            </div>

            <div className="me-history-scores">
              {mockHistory
                .slice(0, 5)
                .map(
                  (item, index) => (
                    <span key={index}>
                      {Number.isFinite(
                        item.percentage
                      )
                        ? `${item.percentage}%`
                        : '—'}
                    </span>
                  )
                )}
            </div>

            {!!recentWeaknesses.length && (
              <div className="me-history-weakness">
                <Target size={15} />

                <span>
                  <strong>
                    Worth revising:
                  </strong>

                  {recentWeaknesses
                    .map(
                      (item) =>
                        item.topic
                    )
                    .join(', ')}
                </span>
              </div>
            )}
          </section>
        )}

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {!mock && (
          <section className="me-state">
            <span className="me-state-icon">
              <FileText
                size={31}
              />
            </span>

            <h2>
              Your mock paper will appear
              here.
            </h2>

            <p>
              {subjectsError ||
                'Choose a subject, exam scope, marks and duration above. PaperStack will build a practice paper using the available question archive and your selected settings.'}
            </p>

            <div className="me-state-flow">
              <span>
                <b>1</b>
                Configure
              </span>

              <ChevronRight
                size={15}
              />

              <span>
                <b>2</b>
                Generate
              </span>

              <ChevronRight
                size={15}
              />

              <span>
                <b>3</b>
                Attempt
              </span>

              <ChevronRight
                size={15}
              />

              <span>
                <b>4</b>
                Evaluate
              </span>
            </div>
          </section>
        )}

        {/* =================================================
            GENERATED MOCK
        ================================================= */}

        {mock && (
          <>
            {/* COMMAND BAR */}

            <section className="me-command me-no-print">
              <div className="me-command-status">
                <span className="me-ready-icon">
                  <CheckCircle2
                    size={20}
                  />
                </span>

                <div>
                  <span>
                    Mock ready
                  </span>

                  <strong>
                    {
                      mock.generatedMarks
                    }{' '}
                    marks
                    {' · '}
                    {
                      mock.durationMinutes
                    }{' '}
                    min
                  </strong>

                  <p>
                    {
                      mock.summary
                        ?.totalQuestions
                    }{' '}
                    questions
                    {' · '}
                    {
                      mock.summary
                        ?.yearsCovered
                    }{' '}
                    years
                    {' · '}
                    {
                      mock.summary
                        ?.topicsCovered
                    }{' '}
                    topics
                  </p>
                </div>
              </div>

              <div className="me-command-actions">
                <button
                  type="button"
                  className="primary"
                  onClick={startMock}
                >
                  <Clock3 size={15} />

                  {attempt.startedAt
                    ? 'Resume Mock'
                    : 'Start Mock'}

                  <ArrowRight
                    size={14}
                  />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    createMock()
                  }
                >
                  <RefreshCw
                    size={14}
                  />
                  Regenerate
                </button>

                <button
                  type="button"
                  onClick={() =>
                    window.print()
                  }
                >
                  <Printer
                    size={14}
                  />
                  Print
                </button>

                <button
                  type="button"
                  className="evaluate"
                  onClick={() =>
                    navigate(
                      `/mock-evaluation?mockId=${encodeURIComponent(
                        mock.mockId
                      )}`
                    )
                  }
                >
                  <BarChart3
                    size={14}
                  />
                  Evaluate
                </button>
              </div>
            </section>

            {/* BLUEPRINT */}

            {!!mock.blueprint?.length && (
              <details className="me-blueprint me-no-print">
                <summary>
                  <div>
                    <BookOpen
                      size={16}
                    />

                    <span>
                      Exam blueprint
                    </span>
                  </div>

                  <small>
                    {
                      mock.blueprint
                        .length
                    }{' '}
                    questions
                  </small>
                </summary>

                <div className="me-blueprint-list">
                  {mock.blueprint.map(
                    (item) => (
                      <div
                        key={
                          item.number
                        }
                      >
                        <strong>
                          Q{item.number}
                        </strong>

                        <span>
                          {item.marks}{' '}
                          marks
                          {' · '}
                          {item.questionType ||
                            'question'}
                          {' · '}
                          {item.difficulty ||
                            'standard'}
                        </span>

                        <small>
                          {item.source ===
                          'generated'
                            ? 'Fresh practice'
                            : 'Previous paper'}
                        </small>
                      </div>
                    )
                  )}
                </div>
              </details>
            )}

            {/* MARK WARNING */}

            {!mock.exactMarks && (
              <section className="me-warning">
                <CircleAlert
                  size={18}
                />

                <div>
                  <strong>
                    Closest valid paper
                    generated
                  </strong>

                  <p>
                    You requested{' '}
                    {
                      mock.targetMarks
                    }{' '}
                    marks, but the
                    available question
                    combination produced{' '}
                    {
                      mock.generatedMarks
                    }{' '}
                    marks without
                    duplicating questions.
                  </p>
                </div>
              </section>
            )}

            {/* GENERATION INFORMATION */}

            <section className="me-generation-note me-no-print">
              <div>
                <span className="me-generation-icon">
                  <Sparkles
                    size={19}
                  />
                </span>

                <div>
                  <strong>
                    How this paper was
                    assembled
                  </strong>

                  <p>
                    {mock.generationMode ===
                    'ai'
                      ? `${mock.summary?.generatedCount || 0} fresh practice questions and ${mock.summary?.pyqCount || 0} previous-paper questions were combined using your selected settings.`
                      : 'PaperStack used the question archive and its balancing rules to assemble this paper.'}
                  </p>
                </div>
              </div>

              {!!mock.warnings?.length && (
                <div className="me-generation-warnings">
                  {mock.warnings.map(
                    (warning) => (
                      <p key={warning}>
                        {warning}
                      </p>
                    )
                  )}
                </div>
              )}
            </section>

            {/* =================================================
                PAPER
            ================================================= */}

            <section className="me-paper">
              <header className="me-paper-head">
                <div>
                  <span>
                    PaperStack Practice
                    Examination
                  </span>

                  <h2>
                    {
                      mock.subject
                        ?.subjectCode
                    }
                    {' · '}
                    {
                      mock.subject
                        ?.subject
                    }
                  </h2>

                  <p>
                    {mock.examType ||
                      'Mixed exam practice'}
                  </p>
                </div>

                <div className="me-paper-summary">
                  <span>
                    <Clock3
                      size={15}
                    />
                    {
                      mock.durationMinutes
                    }{' '}
                    min
                  </span>

                  <span>
                    <FileQuestion
                      size={15}
                    />
                    {
                      mock.generatedMarks
                    }{' '}
                    marks
                  </span>

                  <strong>
                    MOCK
                  </strong>
                </div>
              </header>

              {/* INSTRUCTIONS */}

              <section className="me-instructions">
                <div className="me-instruction-title">
                  <GraduationCap
                    size={18}
                  />

                  <strong>
                    Instructions
                  </strong>
                </div>

                <ol>
                  {mock.instructions.map(
                    (
                      instruction
                    ) => (
                      <li
                        key={
                          instruction
                        }
                      >
                        {
                          instruction
                        }
                      </li>
                    )
                  )}
                </ol>
              </section>

              {/* PROGRESS */}

              <section className="me-progress me-no-print">
                <div>
                  <span>
                    Preview progress
                  </span>

                  <strong>
                    {completeCount}/
                    {
                      mock.questions
                        .length
                    }{' '}
                    marked
                  </strong>
                </div>

                <div className="me-progress-track">
                  <span
                    style={{
                      width: `${progress}%`,
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={
                    resetAttempt
                  }
                >
                  <RotateCcw
                    size={13}
                  />
                  Reset
                </button>
              </section>

              {/* SECTIONS */}

              {mock.sections.map(
                (section) => (
                  <section
                    key={
                      section.key
                    }
                    className="me-section"
                  >
                    <div className="me-section-head">
                      <div>
                        <span>
                          Section
                        </span>

                        <h3>
                          {
                            section.title
                          }
                        </h3>

                        <p>
                          {
                            section.description
                          }
                        </p>
                      </div>

                      <strong>
                        {
                          section.marks
                        }{' '}
                        marks
                      </strong>
                    </div>

                    <div className="me-question-list">
                      {section.questions.map(
                        (
                          question
                        ) => {
                          const done =
                            attempt.completed.includes(
                              question._id
                            );

                          return (
                            <article
                              key={
                                question._id
                              }
                              className={
                                done
                                  ? 'done'
                                  : ''
                              }
                            >
                              <div className="me-q-number">
                                {
                                  question.number
                                }
                              </div>

                              <div className="me-q-body">
                                <div className="me-q-meta">
                                  {question.questionLabel && (
                                    <span>
                                      {
                                        question.questionLabel
                                      }
                                    </span>
                                  )}

                                  {question.marks !=
                                    null && (
                                    <span>
                                      {
                                        question.marks
                                      }{' '}
                                      marks
                                    </span>
                                  )}

                                  <span
                                    className={
                                      question.source ===
                                      'generated'
                                        ? 'fresh'
                                        : 'pyq'
                                    }
                                  >
                                    {sourceLabel(
                                      question
                                    )}
                                  </span>

                                  {showSources &&
                                    question.year && (
                                      <span>
                                        {
                                          question.year
                                        }
                                      </span>
                                    )}

                                  {showSources &&
                                    question.examType && (
                                      <span>
                                        {
                                          question.examType
                                        }
                                      </span>
                                    )}

                                  {showSources &&
                                    question.primaryTopic && (
                                      <span>
                                        {
                                          question.primaryTopic
                                        }
                                      </span>
                                    )}
                                </div>

                                <React.Suspense fallback={<p>{question.questionText}</p>}>
                                  <MathAnswer>{question.questionText}</MathAnswer>
                                </React.Suspense>

                                {question.source ===
                                  'generated' &&
                                  aiAvailable && (
                                    <div className="me-question-tune me-no-print">
                                      <span>
                                        Adjust this
                                        question:
                                      </span>

                                      {[
                                        [
                                          'similar',
                                          'Similar',
                                        ],
                                        [
                                          'easier',
                                          'Easier',
                                        ],
                                        [
                                          'harder',
                                          'Harder',
                                        ],
                                        [
                                          'replace',
                                          'Different',
                                        ],
                                      ].map(
                                        ([
                                          direction,
                                          label,
                                        ]) => (
                                          <button
                                            key={
                                              direction
                                            }
                                            type="button"
                                            disabled={Boolean(
                                              replacingQuestionId
                                            )}
                                            onClick={() =>
                                              replaceQuestion(
                                                question,
                                                direction
                                              )
                                            }
                                          >
                                            {replacingQuestionId ===
                                            question._id
                                              ? 'Working…'
                                              : label}
                                          </button>
                                        )
                                      )}
                                    </div>
                                  )}
                              </div>

                              <div className="me-q-actions me-no-print">
                                <button
                                  type="button"
                                  className={
                                    done
                                      ? 'done'
                                      : ''
                                  }
                                  onClick={() =>
                                    toggleQuestion(
                                      question._id
                                    )
                                  }
                                >
                                  <Check
                                    size={13}
                                  />

                                  {done
                                    ? 'Done'
                                    : 'Mark done'}
                                </button>

                                {question.source !==
                                  'generated' && (
                                  <Link
                                    to={`/questions/${question._id}`}
                                  >
                                    Open
                                  </Link>
                                )}

                                {showSources &&
                                  sourceUrl(
                                    question
                                  ) && (
                                    <a
                                      href={sourceUrl(
                                        question
                                      )}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      PDF
                                    </a>
                                  )}
                              </div>
                            </article>
                          );
                        }
                      )}
                    </div>
                  </section>
                )
              )}

              <footer className="me-paper-foot">
                <p>
                  {
                    mock.generationNotes
                      ?.disclaimer
                  }
                </p>

                <label className="me-source-toggle me-no-print">
                  <input
                    type="checkbox"
                    checked={
                      showSources
                    }
                    onChange={(
                      event
                    ) =>
                      setShowSources(
                        event.target
                          .checked
                      )
                    }
                  />

                  <span>
                    Reveal source
                    information
                  </span>
                </label>
              </footer>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
