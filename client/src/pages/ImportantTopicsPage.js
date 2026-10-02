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
  useSearchParams,
} from 'react-router-dom';

import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  ExternalLink,
  FileQuestion,
  History,
  Layers3,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';

import {
  getImportantTopics,
  getImportantTopicsSubjects,
} from '../services/importantTopicsApi';

import './ImportantTopicsPage.css';
import QuestionText from '../components/QuestionText';
import LoadingButton from '../components/LoadingButton';

/* =========================================================
   HELPERS
========================================================= */

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

function formatCount(value) {
  return Number(
    value || 0
  ).toLocaleString('en-IN');
}

function clampScore(value) {
  return Math.min(
    100,
    Math.max(
      0,
      Number(value || 0)
    )
  );
}

function sourceLabel(source) {
  if (source === 'metadata') {
    return 'Topic metadata';
  }

  if (source === 'mixed') {
    return 'Metadata + derived';
  }

  return 'Locally derived';
}

/* =========================================================
   SIGNAL
========================================================= */

function SignalBadge({
  signal,
}) {
  const labels = {
    strong:
      'Strong historical signal',

    moderate:
      'Moderate signal',

    developing:
      'Developing signal',

    limited:
      'Limited evidence',
  };

  return (
    <span
      className={`it-signal it-signal-${
        signal || 'limited'
      }`}
    >
      {labels[signal] ||
        labels.limited}
    </span>
  );
}

/* =========================================================
   SCORE BAR
========================================================= */

function ScoreBar({
  value,
  max = 100,
}) {
  const width = Math.max(
    0,
    Math.min(
      100,
      max
        ? (Number(value || 0) /
            max) *
            100
        : 0
    )
  );

  return (
    <div className="it-score-track">
      <span
        className="it-score-fill"
        style={{
          width: `${width}%`,
        }}
      />
    </div>
  );
}

/* =========================================================
   SUMMARY STAT
========================================================= */

function SummaryStat({
  icon: Icon,
  label,
  value,
  caption,
  tone = 'teal',
}) {
  return (
    <article
      className={`it-summary-card it-summary-${tone}`}
    >
      <span className="it-summary-icon">
        <Icon size={20} />
      </span>

      <div>
        <span>{label}</span>

        <strong>
          {value}
        </strong>

        <p>{caption}</p>
      </div>
    </article>
  );
}

/* =========================================================
   TOPIC CARD
========================================================= */

function TopicCard({
  topic,
  rank,
}) {
  const [
    expanded,
    setExpanded,
  ] = useState(false);

  const score =
    clampScore(topic.score);

  const breakdown = [
    {
      label: 'Frequency',
      value:
        topic.scoreBreakdown
          ?.frequency || 0,
      max: 35,
    },
    {
      label: 'Year spread',
      value:
        topic.scoreBreakdown
          ?.yearSpread || 0,
      max: 25,
    },
    {
      label: 'Marks',
      value:
        topic.scoreBreakdown
          ?.marks || 0,
      max: 20,
    },
    {
      label: 'Repeat support',
      value:
        topic.scoreBreakdown
          ?.repeatSupport || 0,
      max: 15,
    },
    {
      label: 'Exam coverage',
      value:
        topic.scoreBreakdown
          ?.examCoverage || 0,
      max: 5,
    },
  ];

  return (
    <article className="it-topic-card">
      <div className="it-rank">
        <span>
          {String(rank).padStart(
            2,
            '0'
          )}
        </span>
      </div>

      <div className="it-topic-content">
        {/* ===============================================
            HEADING
        =============================================== */}

        <header className="it-topic-heading">
          <div className="it-topic-title">
            <div className="it-topic-badges">
              <SignalBadge
                signal={topic.signal}
              />

              <span>
                {sourceLabel(
                  topic.source
                )}
              </span>
            </div>

            <h2>
              {topic.topic}
            </h2>
          </div>

          <div className="it-score">
            <div>
              <strong>
                {score}
              </strong>

              <span>/100</span>
            </div>

            <small>
              revision score
            </small>
          </div>
        </header>

        <ScoreBar
          value={score}
        />

        {/* ===============================================
            QUICK EVIDENCE
        =============================================== */}

        <div className="it-topic-stats">
          <div>
            <span>
              Asked
            </span>

            <strong>
              {topic.occurrences || 0}×
            </strong>
          </div>

          <div>
            <span>
              Years
            </span>

            <strong>
              {topic.years?.length ||
                0}
            </strong>
          </div>

          <div>
            <span>
              Total marks
            </span>

            <strong>
              {topic.marksKnownCount
                ? topic.totalMarks
                : '—'}
            </strong>
          </div>

          <div>
            <span>
              Repeat-backed
            </span>

            <strong>
              {topic.repeatedInstances ||
                0}
            </strong>
          </div>

          <div>
            <span>
              Exam types
            </span>

            <strong>
              {topic.examTypes?.length ||
                0}
            </strong>
          </div>
        </div>

        {/* ===============================================
            EVIDENCE TAGS
        =============================================== */}

        <div className="it-evidence-row">
          {(topic.years || [])
            .map((year) => (
              <span
                key={`year-${year}`}
              >
                <History size={10} />

                {year}
              </span>
            ))}

          {(topic.examTypes || [])
            .map((exam) => (
              <span
                key={`exam-${exam}`}
              >
                {exam}
              </span>
            ))}

          {(topic.units || [])
            .map((unit) => (
              <span
                key={`unit-${unit}`}
              >
                Unit {unit}
              </span>
            ))}

          {topic.averageMarks !=
            null && (
            <span>
              Avg{' '}
              {topic.averageMarks}{' '}
              marks
            </span>
          )}
        </div>

        {/* ===============================================
            WHY THIS RANKED HERE
        =============================================== */}

        <section className="it-breakdown">
          <div className="it-breakdown-heading">
            <span>
              Why this ranks here
            </span>

            <small>
              Evidence contributing to
              the 100-point score
            </small>
          </div>

          <div className="it-breakdown-grid">
            {breakdown.map(
              (item) => (
                <div
                  key={
                    item.label
                  }
                >
                  <div className="it-breakdown-label">
                    <span>
                      {item.label}
                    </span>

                    <strong>
                      {
                        item.value
                      }
                      /
                      {
                        item.max
                      }
                    </strong>
                  </div>

                  <ScoreBar
                    value={
                      item.value
                    }
                    max={
                      item.max
                    }
                  />
                </div>
              )
            )}
          </div>
        </section>

        {/* ===============================================
            ACTIONS
        =============================================== */}

        <div className="it-topic-actions">
          <button
            type="button"
            onClick={() =>
              setExpanded(
                (value) => !value
              )
            }
          >
            <FileQuestion
              size={14}
            />

            {expanded ? (
              <>
                Hide evidence

                <ChevronUp
                  size={14}
                />
              </>
            ) : (
              <>
                View{' '}
                {topic.questions
                  ?.length || 0}{' '}
                supporting questions

                <ChevronDown
                  size={14}
                />
              </>
            )}
          </button>

          <Link
            to={`/questions?q=${encodeURIComponent(
              topic.topic
            )}`}
          >
            Practice this topic

            <ArrowRight
              size={14}
            />
          </Link>
        </div>

        {/* ===============================================
            SUPPORTING QUESTIONS
        =============================================== */}

        {expanded && (
          <section className="it-question-list">
            <header>
              <div>
                <span>
                  Supporting PYQs
                </span>

                <strong>
                  Historical evidence
                  for this topic
                </strong>
              </div>

              <small>
                Open any question to
                inspect it fully.
              </small>
            </header>

            {(topic.questions || [])
              .map(
                (
                  question,
                  index
                ) => (
                  <article
                    key={
                      question._id
                    }
                    className="it-question-row"
                  >
                    <div className="it-question-index">
                      {index + 1}
                    </div>

                    <div className="it-question-body">
                      <div className="it-question-meta">
                        <strong>
                          {question.questionLabel ||
                            'Question'}
                        </strong>

                        <span>
                          {question.year ||
                            'Year'}
                        </span>

                        <span>
                          {question.examType ||
                            'Exam'}
                        </span>

                        {question.marks !=
                          null && (
                          <span>
                            {
                              question.marks
                            }{' '}
                            marks
                          </span>
                        )}

                        {question.unit && (
                          <span>
                            Unit{' '}
                            {
                              question.unit
                            }
                          </span>
                        )}

                        {question
                          .sourceLocation
                          ?.pageStart && (
                          <span>
                            Page{' '}
                            {
                              question
                                .sourceLocation
                                .pageStart
                            }
                          </span>
                        )}
                      </div>

                      <p>
                        <QuestionText inline>{question.questionText}</QuestionText>
                      </p>
                    </div>

                    <div className="it-question-actions">
                      <Link
                        to={`/questions/${question._id}`}
                      >
                        <FileQuestion
                          size={13}
                        />

                        Open
                      </Link>

                      {sourceUrl(
                        question
                      ) && (
                        <a
                          href={sourceUrl(
                            question
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
          </section>
        )}
      </div>
    </article>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function ImportantTopicsPage({
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
    limit,
    setLimit,
  ] = useState(
    Number(
      searchParams.get(
        'limit'
      ) || 20
    )
  );

  const [
    threshold,
    setThreshold,
  ] = useState(
    Number(
      searchParams.get(
        'threshold'
      ) || 72
    )
  );

  const [
    sort,
    setSort,
  ] = useState('score');

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    data,
    setData,
  ] = useState(null);

  const [
    subjectLoading,
    setSubjectLoading,
  ] = useState(true);

  const [
    loading,
    setLoading,
  ] = useState(false);

  /* =========================================================
     SUBJECTS
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    getImportantTopicsSubjects()
      .then((result) => {
        if (!mounted) {
          return;
        }

        const list =
          Array.isArray(
            result?.subjects
          )
            ? result.subjects
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
        console.error(
          'Important Topics subjects failed:',
          error
        );

        toast?.(
          'Failed to load subjects for Top Exam Topics.',
          'error'
        );
      })

      .finally(() => {
        if (mounted) {
          setSubjectLoading(
            false
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [toast]);

  /* =========================================================
     TOPICS DATA
  ========================================================= */

  useEffect(() => {
    if (!subjectCode) {
      setData(null);
      return;
    }

    let mounted = true;
    const controller = new AbortController();

    setLoading(true);

    setSearchParams(
      {
        subjectCode,
        limit: String(limit),
        threshold:
          String(threshold),
      },
      {
        replace: true,
      }
    );

    getImportantTopics(
      subjectCode,
      {
        threshold,
        limit,
      },
      { signal: controller.signal }
    )
      .then((result) => {
        if (mounted) {
          setData(
            result || null
          );
        }
      })

      .catch((error) => {
        if (error?.code === 'ERR_CANCELED' || error?.name === 'CanceledError') return;
        console.error(
          'Important Topics analysis failed:',
          error
        );

        toast?.(
          error.response?.data
            ?.error ||
            'Failed to calculate Top Exam Topics.',
          'error'
        );

        if (mounted) {
          setData(null);
        }
      })

      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [
    subjectCode,
    limit,
    threshold,
    setSearchParams,
    toast,
  ]);

  /* =========================================================
     FILTER / SORT
  ========================================================= */

  const topics =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      let rows = [
        ...(data?.topics || []),
      ];

      if (term) {
        rows = rows.filter(
          (topic) => {
            const pool = [
              topic.topic,

              ...(topic.years ||
                []).map(String),

              ...(topic.examTypes ||
                []),

              ...(topic.units ||
                []).map(
                (unit) =>
                  `unit ${unit}`
              ),

              ...(topic.questions ||
                []).map(
                (question) =>
                  question.questionText
              ),
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase();

            return pool.includes(
              term
            );
          }
        );
      }

      if (
        sort === 'frequency'
      ) {
        rows.sort(
          (a, b) =>
            Number(
              b.occurrences || 0
            ) -
              Number(
                a.occurrences || 0
              ) ||
            Number(b.score || 0) -
              Number(a.score || 0)
        );
      } else if (
        sort === 'years'
      ) {
        rows.sort(
          (a, b) =>
            (b.years?.length ||
              0) -
              (a.years?.length ||
                0) ||
            Number(b.score || 0) -
              Number(a.score || 0)
        );
      } else if (
        sort === 'marks'
      ) {
        rows.sort(
          (a, b) =>
            Number(
              b.totalMarks || 0
            ) -
              Number(
                a.totalMarks || 0
              ) ||
            Number(b.score || 0) -
              Number(a.score || 0)
        );
      } else {
        rows.sort(
          (a, b) =>
            Number(b.score || 0) -
            Number(a.score || 0)
        );
      }

      return rows;
    }, [
      data,
      search,
      sort,
    ]);

  const summary =
    data?.summary || {};

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

  /*
    Hero should show the strongest
    topic from the complete analysis,
    not whichever topic happens to
    be first after the user's search
    or sorting choice.
  */

  const topTopic =
    useMemo(() => {
      const rows = [
        ...(data?.topics || []),
      ];

      rows.sort(
        (a, b) =>
          Number(
            b.score || 0
          ) -
          Number(
            a.score || 0
          )
      );

      return rows[0] || null;
    }, [data]);

  const topPriorities =
    useMemo(() => {
      const rows = [
        ...(data?.topics || []),
      ];

      rows.sort(
        (a, b) =>
          Number(
            b.score || 0
          ) -
          Number(
            a.score || 0
          )
      );

      return rows.slice(0, 3);
    }, [data]);

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main className="it-page">
      <Helmet>
        <title>
          Top Exam Topics -
          PaperStack
        </title>

        <meta
          name="description"
          content="Prioritize revision using historical PYQ frequency, year spread, marks, repeat evidence and exam coverage."
        />
      </Helmet>

      <div className="it-shell">
        {/* =================================================
            HERO
        ================================================= */}

        <section className="it-hero">
          <div className="it-hero-copy">
            <span className="it-eyebrow">
              <Target size={15} />

              Top Exam Topics
            </span>

            <h1>
              Don't revise
              everything equally.
              <br />

              <span>
                Follow the evidence.
              </span>
            </h1>

            <p>
              PaperStack organizes
              historical PYQ evidence into
              a revision priority score
              using frequency, year spread,
              marks, repeated-question
              support and exam coverage.
            </p>

            <div className="it-hero-trust">
              <span>
                <CheckCircle2
                  size={14}
                />

                Historical PYQ evidence
              </span>

              <span>
                <CheckCircle2
                  size={14}
                />

                Transparent score
              </span>

              <span>
                <CheckCircle2
                  size={14}
                />

                Supporting questions
                available
              </span>
            </div>
          </div>

          <aside className="it-hero-score">
            <span>
              Strongest revision signal
            </span>

            <strong>
              {topTopic?.score ||
                0}
              <small>/100</small>
            </strong>

            <p>
              {topTopic?.topic ||
                'Choose a subject'}
            </p>

            {topTopic && (
              <>
                <ScoreBar
                  value={
                    topTopic.score
                  }
                />

                <div className="it-hero-topic-meta">
                  <span>
                    {
                      topTopic.occurrences ||
                      0
                    }× asked
                  </span>

                  <span>
                    {
                      topTopic.years
                        ?.length || 0
                    }{' '}
                    years
                  </span>
                </div>
              </>
            )}

            <small>
              Historical evidence helps
              organize revision. It does
              not predict the next paper.
            </small>
          </aside>
        </section>

        {/* =================================================
            SCORE METHOD
        ================================================= */}

        <section className="it-method">
          <div className="it-method-title">
            <BarChart3
              size={17}
            />

            <div>
              <strong>
                How the revision score
                works
              </strong>

              <span>
                Total: 100 points
              </span>
            </div>
          </div>

          <div className="it-method-components">
            <span>
              <b>35</b>
              Frequency
            </span>

            <span>
              <b>25</b>
              Year spread
            </span>

            <span>
              <b>20</b>
              Marks
            </span>

            <span>
              <b>15</b>
              Repeat support
            </span>

            <span>
              <b>5</b>
              Exam coverage
            </span>
          </div>
        </section>

        {/* =================================================
            CONTROLS
        ================================================= */}

        <section className="it-controls">
          <div className="it-controls-head">
            <div>
              <Search size={17} />

              <span>
                Revision analysis
              </span>
            </div>

            <small>
              Choose a subject and adjust
              how the evidence is shown.
            </small>
          </div>

          <div className="it-control-grid">
            <label className="it-subject-control">
              <span>
                Subject
              </span>

              <select
                value={subjectCode}
                disabled={
                  subjectLoading
                }
                onChange={(
                  event
                ) =>
                  setSubjectCode(
                    event.target.value
                  )
                }
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
                      {' questions)'}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Show
              </span>

              <select
                value={limit}
                onChange={(
                  event
                ) =>
                  setLimit(
                    Number(
                      event.target.value
                    )
                  )
                }
              >
                <option value={10}>
                  Top 10
                </option>

                <option value={20}>
                  Top 20
                </option>

                <option value={30}>
                  Top 30
                </option>

                <option value={50}>
                  Top 50
                </option>
              </select>
            </label>

            <label>
              <span>
                Repeat matching
              </span>

              <select
                value={threshold}
                onChange={(
                  event
                ) =>
                  setThreshold(
                    Number(
                      event.target.value
                    )
                  )
                }
              >
                <option value={65}>
                  65% · Broad
                </option>

                <option value={72}>
                  72% · Balanced
                </option>

                <option value={80}>
                  80% · Strict
                </option>

                <option value={90}>
                  90% · Very strict
                </option>
              </select>
            </label>

            <label>
              <span>
                Sort by
              </span>

              <select
                value={sort}
                onChange={(
                  event
                ) =>
                  setSort(
                    event.target.value
                  )
                }
              >
                <option value="score">
                  Revision score
                </option>

                <option value="frequency">
                  Frequency
                </option>

                <option value="years">
                  Year spread
                </option>

                <option value="marks">
                  Total marks
                </option>
              </select>
            </label>

            <label className="it-search">
              <span>
                Search topics
              </span>

              <div>
                <Search
                  size={15}
                />

                <input
                  value={search}
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="e.g. midpoint circle"
                />

                {search && (
                  <button
                    type="button"
                    aria-label="Clear topic search"
                    onClick={() =>
                      setSearch('')
                    }
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </label>

            <LoadingButton
              className="it-find-action"
              loading={loading}
              loadingText="Finding important topics…"
              disabled={!subjectCode}
              onClick={() => document.querySelector('.it-summary-grid, .it-state')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Find Important Topics
              <ArrowRight size={16} />
            </LoadingButton>
          </div>
        </section>

        {/* =================================================
            STATES
        ================================================= */}

        {loading ? (
          <section className="it-state">
            <span className="it-loader" />

            <strong>
              Building revision
              priorities…
            </strong>

            <p>
              Combining question
              frequency, years, marks and
              repeat evidence.
            </p>
          </section>
        ) : !subjectCode ? (
          <section className="it-state">
            <CircleAlert
              size={30}
            />

            <strong>
              No subject available.
            </strong>

            <p>
              Extract questions from at
              least one subject first.
            </p>
          </section>
        ) : !data ? (
          <section className="it-state">
            <CircleAlert
              size={30}
            />

            <strong>
              Top Exam Topics could not
              be loaded.
            </strong>

            <p>
              Try another subject or
              repeat-matching threshold.
            </p>
          </section>
        ) : (
          <>
            {/* =============================================
                SUMMARY
            ============================================= */}

            <section className="it-summary-grid">
              <SummaryStat
                icon={FileQuestion}
                label="Questions analyzed"
                value={formatCount(
                  summary.questionsAnalyzed
                )}
                caption="Extracted PYQs used as evidence"
              />

              <SummaryStat
                icon={Layers3}
                label="Topics identified"
                value={formatCount(
                  summary.topicsIdentified
                )}
                caption="Metadata and locally derived topic labels"
                tone="blue"
              />

              <SummaryStat
                icon={TrendingUp}
                label="Repeat-backed"
                value={formatCount(
                  summary.repeatBackedTopics
                )}
                caption="Topics supported by repeated PYQs"
                tone="green"
              />

              <SummaryStat
                icon={CalendarRange}
                label="Years covered"
                value={formatCount(
                  summary.yearsCovered
                )}
                caption={
                  (data.years || [])
                    .join(' · ') ||
                  'No year data'
                }
                tone="yellow"
              />
            </section>

            {/* =============================================
                CURRENT SUBJECT
            ============================================= */}

            <section className="it-subject-strip">
              <div>
                <span>
                  Current analysis
                </span>

                <strong>
                  {selectedSubject
                    ?.subjectCode ||
                    subjectCode}
                  {' · '}
                  {selectedSubject
                    ?.subject ||
                    data.subject
                      ?.subject ||
                    'Subject'}
                </strong>
              </div>

              <div>
                <span>
                  Metadata-backed
                </span>

                <strong>
                  {
                    summary.metadataBackedTopics ||
                    0
                  }
                </strong>
              </div>

              <div>
                <span>
                  Derived fallback
                </span>

                <strong>
                  {
                    summary.derivedOnlyTopics ||
                    0
                  }
                </strong>
              </div>

              <Link to="/pyq-intelligence">
                Compare repeat patterns

                <ArrowRight
                  size={14}
                />
              </Link>
            </section>

            {/* =============================================
                TOP REVISION QUEUE
            ============================================= */}

            {!!topPriorities.length && (
              <section className="it-priority">
                <header className="it-section-head">
                  <div>
                    <span className="it-eyebrow">
                      <BookOpenCheck
                        size={14}
                      />

                      Start Here
                    </span>

                    <h2>
                      Your top revision
                      queue.
                    </h2>

                    <p>
                      The three strongest
                      historical signals
                      for this subject.
                    </p>
                  </div>
                </header>

                <div className="it-priority-grid">
                  {topPriorities.map(
                    (
                      topic,
                      index
                    ) => (
                      <Link
                        key={
                          topic.key
                        }
                        to={`/questions?q=${encodeURIComponent(
                          topic.topic
                        )}`}
                      >
                        <span className="it-priority-rank">
                          {index + 1}
                        </span>

                        <div>
                          <span>
                            Revision
                            priority
                          </span>

                          <strong>
                            {
                              topic.topic
                            }
                          </strong>

                          <small>
                            {
                              topic.occurrences ||
                              0
                            }
                            × asked
                            {' · '}
                            {
                              topic.years
                                ?.length ||
                              0
                            }{' '}
                            years
                          </small>
                        </div>

                        <div className="it-priority-score">
                          {
                            topic.score
                          }
                          <small>
                            /100
                          </small>
                        </div>

                        <ArrowRight
                          size={15}
                        />
                      </Link>
                    )
                  )}
                </div>
              </section>
            )}

            {/* =============================================
                QUALITY NOTE
            ============================================= */}

            <section className="it-quality-note">
              <Sparkles
                size={18}
              />

              <div>
                <strong>
                  About topic quality
                </strong>

                <p>
                  {
                    summary.metadataBackedTopics ||
                    0
                  }{' '}
                  topic labels come from
                  explicit question
                  metadata.{' '}
                  {
                    summary.derivedOnlyTopics ||
                    0
                  }{' '}
                  were derived locally
                  from question text when
                  explicit metadata was
                  unavailable.
                </p>
              </div>

              <span>
                Metadata-backed labels
                generally provide the
                cleaner evidence.
              </span>
            </section>

            {/* =============================================
                TOPIC LIST
            ============================================= */}

            <section className="it-topic-section">
              <header className="it-list-head">
                <div>
                  <span className="it-eyebrow">
                    <Target
                      size={14}
                    />

                    Revision Priorities
                  </span>

                  <h2>
                    {topics.length}{' '}
                    matching{' '}
                    {topics.length === 1
                      ? 'topic'
                      : 'topics'}
                  </h2>

                  <p>
                    Ranked using historical
                    exam evidence. Open any
                    topic to inspect why it
                    received its score.
                  </p>
                </div>

                <Link
                  to={`/questions?subjectCode=${encodeURIComponent(
                    subjectCode
                  )}`}
                >
                  All {subjectCode}{' '}
                  questions

                  <ArrowRight
                    size={15}
                  />
                </Link>
              </header>

              {topics.length ? (
                <div className="it-topic-list">
                  {topics.map(
                    (
                      topic,
                      index
                    ) => (
                      <TopicCard
                        key={
                          topic.key
                        }
                        topic={
                          topic
                        }
                        rank={
                          index + 1
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <section className="it-no-topics">
                  <span>
                    <Search
                      size={27}
                    />
                  </span>

                  <h3>
                    No matching topics.
                  </h3>

                  <p>
                    Try a broader search
                    term or clear the
                    current topic search.
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      setSearch('')
                    }
                  >
                    Clear Search
                  </button>
                </section>
              )}
            </section>

            {/* =============================================
                DISCLAIMER
            ============================================= */}

            <section className="it-disclaimer">
              <BarChart3
                size={18}
              />

              <div>
                <strong>
                  Revision evidence, not
                  an exam prediction.
                </strong>

                <p>
                  Topic scores summarize
                  patterns in the
                  historical PaperStack
                  question archive. A
                  higher score means more
                  historical evidence for
                  prioritizing revision;
                  it does not guarantee
                  that a topic will appear
                  in the next exam.
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
