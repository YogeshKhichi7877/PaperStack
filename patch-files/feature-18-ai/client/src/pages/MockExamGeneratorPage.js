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
} from 'react-router-dom';

import {
  generateMockExam,
  getMockExamSubjects,
} from '../services/mockExamApi';

import './MockExamGeneratorPage.css';

function createSeed() {
  return [
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join('-');
}

function sourceUrl(
  question
) {
  const base =
    question
      ?.paper
      ?.filePath ||
    '';

  if (!base) {
    return '';
  }

  const page =
    Number(
      question
        ?.sourceLocation
        ?.pageStart ||
      0
    );

  return page > 0
    ? `${base}#page=${page}`
    : base;
}

function mockStorageKey(
  mockId
) {
  return (
    `paperstack_mock_${mockId}`
  );
}

function readAttempt(
  mockId
) {
  if (!mockId) {
    return {
      startedAt: null,
      completed: [],
    };
  }

  try {
    const raw =
      localStorage.getItem(
        mockStorageKey(
          mockId
        )
      );

    const parsed =
      raw
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

export default function MockExamGeneratorPage({
  toast,
}) {
  const navigate = useNavigate();
  const [
    subjects,
    setSubjects,
  ] = useState([]);

  const [
    subjectCode,
    setSubjectCode,
  ] = useState('');

  const [
    examType,
    setExamType,
  ] = useState('');

  const [
    totalMarks,
    setTotalMarks,
  ] = useState(25);

  const [
    durationMinutes,
    setDurationMinutes,
  ] = useState(60);

  const [
    strategy,
    setStrategy,
  ] = useState(
    'balanced'
  );

  const [
    generationMode,
    setGenerationMode,
  ] = useState(
    'local'
  );

  const [
    aiAvailable,
    setAiAvailable,
  ] = useState(false);

  const [
    aiModel,
    setAiModel,
  ] = useState('');

  const [
    loadingSubjects,
    setLoadingSubjects,
  ] = useState(true);

  const [
    generating,
    setGenerating,
  ] = useState(false);

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

  useEffect(() => {
    let mounted = true;

    getMockExamSubjects()
      .then(
        (data) => {
          if (!mounted) {
            return;
          }

          const list =
            Array.isArray(
              data
                ?.subjects
            )
              ? data.subjects
              : [];

          setSubjects(
            list
          );

          setAiAvailable(
            Boolean(
              data?.aiAvailable
            )
          );

          setAiModel(
            data?.aiModel ||
            ''
          );

          if (
            list.length
          ) {
            setSubjectCode(
              (current) =>
                current ||
                list[0]
                  .subjectCode
            );
          }
        }
      )
      .catch(
        (error) => {
          console.error(
            'Mock subjects failed:',
            error
          );

          if (toast) {
            toast(
              'Failed to load mock-exam subjects.',
              'error'
            );
          }
        }
      )
      .finally(
        () => {
          if (mounted) {
            setLoadingSubjects(
              false
            );
          }
        }
      );

    return () => {
      mounted = false;
    };
  }, [toast]);

  const selectedSubject =
    useMemo(
      () =>
        subjects.find(
          (subject) =>
            subject
              .subjectCode ===
            subjectCode
        ) ||
        null,
      [
        subjects,
        subjectCode,
      ]
    );

  const examTypes =
    selectedSubject
      ?.examTypes ||
    [];

  async function createMock(
    customSeed
  ) {
    if (
      !subjectCode ||
      generating
    ) {
      return;
    }

    setGenerating(
      true
    );

    try {
      const result =
        await generateMockExam({
          subjectCode,
          examType,
          totalMarks,
          durationMinutes,
          strategy,
          mode:
            generationMode,
          seed:
            customSeed ||
            createSeed(),
        });

      setMock(
        result
      );

      try {
        localStorage.setItem(
          'paperstack_last_mock',
          JSON.stringify(result)
        );

        localStorage.setItem(
          `paperstack_mock_definition_${result.mockId}`,
          JSON.stringify(result)
        );
      } catch {}

      setAttempt(
        readAttempt(
          result.mockId
        )
      );

      setShowSources(
        false
      );

      if (toast) {
        toast(
          'Mock exam generated.',
          'success'
        );
      }
    } catch (error) {
      console.error(
        'Mock generation failed:',
        error
      );

      if (toast) {
        toast(
          error.response?.data?.error ||
            'Failed to generate mock exam.',
          'error'
        );
      }
    } finally {
      setGenerating(
        false
      );
    }
  }

  function persistAttempt(
    next
  ) {
    setAttempt(next);

    if (
      !mock?.mockId
    ) {
      return;
    }

    try {
      localStorage.setItem(
        mockStorageKey(
          mock.mockId
        ),
        JSON.stringify(
          next
        )
      );
    } catch {}
  }

  function startMock() {
    if (
      attempt.startedAt
    ) {
      return;
    }

    persistAttempt({
      ...attempt,
      startedAt:
        new Date()
          .toISOString(),
    });
  }

  function toggleQuestion(
    questionId
  ) {
    const set =
      new Set(
        attempt.completed
      );

    if (
      set.has(
        questionId
      )
    ) {
      set.delete(
        questionId
      );
    } else {
      set.add(
        questionId
      );
    }

    persistAttempt({
      ...attempt,
      completed:
        [...set],
    });
  }

  function resetAttempt() {
    persistAttempt({
      startedAt: null,
      completed: [],
    });
  }

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
    mock?.questions
      ?.length
      ? Math.round(
          (
            completeCount /
            mock.questions
              .length
          ) * 100
        )
      : 0;

  return (
    <main className="me-page">
      <Helmet>
        <title>
          Mock Exam Generator - PaperStack
        </title>

        <meta
          name="description"
          content="Generate archive-grounded practice exams from extracted PaperStack PYQs."
        />
      </Helmet>

      <div className="me-shell">
        <section className="me-hero">
          <div>
            <span>
              Mock Exam Generator
            </span>

            <h1>
              Turn the PYQ archive into a real practice paper.
            </h1>

            <p>
              Build a mock from real
              extracted questions,
              balanced across topics,
              years, marks, and
              repeated-PYQ evidence.
            </p>
          </div>

          <div className="me-hero-badge">
            <strong>
              Archive-grounded
            </strong>

            <span>
              No fabricated questions
            </span>

            <p>
              Choose local generation or optional Gemini-assisted selection.
            </p>
          </div>
        </section>

        <section className="me-builder me-no-print">
          <label>
            Subject

            <select
              value={
                subjectCode
              }
              disabled={
                loadingSubjects
              }
              onChange={(
                event
              ) => {
                setSubjectCode(
                  event.target
                    .value
                );

                setExamType(
                  ''
                );
              }}
            >
              {
                !subjects.length && (
                  <option value="">
                    No extracted subjects
                  </option>
                )
              }

              {
                subjects.map(
                  (
                    subject
                  ) => (
                    <option
                      key={
                        subject
                          .subjectCode
                      }
                      value={
                        subject
                          .subjectCode
                      }
                    >
                      {
                        subject
                          .subjectCode
                      }
                      {' · '}
                      {
                        subject
                          .subject
                      }
                      {' '}
                      ({
                        subject
                          .totalQuestions
                      })
                    </option>
                  )
                )
              }
            </select>
          </label>

          <label>
            Exam scope

            <select
              value={
                examType
              }
              onChange={(
                event
              ) =>
                setExamType(
                  event.target
                    .value
                )
              }
            >
              <option value="">
                All exams
              </option>

              {
                examTypes.map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item
                      }
                      value={
                        item
                      }
                    >
                      {
                        item
                      }
                    </option>
                  )
                )
              }
            </select>
          </label>

          <label>
            Marks

            <select
              value={
                totalMarks
              }
              onChange={(
                event
              ) =>
                setTotalMarks(
                  Number(
                    event.target
                      .value
                  )
                )
              }
            >
              <option value={20}>
                20 marks
              </option>

              <option value={25}>
                25 marks
              </option>

              <option value={30}>
                30 marks
              </option>

              <option value={50}>
                50 marks
              </option>

              <option value={75}>
                75 marks
              </option>

              <option value={100}>
                100 marks
              </option>
            </select>
          </label>

          <label>
            Duration

            <select
              value={
                durationMinutes
              }
              onChange={(
                event
              ) =>
                setDurationMinutes(
                  Number(
                    event.target
                      .value
                  )
                )
              }
            >
              <option value={30}>
                30 min
              </option>

              <option value={60}>
                60 min
              </option>

              <option value={90}>
                90 min
              </option>

              <option value={120}>
                120 min
              </option>

              <option value={180}>
                180 min
              </option>
            </select>
          </label>

          <label>
            Generator

            <select
              value={
                generationMode
              }
              onChange={(
                event
              ) =>
                setGenerationMode(
                  event.target
                    .value
                )
              }
            >
              <option value="local">
                Local
              </option>

              <option
                value="ai"
                disabled={
                  !aiAvailable
                }
              >
                AI-assisted
              </option>
            </select>
          </label>

          <label>
            Strategy

            <select
              value={
                strategy
              }
              onChange={(
                event
              ) =>
                setStrategy(
                  event.target
                    .value
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
            disabled={
              generating ||
              !subjectCode
            }
            onClick={() =>
              createMock()
            }
          >
            {
              generating
                ? 'Generating…'
                : 'Generate Mock'
            }
          </button>
        </section>

        {
          !mock && (
            <div className="me-state">
              Choose your subject,
              marks, duration, and
              strategy, then generate
              the practice paper.
            </div>
          )
        }

        {
          mock && (
            <>
              <section className="me-command me-no-print">
                <div>
                  <span>
                    Mock ready
                  </span>

                  <strong>
                    {
                      mock
                        .generatedMarks
                    }
                    {' '}
                    marks · {
                      mock
                        .durationMinutes
                    }
                    {' '}
                    min
                  </strong>

                  <p>
                    {
                      mock.summary
                        ?.totalQuestions
                    } questions · {
                      mock.summary
                        ?.yearsCovered
                    } years · {
                      mock.summary
                        ?.topicsCovered
                    } topics
                  </p>
                </div>

                <div className="me-command-actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={
                      startMock
                    }
                  >
                    {
                      attempt.startedAt
                        ? 'Mock started'
                        : 'Start Mock'
                    }
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      createMock()
                    }
                  >
                    Regenerate
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      window.print()
                    }
                  >
                    Print / Save PDF
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
                    Evaluate Mock
                  </button>
                </div>
              </section>

              {
                !mock.exactMarks && (
                  <div className="me-warning">
                    Requested {
                      mock.targetMarks
                    } marks, but the
                    available archive
                    produced {
                      mock.generatedMarks
                    } marks with the
                    closest valid
                    non-duplicate
                    selection.
                  </div>
                )
              }

              <section className="me-ai-summary me-no-print">
                <div>
                  <span>
                    Generation engine
                  </span>

                  <strong>
                    {
                      mock.generationMode ===
                      'ai'
                        ? 'AI-assisted selection'
                        : 'Local selection'
                    }
                  </strong>

                  <p>
                    {
                      mock.generationMode ===
                      'ai'
                        ? `Gemini selected only from real PaperStack question IDs${mock.aiModel ? ` using ${mock.aiModel}` : ''}.`
                        : 'PaperStack used its deterministic archive-balancing engine.'
                    }
                  </p>

                  {
                    mock.aiRationale && (
                      <small>
                        AI rationale: {
                          mock.aiRationale
                        }
                      </small>
                    )
                  }
                </div>

                {
                  mock.warnings
                    ?.length >
                    0 && (
                    <div className="me-ai-warning">
                      {
                        mock.warnings.map(
                          (
                            warning
                          ) => (
                            <p
                              key={
                                warning
                              }
                            >
                              {
                                warning
                              }
                            </p>
                          )
                        )
                      }
                    </div>
                  )
                }
              </section>

              <section className="me-paper">
                <header className="me-paper-head">
                  <div>
                    <span>
                      PaperStack Practice Mock
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
                      {
                        mock.examType ||
                        'All exam types'
                      }
                      {' · '}
                      {
                        mock
                          .generatedMarks
                      } marks
                      {' · '}
                      {
                        mock
                          .durationMinutes
                      } minutes
                    </p>
                  </div>

                  <div>
                    <strong>
                      MOCK
                    </strong>

                    <small>
                      Seed: {
                        mock.seed
                      }
                    </small>
                  </div>
                </header>

                <section className="me-instructions">
                  <strong>
                    Instructions
                  </strong>

                  <ol>
                    {
                      mock.instructions.map(
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
                      )
                    }
                  </ol>
                </section>

                <section className="me-progress me-no-print">
                  <div>
                    <span>
                      Attempt progress
                    </span>

                    <strong>
                      {
                        completeCount
                      }/{
                        mock
                          .questions
                          .length
                      }
                    </strong>
                  </div>

                  <div className="me-progress-track">
                    <span
                      style={{
                        width:
                          `${progress}%`,
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={
                      resetAttempt
                    }
                  >
                    Reset
                  </button>
                </section>

                {
                  mock.sections.map(
                    (
                      section
                    ) => (
                      <section
                        key={
                          section.key
                        }
                        className="me-section"
                      >
                        <div className="me-section-head">
                          <div>
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
                            } marks
                          </strong>
                        </div>

                        <div className="me-question-list">
                          {
                            section.questions.map(
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
                                        {
                                          question
                                            .questionLabel && (
                                            <span>
                                              {
                                                question
                                                  .questionLabel
                                              }
                                            </span>
                                          )
                                        }

                                        {
                                          question
                                            .marks != null && (
                                            <span>
                                              {
                                                question
                                                  .marks
                                              } marks
                                            </span>
                                          )
                                        }

                                        {
                                          showSources &&
                                          question.year && (
                                            <span>
                                              {
                                                question.year
                                              }
                                            </span>
                                          )
                                        }

                                        {
                                          showSources &&
                                          question.examType && (
                                            <span>
                                              {
                                                question
                                                  .examType
                                              }
                                            </span>
                                          )
                                        }

                                        {
                                          showSources &&
                                          question.primaryTopic && (
                                            <span>
                                              {
                                                question
                                                  .primaryTopic
                                              }
                                            </span>
                                          )
                                        }
                                      </div>

                                      <p>
                                        {
                                          question
                                            .questionText
                                        }
                                      </p>
                                    </div>

                                    <div className="me-q-actions me-no-print">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleQuestion(
                                            question._id
                                          )
                                        }
                                      >
                                        {
                                          done
                                            ? '✓ Done'
                                            : 'Mark done'
                                        }
                                      </button>

                                      <Link
                                        to={
                                          `/questions/${question._id}`
                                        }
                                      >
                                        Open
                                      </Link>

                                      {
                                        showSources &&
                                        sourceUrl(
                                          question
                                        ) && (
                                          <a
                                            href={
                                              sourceUrl(
                                                question
                                              )
                                            }
                                            target="_blank"
                                            rel="noopener noreferrer"
                                          >
                                            PDF
                                          </a>
                                        )
                                      }
                                    </div>
                                  </article>
                                );
                              }
                            )
                          }
                        </div>
                      </section>
                    )
                  )
                }

                <footer className="me-paper-foot">
                  <p>
                    {
                      mock.generationNotes
                        ?.disclaimer
                    }
                  </p>

                  <label className="me-no-print">
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
                      years/topics
                    </span>
                  </label>
                </footer>
              </section>
            </>
          )
        }
      </div>
    </main>
  );
}
