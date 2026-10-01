import React, {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Helmet,
} from 'react-helmet-async';

import {
  Link,
} from 'react-router-dom';

import {
  ArrowRight,
  Brain,
  ChevronRight,
  CircleAlert,
  Clipboard,
  ExternalLink,
  FileQuestion,
  FileText,
  GraduationCap,
  LibraryBig,
  Lightbulb,
  MessageSquareText,
  Send,
  Sparkles,
  Target,
  Trash2,
} from 'lucide-react';

import {
  getAskPaperStackSubjects,
  queryAskPaperStack,
} from '../services/askPaperStackApi';

import './AskPaperStackPage.css';
import { useStudentProfile } from '../context/StudentProfileContext';
import { preferredSubject, prioritizeSubjects } from '../utils/semesterPersonalization';
import QuestionText from '../components/QuestionText';

const MathAnswer = React.lazy(
  () =>
    import(
      '../components/MathAnswer'
    )
);

/* =========================================================
   SOURCE
========================================================= */

function sourceUrl(item) {
  const base =
    item?.paper?.filePath ||
    '';

  if (!base) {
    return '';
  }

  const page = Number(
    item?.sourceLocation
      ?.pageStart || 0
  );

  return page > 0
    ? `${base}#page=${page}`
    : base;
}

/* =========================================================
   EXAMPLES
========================================================= */

const EXAMPLES = [
  {
    icon: 'repeat',
    title: 'Find repeated PYQs',
    query:
      'What are the most repeated PYQs in Computer Graphics?',
  },
  {
    icon: 'revision',
    title: 'Plan revision',
    query:
      'Give me a last-minute revision plan for Data Science.',
  },
  {
    icon: 'solution',
    title: 'Find solved questions',
    query:
      'Which questions have approved solutions in Cloud Computing?',
  },
  {
    icon: 'topic',
    title: 'Find important topics',
    query:
      'Show important topics from Computer Graphics Mid-Sem.',
  },
];

function ExampleIcon({
  type,
}) {
  if (type === 'repeat') {
    return (
      <FileQuestion
        size={17}
      />
    );
  }

  if (type === 'revision') {
    return (
      <GraduationCap
        size={17}
      />
    );
  }

  if (type === 'solution') {
    return (
      <FileText
        size={17}
      />
    );
  }

  return (
    <Target size={17} />
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function AskPaperStackPage({
  toast,
}) {
  const { semester } = useStudentProfile();
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
    subjectsLoading,
    setSubjectsLoading,
  ] = useState(true);

  const [
    chat,
    setChat,
  ] = useState([]);

  const [
    query,
    setQuery,
  ] = useState('');

  const [
    sending,
    setSending,
  ] = useState(false);

  const threadEndRef =
    useRef(null);

  /* =========================================================
     SUBJECTS
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    getAskPaperStackSubjects()
      .then((data) => {
        if (!mounted) {
          return;
        }

        const list =
          Array.isArray(
            data?.subjects
          )
            ? data.subjects
            : [];

        const ordered = prioritizeSubjects(list, semester);
        const consolidated = Array.from(
          ordered.reduce((byCode, subject) => {
            const code = String(subject.subjectCode || '').trim().toUpperCase();
            if (!code) return byCode;

            const existing = byCode.get(code);
            if (!existing) {
              byCode.set(code, {
                ...subject,
                examTypes: [...new Set(subject.examTypes || [])],
                totalQuestions: Number(subject.totalQuestions || 0),
              });
              return byCode;
            }

            existing.examTypes = [...new Set([
              ...(existing.examTypes || []),
              ...(subject.examTypes || []),
            ])];
            existing.totalQuestions += Number(subject.totalQuestions || 0);
            return byCode;
          }, new Map()).values()
        );
        setSubjects(consolidated);

        if (consolidated.length) {
          setSubjectCode(
            (current) =>
              current ||
              preferredSubject(consolidated, semester)
                .subjectCode
          );
        }
      })

      .catch((error) => {
        console.error(
          'Ask PaperStack subjects failed:',
          error
        );

        toast?.(
          'Failed to load Ask PaperStack subjects.',
          'error'
        );
      })

      .finally(() => {
        if (mounted) {
          setSubjectsLoading(
            false
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [semester, toast]);

  /* =========================================================
     SELECTED SUBJECT
  ========================================================= */

  const selectedSubject =
    useMemo(
      () =>
        subjects.find(
          (item) =>
            item.subjectCode ===
            subjectCode
        ) || null,
      [
        subjects,
        subjectCode,
      ]
    );

  const availableExamTypes =
    selectedSubject?.examTypes ||
    [];

  /* =========================================================
     AUTO SCROLL
  ========================================================= */

  useEffect(() => {
    if (!chat.length) {
      return;
    }

    const timeout =
      setTimeout(() => {
        threadEndRef.current
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'end',
          });
      }, 80);

    return () =>
      clearTimeout(timeout);
  }, [chat]);

  /* =========================================================
     ASK
  ========================================================= */

  async function submitQuestion(
    customQuery
  ) {
    const finalQuery =
      String(
        customQuery || query
      ).trim();

    if (
      !finalQuery ||
      sending
    ) {
      return;
    }

    const userMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: finalQuery,
    };

    setChat(
      (current) => [
        ...current,
        userMessage,
      ]
    );

    setQuery('');
    setSending(true);

    try {
      const data =
        await queryAskPaperStack({
          query:
            finalQuery,

          subjectCode,
          examType,
        });

      setChat(
        (current) => [
          ...current,

          {
            id: `a_${Date.now()}`,

            role:
              'assistant',

            query:
              finalQuery,

            answer:
              data.answer,

            mode:
              data.mode,

            warnings:
              data.warnings ||
              [],

            followUps:
              data.followUps ||
              [],

            matches:
              data.matchedQuestions ||
              [],

            topics:
              data.topicHits ||
              [],

            repeats:
              data.repeatHits ||
              [],

            stats:
              data.stats ||
              {},
          },
        ]
      );
    } catch (error) {
      console.error(
        'Ask PaperStack query failed:',
        error
      );

      toast?.(
        error.response?.data
          ?.error ||
          'PaperStack could not answer right now.',
        'error'
      );
    } finally {
      setSending(false);
    }
  }

  /* =========================================================
     KEYBOARD
  ========================================================= */

  function handleKeyDown(
    event
  ) {
    if (
      event.key ===
        'Enter' &&
      (event.ctrlKey ||
        event.metaKey)
    ) {
      event.preventDefault();

      submitQuestion(query);
    }
  }

  /* =========================================================
     COPY
  ========================================================= */

  async function copyAnswer(
    text
  ) {
    try {
      await navigator
        .clipboard
        .writeText(
          String(text || '')
        );

      toast?.(
        'Answer copied.',
        'success'
      );
    } catch {
      toast?.(
        'Could not copy the answer.',
        'error'
      );
    }
  }

  /* =========================================================
     CLEAR
  ========================================================= */

  function clearConversation() {
    setChat([]);
    setQuery('');
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="aps-page">
      <Helmet>
        <title>
          Ask PaperStack -
          PaperStack
        </title>

        <meta
          name="description"
          content="Ask PaperStack about archived questions, previous-year papers, important topics, solutions and revision material."
        />
      </Helmet>

      <div className="aps-shell">
        {/* =================================================
            CONTEXT CONTROLS
        ================================================= */}

        <section className="aps-controls">
          <div className="aps-control-title">
            <LibraryBig
              size={17}
            />

            <div>
              <strong>
                Study context
              </strong>

              <span>
                {semester ? `Semester ${semester} subjects appear first.` : 'Select any subject from the archive.'}
              </span>
            </div>
          </div>

          <label>
            <span>
              Subject
            </span>

            <select
              value={
                subjectCode
              }
              onChange={(
                event
              ) => {
                setSubjectCode(
                  event.target
                    .value
                );

                setExamType('');
              }}
              disabled={
                subjectsLoading
              }
            >
              {!subjects.length && (
                <option value="">
                  No extracted
                  subjects
                </option>
              )}

              {subjects.map(
                (subject, index) => (
                  <option
                    key={
                      `${subject.subjectCode}-${subject.semester || 'all'}-${index}`
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
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            <span>
              Exam
            </span>

            <select
              value={examType}
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

              {availableExamTypes.map(
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
        </section>

        {/* =================================================
            WORKSPACE
        ================================================= */}

        <section className="aps-workspace">
          {/* ===============================================
              LEFT STUDY RAIL
          =============================================== */}

          <aside className="aps-sidebar">
            <section className="aps-side-section">
              <header>
                <Lightbulb
                  size={16}
                />

                <div>
                  <strong>
                    Good questions to
                    start with
                  </strong>

                  <span>
                    Tap one to ask it
                    immediately.
                  </span>
                </div>
              </header>

              <div className="aps-example-list">
                {EXAMPLES.map(
                  (
                    example,
                    index
                  ) => (
                    <button
                      type="button"
                      key={
                        example.query
                      }
                      onClick={() =>
                        submitQuestion(
                          example.query
                        )
                      }
                    >
                      <span className="aps-example-number">
                        {String(
                          index + 1
                        ).padStart(
                          2,
                          '0'
                        )}
                      </span>

                      <span className="aps-example-icon">
                        <ExampleIcon
                          type={
                            example.icon
                          }
                        />
                      </span>

                      <span className="aps-example-copy">
                        <strong>
                          {
                            example.title
                          }
                        </strong>

                        <small>
                          {
                            example.query
                          }
                        </small>
                      </span>

                      <ChevronRight
                        size={14}
                      />
                    </button>
                  )
                )}
              </div>
            </section>

          </aside>

          {/* ===============================================
              CONVERSATION
          =============================================== */}

          <section className="aps-conversation">
            <header className="aps-conversation-head">
              <div>
                <span className="aps-eyebrow">
                  <Brain size={14} />

                  Archive assistant
                </span>

                <h2>
                  Ask PaperStack
                </h2>
              </div>

              <div className="aps-conversation-status">
                {chat.length > 0 && (
                  <>
                    <span>
                      {
                        chat.filter(
                          (item) =>
                            item.role ===
                            'user'
                        ).length
                      }{' '}
                      questions
                    </span>

                    <button
                      type="button"
                      onClick={
                        clearConversation
                      }
                    >
                      <Trash2
                        size={13}
                      />

                      Clear
                    </button>
                  </>
                )}
              </div>
            </header>

            {/* =============================================
                EMPTY CONVERSATION
            ============================================= */}

            {!chat.length && (
              <section className="aps-welcome">
                <div className="aps-welcome-mark">
                  <LibraryBig
                    size={29}
                  />
                </div>

                <h3>
                  Ask anything
                </h3>

                <p>
                  Get an answer grounded in PaperStack's archive.
                </p>

                <div className="aps-welcome-examples">
                  <button
                    type="button"
                    onClick={() =>
                      setQuery(
                        'Explain the most important concepts from this subject in simple words.'
                      )
                    }
                  >
                    Explain concepts
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setQuery(
                        'Give me the most useful PYQs to practice before the exam.'
                      )
                    }
                  >
                    Find practice PYQs
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setQuery(
                        'Create a short revision plan using the archive.'
                      )
                    }
                  >
                    Plan revision
                  </button>
                </div>
              </section>
            )}

            {/* =============================================
                THREAD
            ============================================= */}

            <div
              className="aps-thread"
              aria-live="polite"
            >
              {chat.map(
                (
                  message,
                  messageIndex
                ) =>
                  message.role ===
                  'user' ? (
                    <article
                      key={
                        message.id
                      }
                      className="aps-user-message"
                    >
                      <div className="aps-message-rail">
                        <span>
                          {String(
                            Math.floor(
                              messageIndex /
                                2
                            ) + 1
                          ).padStart(
                            2,
                            '0'
                          )}
                        </span>
                      </div>

                      <div className="aps-user-message-body">
                        <span>
                          You asked
                        </span>

                        <p>
                          {
                            message.text
                          }
                        </p>
                      </div>
                    </article>
                  ) : (
                    <article
                      key={
                        message.id
                      }
                      className="aps-answer"
                    >
                      {/* ===================================
                          ANSWER HEADER
                      =================================== */}

                      <header className="aps-answer-head">
                        <div className="aps-answer-identity">
                          <span className="aps-answer-mark">
                            <Sparkles
                              size={16}
                            />
                          </span>

                          <div>
                            <strong>
                              PaperStack
                            </strong>

                            <span>
                              {message.mode ===
                              'ai'
                                ? 'Expanded study explanation'
                                : 'Archive guidance'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="aps-copy"
                          onClick={() =>
                            copyAnswer(
                              message.answer
                            )
                          }
                        >
                          <Clipboard
                            size={13}
                          />

                          Copy
                        </button>
                      </header>

                      {/* ===================================
                          QUESTION CONTEXT
                      =================================== */}

                      <div className="aps-answer-question">
                        <span>
                          Question
                        </span>

                        <p>
                          {
                            message.query
                          }
                        </p>
                      </div>

                      {/* ===================================
                          ANSWER
                      =================================== */}

                      <section className="aps-answer-content">
                        <Suspense
                          fallback={
                            <p>
                              Formatting
                              answer…
                            </p>
                          }
                        >
                          <MathAnswer>
                            {
                              message.answer
                            }
                          </MathAnswer>
                        </Suspense>
                      </section>

                      {/* ===================================
                          WARNINGS
                      =================================== */}

                      {message.warnings
                        ?.length >
                        0 && (
                        <section className="aps-warning">
                          <CircleAlert
                            size={16}
                          />

                          <div>
                            <strong>
                              Keep in mind
                            </strong>

                            {message.warnings.map(
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
                            )}
                          </div>
                        </section>
                      )}

                      {/* ===================================
                          TOPIC SIGNALS
                      =================================== */}

                      {message.topics
                        ?.length >
                        0 && (
                        <section className="aps-answer-section">
                          <header>
                            <Target
                              size={15}
                            />

                            <div>
                              <strong>
                                Topic signals
                              </strong>

                              <span>
                                Topics connected
                                to this question
                                in the archive
                              </span>
                            </div>
                          </header>

                          <div className="aps-topic-list">
                            {message.topics.map(
                              (
                                item,
                                index
                              ) => (
                                <div
                                  key={
                                    item.topic
                                  }
                                >
                                  <span>
                                    {String(
                                      index +
                                        1
                                    ).padStart(
                                      2,
                                      '0'
                                    )}
                                  </span>

                                  <strong>
                                    {
                                      item.topic
                                    }
                                  </strong>

                                  <small>
                                    {
                                      item.count
                                    }{' '}
                                    hit
                                    {item.count ===
                                    1
                                      ? ''
                                      : 's'}
                                  </small>
                                </div>
                              )
                            )}
                          </div>
                        </section>
                      )}

                      {/* ===================================
                          ARCHIVE EVIDENCE
                      =================================== */}

                      {message.matches
                        ?.length >
                        0 && (
                        <section className="aps-answer-section aps-evidence-section">
                          <header>
                            <LibraryBig
                              size={15}
                            />

                            <div>
                              <strong>
                                Evidence from
                                the archive
                              </strong>

                              <span>
                                Questions related
                                to this answer
                              </span>
                            </div>

                            <b>
                              {
                                message.matches
                                  .length
                              }
                            </b>
                          </header>

                          <div className="aps-match-list">
                            {message.matches.map(
                              (
                                item,
                                index
                              ) => (
                                <article
                                  key={
                                    item._id
                                  }
                                  className="aps-match"
                                >
                                  <span className="aps-match-index">
                                    {String(
                                      index +
                                        1
                                    ).padStart(
                                      2,
                                      '0'
                                    )}
                                  </span>

                                  <div className="aps-match-main">
                                    <div className="aps-match-meta">
                                      {item.questionLabel && (
                                        <span>
                                          {
                                            item.questionLabel
                                          }
                                        </span>
                                      )}

                                      {item.year && (
                                        <span>
                                          {
                                            item.year
                                          }
                                        </span>
                                      )}

                                      {item.examType && (
                                        <span>
                                          {
                                            item.examType
                                          }
                                        </span>
                                      )}

                                      {item.marks !=
                                        null && (
                                        <span>
                                          {
                                            item.marks
                                          }{' '}
                                          marks
                                        </span>
                                      )}

                                      {item.primaryTopic && (
                                        <span>
                                          {
                                            item.primaryTopic
                                          }
                                        </span>
                                      )}

                                      {item.approvedSolutionCount >
                                        0 && (
                                        <span className="has-solution">
                                          {
                                            item.approvedSolutionCount
                                          }{' '}
                                          solution
                                          {item.approvedSolutionCount ===
                                          1
                                            ? ''
                                            : 's'}
                                        </span>
                                      )}
                                    </div>

                                    <p>
                                      <QuestionText inline>{item.questionText}</QuestionText>
                                    </p>
                                  </div>

                                  <div className="aps-match-actions">
                                    <Link
                                      to={`/questions/${item._id}`}
                                    >
                                      Open
                                      <ArrowRight
                                        size={13}
                                      />
                                    </Link>

                                    {sourceUrl(
                                      item
                                    ) && (
                                      <a
                                        href={sourceUrl(
                                          item
                                        )}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <ExternalLink
                                          size={12}
                                        />

                                        PDF
                                      </a>
                                    )}
                                  </div>
                                </article>
                              )
                            )}
                          </div>
                        </section>
                      )}

                      {/* ===================================
                          FOLLOW UPS
                      =================================== */}

                      {message.followUps
                        ?.length >
                        0 && (
                        <section className="aps-follow-ups">
                          <header>
                            <MessageSquareText
                              size={15}
                            />

                            <div>
                              <strong>
                                Keep going
                              </strong>

                              <span>
                                Useful follow-up
                                questions
                              </span>
                            </div>
                          </header>

                          <div>
                            {message.followUps.map(
                              (
                                example,
                                index
                              ) => (
                                <button
                                  type="button"
                                  key={
                                    example
                                  }
                                  onClick={() =>
                                    submitQuestion(
                                      example
                                    )
                                  }
                                >
                                  <span>
                                    {index +
                                      1}
                                  </span>

                                  {
                                    example
                                  }

                                  <ChevronRight
                                    size={14}
                                  />
                                </button>
                              )
                            )}
                          </div>
                        </section>
                      )}
                    </article>
                  )
              )}

              {sending && (
                <div className="aps-thinking">
                  <span className="aps-thinking-dot" />

                  <div>
                    <strong>
                      PaperStack is
                      working through
                      your question…
                    </strong>

                    <small>
                      Checking the
                      selected subject
                      context and
                      available archive
                      evidence.
                    </small>
                  </div>
                </div>
              )}

              <div
                ref={
                  threadEndRef
                }
              />
            </div>

            {/* =============================================
                COMPOSER
            ============================================= */}

            <form
              className="aps-composer"
              onSubmit={(
                event
              ) => {
                event.preventDefault();

                submitQuestion(
                  query
                );
              }}
            >
              <div className="aps-composer-context">
                <span>
                  Asking about
                </span>

                <strong>
                  {selectedSubject
                    ? `${selectedSubject.subject} (${selectedSubject.subjectCode})`
                    : 'Choose a subject'}
                </strong>

                {examType && (
                  <b>
                    {examType}
                  </b>
                )}
              </div>

              <div className="aps-composer-input">
                <textarea
                  rows={3}
                  value={query}
                  onChange={(
                    event
                  ) =>
                    setQuery(
                      event.target
                        .value
                    )
                  }
                  onKeyDown={
                    handleKeyDown
                  }
                  placeholder="Ask a concept, numerical problem, PYQ pattern, revision question..."
                  aria-label="Ask PaperStack"
                />

                <button
                  type="submit"
                  disabled={
                    sending ||
                    !query.trim()
                  }
                >
                  {sending ? (
                    <>
                      <span className="aps-button-spinner" />
                      Working…
                    </>
                  ) : (
                    <>
                      Ask
                      <Send
                        size={14}
                      />
                    </>
                  )}
                </button>
              </div>

              <footer>
                <span>
                  Ctrl + Enter to send
                </span>

                <span>
                  Answers can include
                  formulas, archive
                  evidence and source
                  questions.
                </span>
              </footer>
            </form>
          </section>
        </section>
      </div>
    </main>
  );
}
