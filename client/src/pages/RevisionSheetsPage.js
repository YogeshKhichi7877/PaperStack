import React, {
  Suspense,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Helmet,
} from 'react-helmet-async';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  ArrowRight,
  BookOpen,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  GraduationCap,
  ListChecks,
  Printer,
  Sparkles,
  Target,
} from 'lucide-react';

import {
  getRevisionSheet,
  getRevisionSheetSubjects,
} from '../services/revisionSheetApi';

import {
  mockMistakes,
  readMockEvidence,
} from '../utils/studyEvidence';

import './RevisionSheetsPage.css';

const MathAnswer = React.lazy(
  () =>
    import(
      '../components/MathAnswer'
    )
);

/* =========================================================
   REVISION MODES
========================================================= */

const MODES = [
  {
    id: '10',
    label: '10 min',
    description: 'Quick scan',
    formulas: 4,
    definitions: 2,
    topics: 3,
    algorithms: 0,
    recall: 3,
  },
  {
    id: '30',
    label: '30 min',
    description: 'Focused revision',
    formulas: 8,
    definitions: 5,
    topics: 6,
    algorithms: 2,
    recall: 6,
  },
  {
    id: '60',
    label: '1 hour',
    description: 'Deep revision',
    formulas: 14,
    definitions: 8,
    topics: 9,
    algorithms: 5,
    recall: 9,
  },
  {
    id: 'full',
    label: 'Full',
    description: 'Everything available',
    formulas: 50,
    definitions: 50,
    topics: 50,
    algorithms: 50,
    recall: 50,
  },
];

/* =========================================================
   STORAGE
========================================================= */

function currentUserKey() {
  try {
    return (
      localStorage.getItem(
        'username'
      ) || 'guest'
    );
  } catch {
    return 'guest';
  }
}

function storageKey(
  subjectCode,
  examType,
  kind
) {
  return [
    'paperstack',
    kind,
    currentUserKey(),
    subjectCode || 'subject',
    examType || 'all',
  ].join('_');
}

function readStored(
  key,
  fallback
) {
  try {
    const raw =
      localStorage.getItem(key);

    if (!raw) {
      return fallback;
    }

    return (
      JSON.parse(raw) ||
      fallback
    );
  } catch {
    return fallback;
  }
}

/* =========================================================
   HELPERS
========================================================= */

function formatCount(value) {
  return Number(
    value || 0
  ).toLocaleString('en-IN');
}

/* =========================================================
   FORMULAS
========================================================= */

function FormulaList({
  formulas,
}) {
  if (!formulas.length) {
    return (
      <div className="rs-empty-box">
        <FileText size={21} />

        <div>
          <strong>
            No formulas available yet
          </strong>

          <p>
            Approved solutions or
            resources need to contain
            formula text before it can
            appear here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rs-formula-list">
      {formulas.map(
        (item, index) => (
          <article
            key={`${item.questionId || item.resourceId}-${index}`}
            className="rs-formula-row"
          >
            <header>
              <span>
                Formula{' '}
                {String(
                  index + 1
                ).padStart(2, '0')}
              </span>

              <small>
                {item.source}
              </small>
            </header>

            <div className="rs-formula-body">
              <Suspense
                fallback={
                  <span>
                    Loading formula…
                  </span>
                }
              >
                <MathAnswer>
                  {`$$\n${item.latex}\n$$`}
                </MathAnswer>
              </Suspense>
            </div>

            <footer>
              {item.questionId && (
                <Link
                  to={`/questions/${item.questionId}`}
                >
                  View question
                  <ArrowRight
                    size={13}
                  />
                </Link>
              )}

              {!item.questionId &&
                item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View resource
                    <ArrowRight
                      size={13}
                    />
                  </a>
                )}
            </footer>
          </article>
        )
      )}
    </div>
  );
}

/* =========================================================
   SUMMARY TILE
========================================================= */

function RevisionStat({
  icon: Icon,
  label,
  value,
  caption,
  tone = 'teal',
}) {
  return (
    <article
      className={`rs-stat rs-stat-${tone}`}
    >
      <span className="rs-stat-icon">
        <Icon size={19} />
      </span>

      <div>
        <span>{label}</span>

        <strong>{value}</strong>

        <p>{caption}</p>
      </div>
    </article>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function RevisionSheetsPage({
  toast,
}) {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

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
    sheet,
    setSheet,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState('');

  const [
    modeId,
    setModeId,
  ] = useState('10');

  const [
    formulaOnly,
    setFormulaOnly,
  ] = useState(false);

  const [
    lastFive,
    setLastFive,
  ] = useState(false);

  const [
    checked,
    setChecked,
  ] = useState({});

  const [
    recall,
    setRecall,
  ] = useState({});

  const [
    recallIndex,
    setRecallIndex,
  ] = useState(0);

  const [
    revealed,
    setRevealed,
  ] = useState(false);

  /* =========================================================
     SUBJECTS
  ========================================================= */

  useEffect(() => {
    let active = true;

    getRevisionSheetSubjects()
      .then((data) => {
        if (!active) {
          return;
        }

        const list =
          Array.isArray(
            data?.subjects
          )
            ? data.subjects
            : [];

        setSubjects(list);

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
        if (!active) {
          return;
        }

        const message =
          error.response?.data
            ?.error ||
          'Could not load revision subjects.';

        setLoadError(
          message
        );

        toast?.(
          message,
          'error'
        );
      });

    return () => {
      active = false;
    };
  }, [toast]);

  /* =========================================================
     SAVED REVISION STATE
  ========================================================= */

  useEffect(() => {
    setChecked(
      readStored(
        storageKey(
          subjectCode,
          examType,
          'revision_checklist_v2'
        ),
        {}
      )
    );

    setRecall(
      readStored(
        storageKey(
          subjectCode,
          examType,
          'revision_recall'
        ),
        {}
      )
    );

    setRecallIndex(0);
    setRevealed(false);
  }, [
    subjectCode,
    examType,
  ]);

  /* =========================================================
     LOAD SHEET
  ========================================================= */

  useEffect(() => {
    if (!subjectCode) {
      setLoading(false);
      setSheet(null);

      return;
    }

    let active = true;

    setLoading(true);

    const params = {
      subjectCode,
    };

    if (examType) {
      params.examType =
        examType;
    }

    setSearchParams(
      params,
      {
        replace: true,
      }
    );

    getRevisionSheet(
      subjectCode,
      {
        examType,
      }
    )
      .then((data) => {
        if (!active) {
          return;
        }

        setSheet(data);
        setLoadError('');
      })

      .catch((error) => {
        if (!active) {
          return;
        }

        const message =
          error.response?.data
            ?.error ||
          'Could not prepare the revision sheet.';

        setSheet(null);
        setLoadError(
          message
        );

        toast?.(
          message,
          'error'
        );
      })

      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    subjectCode,
    examType,
    setSearchParams,
    toast,
  ]);

  /* =========================================================
     DERIVED WORKSPACE
  ========================================================= */

  const workspace =
    sheet?.workspace || {};

  const mode =
    MODES.find(
      (item) =>
        item.id === modeId
    ) || MODES[0];

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

  const mockHistory =
    useMemo(
      () =>
        readMockEvidence(
          subjectCode
        ),
      [subjectCode]
    );

  const personalMistakes =
    useMemo(
      () =>
        mockMistakes(
          mockHistory
        ),
      [mockHistory]
    );

  const topics =
    (
      workspace.mustRevise ||
      []
    ).slice(
      0,
      mode.topics
    );

  const formulas =
    (
      workspace.formulas ||
      []
    ).slice(
      0,
      mode.formulas
    );

  const definitions =
    (
      workspace.definitions ||
      []
    ).slice(
      0,
      mode.definitions
    );

  const algorithms =
    (
      workspace.algorithms ||
      []
    ).slice(
      0,
      mode.algorithms
    );

  const recallItems =
    (
      workspace.rapidRecall ||
      []
    ).slice(
      0,
      mode.recall
    );

  const activeRecall =
    recallItems.length
      ? recallItems[
          recallIndex %
            recallItems.length
        ]
      : null;

  const completedCount =
    topics.filter(
      (item) =>
        checked[item.key]
    ).length;

  const progress =
    topics.length
      ? Math.round(
          (
            completedCount /
            topics.length
          ) * 100
        )
      : null;

  const knownRecallCount =
    Object.values(
      recall
    ).filter(
      (status) =>
        status === 'known'
    ).length;

  const reviseRecallCount =
    Object.values(
      recall
    ).filter(
      (status) =>
        status === 'revise'
    ).length;

  const examTypes =
    selectedSubject?.examTypes ||
    [];

  /* =========================================================
     ACTIONS
  ========================================================= */

  function markTopic(key) {
    const next = {
      ...checked,
      [key]:
        !checked[key],
    };

    setChecked(next);

    try {
      localStorage.setItem(
        storageKey(
          subjectCode,
          examType,
          'revision_checklist_v2'
        ),
        JSON.stringify(
          next
        )
      );
    } catch {}
  }

  function markRecall(
    status
  ) {
    if (
      !activeRecall ||
      !recallItems.length
    ) {
      return;
    }

    const next = {
      ...recall,

      [activeRecall.questionId]:
        status,
    };

    setRecall(next);

    try {
      localStorage.setItem(
        storageKey(
          subjectCode,
          examType,
          'revision_recall'
        ),
        JSON.stringify(
          next
        )
      );
    } catch {}

    setRecallIndex(
      (index) =>
        (index + 1) %
        recallItems.length
    );

    setRevealed(false);
  }

  function changeMode(id) {
    setModeId(id);
    setRecallIndex(0);
    setRevealed(false);
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main className="rs-page">
      <Helmet>
        <title>
          Revision Sheets -
          PaperStack
        </title>

        <meta
          name="description"
          content="Fast source-backed revision with formulas, definitions, algorithms, rapid recall and personal mock mistakes."
        />
      </Helmet>

      <div className="rs-shell">
        {/* =================================================
            HERO
        ================================================= */}

        <section className="rs-hero">
          <div className="rs-hero-copy">
            <span className="rs-eyebrow">
              <BookOpenCheck
                size={15}
              />

              Revision Sheets
            </span>

            <h1>
              Less scrolling.
              <br />

              <span>
                More remembering.
              </span>
            </h1>

            <p>
              Turn PaperStack's question
              archive, approved answers
              and your own mock mistakes
              into a focused revision
              sheet for the time you
              actually have.
            </p>

            <div className="rs-hero-points">
              <span>
                <CheckCircle2
                  size={14}
                />

                Source-backed revision
              </span>

              <span>
                <CheckCircle2
                  size={14}
                />

                Time-based modes
              </span>

              <span>
                <CheckCircle2
                  size={14}
                />

                Personal mistake sheet
              </span>

              <span>
                <CheckCircle2
                  size={14}
                />

                Active recall
              </span>
            </div>
          </div>

          <aside className="rs-hero-side">
            <span>
              Current revision pack
            </span>

            <strong>
              {subjectCode || '—'}
            </strong>

            <p>
              {selectedSubject?.subject ||
                sheet?.subject
                  ?.subject ||
                'Choose a subject'}
            </p>

            <div className="rs-hero-context">
              <span>
                <b>
                  {lastFive
                    ? '5 min'
                    : mode.label}
                </b>
                Time mode
              </span>

              <span>
                <b>
                  {examType ||
                    'All exams'}
                </b>
                Exam scope
              </span>
            </div>

            <div className="rs-hero-actions rs-no-print">
              <button
                type="button"
                className={
                  lastFive
                    ? 'is-active'
                    : ''
                }
                onClick={() =>
                  setLastFive(
                    (value) =>
                      !value
                  )
                }
              >
                <Clock3 size={15} />

                {lastFive
                  ? 'Exit 5-minute mode'
                  : 'Last 5 minutes'}
              </button>

              <button
                type="button"
                onClick={() =>
                  window.print()
                }
              >
                <Printer size={15} />
                Print / PDF
              </button>
            </div>
          </aside>
        </section>

        {/* =================================================
            CONTROLS
        ================================================= */}

        <section className="rs-controls rs-no-print">
          <div className="rs-control-head">
            <div>
              <Target size={17} />

              <span>
                Build your revision session
              </span>
            </div>

            <small>
              Pick the subject, exam and
              amount of time available.
            </small>
          </div>

          <div className="rs-control-grid">
            <label className="rs-subject-control">
              <span>Subject</span>

              <select
                value={subjectCode}
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
                  (item) => (
                    <option
                      key={
                        item.subjectCode
                      }
                      value={
                        item.subjectCode
                      }
                    >
                      {
                        item.subjectCode
                      }
                      {' · '}
                      {
                        item.subject
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>Exam</span>

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

            {!lastFive && (
              <div className="rs-mode-control">
                <span>
                  Revision time
                </span>

                <div
                  className="rs-modes"
                  role="group"
                  aria-label="Revision time"
                >
                  {MODES.map(
                    (item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-pressed={
                          modeId ===
                          item.id
                        }
                        onClick={() =>
                          changeMode(
                            item.id
                          )
                        }
                      >
                        <strong>
                          {item.label}
                        </strong>

                        <small>
                          {
                            item.description
                          }
                        </small>
                      </button>
                    )
                  )}
                </div>
              </div>
            )}

            {!lastFive && (
              <button
                type="button"
                className={`rs-formula-toggle ${
                  formulaOnly
                    ? 'is-active'
                    : ''
                }`}
                onClick={() =>
                  setFormulaOnly(
                    (value) =>
                      !value
                  )
                }
              >
                <FileText
                  size={16}
                />

                <span>
                  <strong>
                    Formula focus
                  </strong>

                  <small>
                    {formulaOnly
                      ? 'Showing formulas only'
                      : 'Hide everything except formulas'}
                  </small>
                </span>
              </button>
            )}
          </div>
        </section>

        {/* =================================================
            STATES
        ================================================= */}

        {loading ? (
          <section className="rs-state">
            <span className="rs-loader" />

            <strong>
              Preparing revision material…
            </strong>

            <p>
              Collecting topic evidence,
              approved answers, formulas
              and recall questions.
            </p>
          </section>
        ) : !sheet ? (
          <section className="rs-state">
            <CircleAlert
              size={29}
            />

            <strong>
              Revision material isn't
              available yet.
            </strong>

            <p>
              {loadError ||
                'No extracted questions are available for this subject yet.'}
            </p>
          </section>
        ) : (
          <>
            {/* =============================================
                SUBJECT CONTEXT
            ============================================= */}

            <section className="rs-context">
              <div className="rs-current-subject">
                <span>
                  Current workspace
                </span>

                <strong>
                  {sheet.subject
                    ?.subject ||
                    subjectCode}
                </strong>

                <small>
                  {subjectCode}
                  {' · '}
                  Semester{' '}
                  {sheet.subject
                    ?.semester ||
                    'unknown'}
                  {' · '}
                  {examType ||
                    'All exams'}
                </small>
              </div>

              <div>
                <span>
                  Archive evidence
                </span>

                <strong>
                  {formatCount(
                    sheet.summary
                      ?.questionsAnalyzed
                  )}
                </strong>

                <small>
                  archived questions
                </small>
              </div>

              <div>
                <span>
                  Session mode
                </span>

                <strong>
                  {lastFive
                    ? '5 min'
                    : mode.label}
                </strong>

                <small>
                  {lastFive
                    ? 'Emergency recall'
                    : mode.description}
                </small>
              </div>

              <div>
                <span>
                  Recall memory
                </span>

                <strong>
                  {knownRecallCount}
                </strong>

                <small>
                  marked known
                </small>
              </div>
            </section>

            {/* =============================================
                LAST 5 MINUTES
            ============================================= */}

            {lastFive ? (
              <section className="rs-last-five">
                <header className="rs-last-five-head">
                  <div>
                    <span className="rs-eyebrow">
                      <Clock3
                        size={14}
                      />

                      Last 5 Minutes
                    </span>

                    <h2>
                      Stop learning new
                      things.
                      <br />

                      <span>
                        Recall what matters.
                      </span>
                    </h2>

                    <p>
                      Keep this page short.
                      Recall from memory
                      first, then check the
                      source only when
                      needed.
                    </p>
                  </div>

                  <div className="rs-last-five-badge">
                    05
                    <span>MIN</span>
                  </div>
                </header>

                <section className="rs-cram-section">
                  <div className="rs-section-title">
                    <span className="rs-section-number">
                      01
                    </span>

                    <div>
                      <h3>
                        Critical formulas
                      </h3>

                      <p>
                        Scan only what you
                        are likely to
                        forget.
                      </p>
                    </div>
                  </div>

                  <FormulaList
                    formulas={
                      workspace
                        .lastFiveMinutes
                        ?.formulas ||
                      []
                    }
                  />
                </section>

                <section className="rs-cram-section">
                  <div className="rs-section-title">
                    <span className="rs-section-number">
                      02
                    </span>

                    <div>
                      <h3>
                        Definitions
                      </h3>

                      <p>
                        Exact words worth
                        recalling before
                        the exam.
                      </p>
                    </div>
                  </div>

                  <div className="rs-definition-list">
                    {(
                      workspace
                        .lastFiveMinutes
                        ?.definitions ||
                      []
                    ).map(
                      (item) => (
                        <article
                          key={
                            item.questionId
                          }
                        >
                          <strong>
                            {
                              item.prompt
                            }
                          </strong>

                          <React.Suspense fallback={<p>{item.answer}</p>}>
                            <MathAnswer>{item.answer}</MathAnswer>
                          </React.Suspense>
                        </article>
                      )
                    )}

                    {!workspace
                      .lastFiveMinutes
                      ?.definitions
                      ?.length && (
                      <p className="rs-empty">
                        No approved
                        definitions yet.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rs-cram-section">
                  <div className="rs-section-title">
                    <span className="rs-section-number">
                      03
                    </span>

                    <div>
                      <h3>
                        My mistakes
                      </h3>

                      <p>
                        The mistakes you
                        made in evaluated
                        mocks.
                      </p>
                    </div>
                  </div>

                  <div className="rs-mistake-list">
                    {personalMistakes
                      .slice(0, 3)
                      .map(
                        (item) => (
                          <article
                            key={`${item.questionId}-${item.text}`}
                          >
                            <CircleAlert
                              size={15}
                            />

                            <p>
                              {
                                item.text
                              }
                            </p>
                          </article>
                        )
                      )}

                    {!personalMistakes.length && (
                      <p className="rs-empty">
                        No evaluated mock
                        mistakes recorded
                        on this device.
                      </p>
                    )}
                  </div>
                </section>

                <section className="rs-cram-section">
                  <div className="rs-section-title">
                    <span className="rs-section-number">
                      04
                    </span>

                    <div>
                      <h3>
                        Must remember
                      </h3>

                      <p>
                        Final topic cues
                        before you stop.
                      </p>
                    </div>
                  </div>

                  <div className="rs-remember-grid">
                    {(
                      workspace
                        .lastFiveMinutes
                        ?.facts ||
                      []
                    ).map(
                      (
                        item,
                        index
                      ) => (
                        <div
                          key={
                            item.key
                          }
                        >
                          <span>
                            {index + 1}
                          </span>

                          <strong>
                            {
                              item.topic
                            }
                          </strong>

                          {item.occurrences ? (
                            <small>
                              {
                                item.occurrences
                              }{' '}
                              archived
                              questions
                            </small>
                          ) : null}
                        </div>
                      )
                    )}
                  </div>
                </section>
              </section>
            ) : (
              <>
                {/* =========================================
                    SUMMARY
                ========================================= */}

                <section className="rs-summary-grid">
                  <RevisionStat
                    icon={Target}
                    label="Must revise"
                    value={
                      topics.length
                    }
                    caption="Topics inside this time mode"
                  />

                  <RevisionStat
                    icon={FileText}
                    label="Formulas"
                    value={
                      formulas.length
                    }
                    caption="Source-backed formulas available"
                    tone="blue"
                  />

                  <RevisionStat
                    icon={BookOpen}
                    label="Definitions"
                    value={
                      definitions.length
                    }
                    caption="Approved short-answer material"
                    tone="green"
                  />

                  <RevisionStat
                    icon={ListChecks}
                    label="Rapid recall"
                    value={
                      recallItems.length
                    }
                    caption={`${reviseRecallCount} marked for revision`}
                    tone="yellow"
                  />
                </section>

                {/* =========================================
                    SESSION PLAN
                ========================================= */}

                <section className="rs-plan">
                  <div>
                    <span>
                      Your {mode.label}{' '}
                      revision route
                    </span>

                    <strong>
                      {formulaOnly
                        ? 'Formula focus enabled'
                        : 'Revise → Recall → Check mistakes'}
                    </strong>
                  </div>

                  <div className="rs-plan-steps">
                    {!formulaOnly && (
                      <>
                        <span>
                          <b>
                            {
                              topics.length
                            }
                          </b>
                          Topics
                        </span>

                        <i />

                        <span>
                          <b>
                            {
                              definitions.length
                            }
                          </b>
                          Definitions
                        </span>

                        <i />
                      </>
                    )}

                    <span>
                      <b>
                        {
                          formulas.length
                        }
                      </b>
                      Formulas
                    </span>

                    {!formulaOnly && (
                      <>
                        <i />

                        <span>
                          <b>
                            {
                              recallItems.length
                            }
                          </b>
                          Recall
                        </span>
                      </>
                    )}
                  </div>
                </section>

                {/* =========================================
                    PAPERSTACK BRIEF
                ========================================= */}

                {workspace.aiBriefing && (
                  <section className="rs-briefing">
                    <span className="rs-briefing-icon">
                      <Sparkles
                        size={18}
                      />
                    </span>

                    <div>
                      <span>
                        PaperStack recall
                        brief
                      </span>

                      <React.Suspense fallback={<p>{workspace.aiBriefing}</p>}>
                        <MathAnswer>{workspace.aiBriefing}</MathAnswer>
                      </React.Suspense>
                    </div>
                  </section>
                )}

                {/* =========================================
                    PROGRESS
                ========================================= */}

                {!formulaOnly && (
                  <section className="rs-progress">
                    <div>
                      <span>
                        Revision progress
                      </span>

                      <strong>
                        {progress == null
                          ? 'No checklist yet'
                          : `${completedCount}/${topics.length} topics recalled`}
                      </strong>
                    </div>

                    <div className="rs-progress-track">
                      <span
                        style={{
                          width: `${
                            progress ||
                            0
                          }%`,
                        }}
                      />
                    </div>

                    <strong className="rs-progress-number">
                      {progress == null
                        ? '—'
                        : `${progress}%`}
                    </strong>
                  </section>
                )}

                {/* =========================================
                    MUST REVISE
                ========================================= */}

                {!formulaOnly && (
                  <section
                    className="rs-work-section"
                    id="must-revise"
                  >
                    <header className="rs-section-head">
                      <div>
                        <span className="rs-eyebrow">
                          <Target
                            size={14}
                          />

                          Revision Queue
                        </span>

                        <h2>
                          Must revise
                        </h2>

                        <p>
                          Work through the
                          highest-value
                          concepts first.
                        </p>
                      </div>

                      <span className="rs-section-count">
                        {completedCount}/
                        {topics.length}
                        {' '}
                        done
                      </span>
                    </header>

                    {topics.length ? (
                      <div className="rs-topic-list">
                        {topics.map(
                          (
                            item,
                            index
                          ) => (
                            <label
                              key={
                                item.key
                              }
                              className={
                                checked[
                                  item
                                    .key
                                ]
                                  ? 'is-complete'
                                  : ''
                              }
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(
                                  checked[
                                    item
                                      .key
                                  ]
                                )}
                                onChange={() =>
                                  markTopic(
                                    item.key
                                  )
                                }
                              />

                              <span className="rs-topic-index">
                                {String(
                                  index +
                                    1
                                ).padStart(
                                  2,
                                  '0'
                                )}
                              </span>

                              <span className="rs-topic-copy">
                                <strong>
                                  {
                                    item.topic
                                  }
                                </strong>

                                <small>
                                  {item.occurrences
                                    ? `${item.occurrences} archived question${
                                        item.occurrences ===
                                        1
                                          ? ''
                                          : 's'
                                      }`
                                    : 'Archive topic evidence'}
                                </small>
                              </span>

                              {item.questionId && (
                                <Link
                                  to={`/questions/${item.questionId}`}
                                >
                                  Open PYQ

                                  <ArrowRight
                                    size={13}
                                  />
                                </Link>
                              )}
                            </label>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="rs-empty">
                        No topic evidence
                        yet.
                      </p>
                    )}
                  </section>
                )}

                {/* =========================================
                    FORMULAS
                ========================================= */}

                <section
                  className="rs-work-section"
                  id="formula-bank"
                >
                  <header className="rs-section-head">
                    <div>
                      <span className="rs-eyebrow">
                        <FileText
                          size={14}
                        />

                        Formula Bank
                      </span>

                      <h2>
                        Formulas worth
                        remembering.
                      </h2>

                      <p>
                        Formula text found
                        in approved answers
                        and resources.
                      </p>
                    </div>

                    <span className="rs-section-count">
                      {
                        formulas.length
                      }{' '}
                      formulas
                    </span>
                  </header>

                  <FormulaList
                    formulas={
                      formulas
                    }
                  />
                </section>

                {!formulaOnly && (
                  <>
                    {/* =====================================
                        RECALL CUES
                    ===================================== */}

                    {!!workspace
                      .aiRecallNotes
                      ?.length && (
                      <section className="rs-work-section">
                        <header className="rs-section-head">
                          <div>
                            <span className="rs-eyebrow">
                              <Sparkles
                                size={14}
                              />

                              Recall Cues
                            </span>

                            <h2>
                              Short cues for
                              fast recall.
                            </h2>

                            <p>
                              Read the cue
                              first, then
                              open the
                              source only
                              if needed.
                            </p>
                          </div>
                        </header>

                        <div className="rs-cue-list">
                          {workspace.aiRecallNotes.map(
                            (
                              item,
                              index
                            ) => (
                              <article
                                key={`${item.sourceId}-${index}`}
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

                                <React.Suspense fallback={<p>{item.text}</p>}>
                                  <MathAnswer>{item.text}</MathAnswer>
                                </React.Suspense>

                                <Link
                                  to={`/questions/${item.sourceId}`}
                                >
                                  Source
                                </Link>
                              </article>
                            )
                          )}
                        </div>
                      </section>
                    )}

                    {/* =====================================
                        DEFINITIONS
                    ===================================== */}

                    <section className="rs-work-section">
                      <header className="rs-section-head">
                        <div>
                          <span className="rs-eyebrow">
                            <BookOpen
                              size={14}
                            />

                            Definition Bank
                          </span>

                          <h2>
                            Definitions you
                            can revise
                            quickly.
                          </h2>

                          <p>
                            Concise
                            source-backed
                            answers useful
                            for theory
                            questions.
                          </p>
                        </div>

                        <span className="rs-section-count">
                          {
                            definitions.length
                          }
                        </span>
                      </header>

                      {definitions.length ? (
                        <div className="rs-definition-list">
                          {definitions.map(
                            (
                              item,
                              index
                            ) => (
                              <article
                                key={
                                  item.questionId
                                }
                              >
                                <span className="rs-definition-index">
                                  {String(
                                    index +
                                      1
                                  ).padStart(
                                    2,
                                    '0'
                                  )}
                                </span>

                                <div>
                                  <strong>
                                    {
                                      item.prompt
                                    }
                                  </strong>

                                  <React.Suspense fallback={<p>{item.answer}</p>}>
                                    <MathAnswer>{item.answer}</MathAnswer>
                                  </React.Suspense>

                                  <Link
                                    to={`/questions/${item.questionId}`}
                                  >
                                    View source
                                    <ArrowRight
                                      size={13}
                                    />
                                  </Link>
                                </div>
                              </article>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="rs-empty">
                          No approved
                          definition
                          answers for this
                          scope yet.
                        </p>
                      )}
                    </section>

                    {/* =====================================
                        ALGORITHMS
                    ===================================== */}

                    <section className="rs-work-section">
                      <header className="rs-section-head">
                        <div>
                          <span className="rs-eyebrow">
                            <ListChecks
                              size={14}
                            />

                            Algorithm
                            Cheat Sheets
                          </span>

                          <h2>
                            Steps you
                            should be able
                            to reproduce.
                          </h2>

                          <p>
                            Compact
                            algorithm and
                            procedure
                            revision.
                          </p>
                        </div>

                        <span className="rs-section-count">
                          {
                            algorithms.length
                          }
                        </span>
                      </header>

                      {algorithms.length ? (
                        <div className="rs-algorithm-list">
                          {algorithms.map(
                            (
                              item,
                              index
                            ) => (
                              <article
                                key={
                                  item.questionId
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

                                <div>
                                  <strong>
                                    {item.topic ||
                                      item.prompt}
                                  </strong>

                                  <React.Suspense fallback={<p>{item.answer}</p>}>
                                    <MathAnswer>{item.answer}</MathAnswer>
                                  </React.Suspense>

                                  <Link
                                    to={`/questions/${item.questionId}`}
                                  >
                                    View full
                                    steps
                                    <ArrowRight
                                      size={13}
                                    />
                                  </Link>
                                </div>
                              </article>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="rs-empty">
                          No approved
                          algorithm
                          answers yet.
                        </p>
                      )}
                    </section>

                    {/* =====================================
                        COMMON MISTAKES
                    ===================================== */}

                    <section className="rs-work-section">
                      <header className="rs-section-head">
                        <div>
                          <span className="rs-eyebrow">
                            <CircleAlert
                              size={14}
                            />

                            Common Mistakes
                          </span>

                          <h2>
                            Easy marks not
                            to lose.
                          </h2>

                          <p>
                            Source-backed
                            mistakes and
                            common weak
                            points found in
                            the revision
                            material.
                          </p>
                        </div>
                      </header>

                      {workspace
                        .commonMistakes
                        ?.length ? (
                        <div className="rs-mistake-list">
                          {workspace.commonMistakes.map(
                            (
                              item,
                              index
                            ) => (
                              <article
                                key={`${item.sourceId}-${index}`}
                              >
                                <CircleAlert
                                  size={15}
                                />

                                <React.Suspense fallback={<p>{item.text}</p>}>
                                  <MathAnswer>{item.text}</MathAnswer>
                                </React.Suspense>

                                <Link
                                  to={`/questions/${item.sourceId}`}
                                >
                                  Source
                                </Link>
                              </article>
                            )
                          )}
                        </div>
                      ) : (
                        <p className="rs-empty">
                          No source-backed
                          general mistakes
                          identified.
                        </p>
                      )}
                    </section>

                    {/* =====================================
                        RAPID RECALL
                    ===================================== */}

                    <section className="rs-work-section rs-recall-section">
                      <header className="rs-section-head">
                        <div>
                          <span className="rs-eyebrow">
                            <GraduationCap
                              size={14}
                            />

                            Active Recall
                          </span>

                          <h2>
                            Can you answer
                            without looking?
                          </h2>

                          <p>
                            Recall first.
                            Reveal only
                            after committing
                            to an answer in
                            your head.
                          </p>
                        </div>

                        <div className="rs-recall-summary">
                          <span>
                            <b>
                              {
                                knownRecallCount
                              }
                            </b>
                            known
                          </span>

                          <span>
                            <b>
                              {
                                reviseRecallCount
                              }
                            </b>
                            revise
                          </span>
                        </div>
                      </header>

                      {activeRecall ? (
                        <div className="rs-recall">
                          <div className="rs-recall-top">
                            <span>
                              Recall{' '}
                              {
                                recallIndex +
                                1
                              }{' '}
                              of{' '}
                              {
                                recallItems.length
                              }
                            </span>

                            {recall[
                              activeRecall
                                .questionId
                            ] && (
                              <small>
                                Last marked:{' '}
                                {
                                  recall[
                                    activeRecall
                                      .questionId
                                  ]
                                }
                              </small>
                            )}
                          </div>

                          <strong className="rs-recall-question">
                            {
                              activeRecall.prompt
                            }
                          </strong>

                          {!revealed && (
                            <div className="rs-recall-pause">
                              <Sparkles
                                size={17}
                              />

                              <span>
                                Try to
                                answer this
                                from memory
                                before
                                revealing
                                the answer.
                              </span>
                            </div>
                          )}

                          {revealed && (
                            <div className="rs-recall-answer">
                              {activeRecall.answer ? (
                                <Suspense
                                  fallback="Loading answer..."
                                >
                                  <MathAnswer>
                                    {
                                      activeRecall.answer
                                    }
                                  </MathAnswer>
                                </Suspense>
                              ) : (
                                <p>
                                  No approved
                                  answer is
                                  available.
                                  Check the
                                  source
                                  question.
                                </p>
                              )}

                              <Link
                                to={`/questions/${activeRecall.questionId}`}
                              >
                                Open source
                                question
                                <ArrowRight
                                  size={13}
                                />
                              </Link>
                            </div>
                          )}

                          <div className="rs-recall-actions rs-no-print">
                            <button
                              type="button"
                              className="rs-reveal-button"
                              onClick={() =>
                                setRevealed(
                                  (value) =>
                                    !value
                                )
                              }
                            >
                              {revealed
                                ? 'Hide answer'
                                : 'Reveal answer'}
                            </button>

                            <button
                              type="button"
                              className="rs-known-button"
                              onClick={() =>
                                markRecall(
                                  'known'
                                )
                              }
                            >
                              <Check
                                size={14}
                              />
                              I knew this
                            </button>

                            <button
                              type="button"
                              className="rs-revise-button"
                              onClick={() =>
                                markRecall(
                                  'revise'
                                )
                              }
                            >
                              Revise again
                            </button>
                          </div>

                          {recallItems.length >
                            1 && (
                            <div className="rs-recall-navigation rs-no-print">
                              <button
                                type="button"
                                onClick={() => {
                                  setRecallIndex(
                                    (
                                      index
                                    ) =>
                                      (
                                        index -
                                        1 +
                                        recallItems.length
                                      ) %
                                      recallItems.length
                                  );

                                  setRevealed(
                                    false
                                  );
                                }}
                              >
                                <ChevronLeft
                                  size={14}
                                />
                                Previous
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setRecallIndex(
                                    (
                                      index
                                    ) =>
                                      (
                                        index +
                                        1
                                      ) %
                                      recallItems.length
                                  );

                                  setRevealed(
                                    false
                                  );
                                }}
                              >
                                Next
                                <ChevronRight
                                  size={14}
                                />
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="rs-empty">
                          No recall
                          questions yet.
                        </p>
                      )}
                    </section>

                    {/* =====================================
                        MY MISTAKES
                    ===================================== */}

                    <section className="rs-work-section">
                      <header className="rs-section-head">
                        <div>
                          <span className="rs-eyebrow">
                            <CircleAlert
                              size={14}
                            />

                            Personal Mistake
                            Sheet
                          </span>

                          <h2>
                            Mistakes from
                            your own mocks.
                          </h2>

                          <p>
                            PaperStack keeps
                            these on this
                            device so your
                            revision gets
                            more personal
                            over time.
                          </p>
                        </div>

                        <span className="rs-section-count">
                          {
                            personalMistakes.length
                          }
                        </span>
                      </header>

                      {personalMistakes.length ? (
                        <div className="rs-personal-mistakes">
                          {personalMistakes.map(
                            (
                              item,
                              index
                            ) => (
                              <article
                                key={`${item.questionId}-${item.text}`}
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

                                <p>
                                  {
                                    item.text
                                  }
                                </p>

                                <Link
                                  to={`/questions/${item.questionId}`}
                                >
                                  Retry
                                  <ArrowRight
                                    size={13}
                                  />
                                </Link>
                              </article>
                            )
                          )}
                        </div>
                      ) : (
                        <div className="rs-empty-box">
                          <CircleAlert
                            size={20}
                          />

                          <div>
                            <strong>
                              No personal
                              mistakes yet
                            </strong>

                            <p>
                              Evaluate a
                              mock exam to
                              automatically
                              build your
                              mistake
                              sheet.
                            </p>
                          </div>
                        </div>
                      )}
                    </section>

                    {/* =====================================
                        RESOURCES
                    ===================================== */}

                    {!!workspace
                      .resources
                      ?.length && (
                      <section className="rs-work-section">
                        <header className="rs-section-head">
                          <div>
                            <span className="rs-eyebrow">
                              <BookOpen
                                size={14}
                              />

                              Resources
                            </span>

                            <h2>
                              Approved
                              resources for
                              deeper study.
                            </h2>
                          </div>
                        </header>

                        <div className="rs-resource-list">
                          {workspace.resources.map(
                            (
                              item,
                              index
                            ) =>
                              item.url ? (
                                <a
                                  key={
                                    item.id
                                  }
                                  href={
                                    item.url
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
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
                                      item.title
                                    }
                                  </strong>

                                  <ArrowRight
                                    size={14}
                                  />
                                </a>
                              ) : (
                                <div
                                  key={
                                    item.id
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
                                      item.title
                                    }
                                  </strong>
                                </div>
                              )
                          )}
                        </div>
                      </section>
                    )}
                  </>
                )}

                {/* =========================================
                    METHODOLOGY
                ========================================= */}

                <section className="rs-method">
                  <Sparkles
                    size={17}
                  />

                  <div>
                    <strong>
                      How this sheet is
                      built
                    </strong>

                    <p>
                      {workspace.methodology}{' '}
                      Historical frequency
                      helps prioritize
                      revision, but it is
                      not a prediction of
                      the next exam.
                    </p>
                  </div>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}
