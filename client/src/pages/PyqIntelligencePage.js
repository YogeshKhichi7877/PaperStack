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
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  ExternalLink,
  FileQuestion,
  GitCompareArrows,
  History,
  Layers3,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';

import {
  getPyqIntelligenceSubjects,
  getSubjectPyqIntelligence,
} from '../services/pyqIntelligenceApi';

import './PyqIntelligencePage.css';
import { useStudentProfile } from '../context/StudentProfileContext';
import { preferredSubject, prioritizeSubjects } from '../utils/semesterPersonalization';
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

function clampPercentage(value) {
  return Math.min(
    100,
    Math.max(
      0,
      Number(value || 0)
    )
  );
}

function formatCount(value) {
  return Number(
    value || 0
  ).toLocaleString('en-IN');
}

/* =========================================================
   SUMMARY STAT
========================================================= */

function IntelligenceStat({
  icon: Icon,
  label,
  value,
  caption,
  tone = 'teal',
}) {
  return (
    <article
      className={`pi-stat pi-stat-${tone}`}
    >
      <span className="pi-stat-icon">
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
   CLUSTER
========================================================= */

function ClusterCard({
  cluster,
  index,
}) {
  const [
    expanded,
    setExpanded,
  ] = useState(false);

  const similarity =
    clampPercentage(
      cluster.averageSimilarity
    );

  const exact =
    cluster.matchType ===
    'exact';

  return (
    <article className="pi-cluster">
      <div className="pi-cluster-number">
        {index + 1}
      </div>

      <div className="pi-cluster-main">
        <header className="pi-cluster-head">
          <div className="pi-cluster-heading">
            <div className="pi-cluster-badges">
              <span
                className={`pi-match ${
                  exact
                    ? 'exact'
                    : 'similar'
                }`}
              >
                {exact
                  ? 'Exact repeat'
                  : 'Similar repeat'}
              </span>

              <span>
                {
                  cluster.occurrenceCount
                }{' '}
                appearances
              </span>

              <span>
                {
                  cluster.distinctYearCount
                }{' '}
                {cluster.distinctYearCount ===
                1
                  ? 'year'
                  : 'years'}
              </span>
            </div>

            <h3>
              {
                cluster.representativeText
              }
            </h3>
          </div>

          <div className="pi-similarity">
            <div>
              <strong>
                {similarity}%
              </strong>

              <span>
                similarity
              </span>
            </div>

            <div className="pi-similarity-track">
              <span
                style={{
                  width: `${similarity}%`,
                }}
              />
            </div>
          </div>
        </header>

        <div className="pi-cluster-details">
          <div className="pi-year-row">
            {(cluster.years || [])
              .map((year) => (
                <span key={year}>
                  <History size={11} />
                  {year}
                </span>
              ))}

            {(cluster.examTypes || [])
              .map((exam) => (
                <span key={exam}>
                  {exam}
                </span>
              ))}

            {(cluster.marks || [])
              .map((marks) => (
                <span
                  key={`marks-${marks}`}
                >
                  {marks} marks
                </span>
              ))}
          </div>

          <button
            type="button"
            className="pi-expand"
            onClick={() =>
              setExpanded(
                (value) => !value
              )
            }
          >
            {expanded ? (
              <>
                Hide occurrences
                <ChevronUp
                  size={15}
                />
              </>
            ) : (
              <>
                View all{' '}
                {
                  cluster.occurrenceCount
                }{' '}
                occurrences
                <ChevronDown
                  size={15}
                />
              </>
            )}
          </button>
        </div>

        {expanded && (
          <div className="pi-occurrences">
            <div className="pi-occurrence-heading">
              <span>
                Historical occurrences
              </span>

              <small>
                Compare how the question
                appeared across papers.
              </small>
            </div>

            {(cluster.questions || [])
              .map(
                (
                  question,
                  questionIndex
                ) => (
                  <article
                    className="pi-occurrence"
                    key={question._id}
                  >
                    <div className="pi-occurrence-index">
                      {
                        questionIndex +
                        1
                      }
                    </div>

                    <div className="pi-occurrence-body">
                      <div className="pi-occurrence-meta">
                        <strong>
                          {question.questionLabel ||
                            'Question'}
                        </strong>

                        <span>
                          {question.year ||
                            'Year unknown'}
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

                    <div className="pi-occurrence-actions">
                      <Link
                        to={`/questions/${question._id}`}
                      >
                        <FileQuestion
                          size={14}
                        />

                        Open Question
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
                            size={13}
                          />

                          PDF
                        </a>
                      )}
                    </div>
                  </article>
                )
              )}
          </div>
        )}
      </div>
    </article>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function PyqIntelligencePage({
  toast,
}) {
  const { semester } = useStudentProfile();
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
    threshold,
    setThreshold,
  ] = useState(
    Number(
      searchParams.get(
        'threshold'
      ) || 72
    )
  );

  const [data, setData] =
    useState(null);

  const [
    subjectLoading,
    setSubjectLoading,
  ] = useState(true);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    search,
    setSearch,
  ] = useState('');

  /* =========================================================
     SUBJECTS
  ========================================================= */

  useEffect(() => {
    let mounted = true;

    getPyqIntelligenceSubjects()
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

        const ordered = prioritizeSubjects(list, semester);
        setSubjects(ordered);

        if (list.length) {
          setSubjectCode(
            (current) =>
              current ||
              preferredSubject(ordered, semester)
                .subjectCode
          );
        }
      })

      .catch((error) => {
        console.error(
          'PYQ intelligence subjects failed:',
          error
        );

        toast?.(
          'Failed to load subjects for Repeated topics.',
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
  }, [semester, toast]);

  /* =========================================================
     INTELLIGENCE DATA
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
        threshold:
          String(threshold),
      },
      {
        replace: true,
      }
    );

    getSubjectPyqIntelligence(
      subjectCode,
      threshold,
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
          'PYQ intelligence load failed:',
          error
        );

        toast?.(
          error.response?.data
            ?.error ||
            'Failed to calculate Repeated topics.',
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
    threshold,
    setSearchParams,
    toast,
  ]);

  /* =========================================================
     FILTERED CLUSTERS
  ========================================================= */

  const filteredClusters =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      if (!term) {
        return (
          data?.clusters || []
        );
      }

      return (
        data?.clusters || []
      ).filter((cluster) => {
        const pool = [
          cluster.representativeText,

          ...(cluster.questions ||
            []).map(
            (question) =>
              question.questionText
          ),

          ...(cluster.years ||
            []).map(String),

          ...(cluster.examTypes ||
            []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return pool.includes(
          term
        );
      });
    }, [
      data,
      search,
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

  const repeatRate =
    clampPercentage(
      summary.repeatRate
    );

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="pi-page">
      <Helmet>
        <title>
          Repeated topics -
          PaperStack
        </title>

        <meta
          name="description"
          content="Compare previous-year questions across years and discover repeated and similar question patterns."
        />
      </Helmet>

      <div className="pi-shell">
        {/* =================================================
            HERO
        ================================================= */}

        <section className="pi-hero">
          <div className="pi-hero-copy">
            <span className="pi-eyebrow">
              <GitCompareArrows
                size={15}
              />
              Repeated topics
            </span>

            <h1>
              Find repeated
              <br />

              <span>
                PYQs.
              </span>
            </h1>

            <p>Discover repeated questions, topics and exam patterns.</p>

            <div className="pi-hero-trust" hidden>
              <span>
                <CheckCircle2
                  size={14}
                />
                Built from extracted PYQs
              </span>

              <span>
                <CheckCircle2
                  size={14}
                />
                Evidence shown with every
                pattern
              </span>

              <span>
                <CheckCircle2
                  size={14}
                />
                Original papers stay
                accessible
              </span>
            </div>
          </div>

          <aside className="pi-hero-side">
            <span>
              Current subject
            </span>

            <strong>
              {selectedSubject
                ?.subjectCode ||
                subjectCode ||
                '—'}
            </strong>

            <p>
              {selectedSubject?.subject ||
                data?.subject?.subject ||
                'Select a subject'}
            </p>

            <div className="pi-hero-rate">
              <div>
                <span>
                  Repeat rate
                </span>

                <strong>
                  {repeatRate}%
                </strong>
              </div>

              <div className="pi-hero-rate-track">
                <span
                  style={{
                    width: `${repeatRate}%`,
                  }}
                />
              </div>
            </div>

            <small>
              {
                summary.repeatedClusters ||
                0
              }{' '}
              repeat clusters detected
              using the current threshold.
            </small>
          </aside>
        </section>

        {/* =================================================
            ANALYSIS CONTROLS
        ================================================= */}

        <section className="pi-controls">
          <div className="pi-control-heading">
            <div>
              <Target size={18} />

              <span>
              Analyze PYQs
              </span>
            </div>

            <small>
              Semester {semester} subjects appear first.
            </small>
          </div>

          <div className="pi-control-grid">
            <label className="pi-subject-control">
              <span>Subject</span>

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
                Similarity threshold
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

            <label className="pi-search">
              <span>
                Search patterns
              </span>

              <div>
                <Search
                  size={16}
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
                    aria-label="Clear repeat search"
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
              type="button"
              className="pi-analyze"
              loading={loading}
              loadingText="Analyzing PYQs…"
              disabled={loading || !subjectCode}
              onClick={() =>
                document
                  .querySelector('.pi-summary-grid, .pi-state')
                  ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }
            >
              Analyze PYQs
              <ArrowRight size={16} />
            </LoadingButton>
          </div>

          <div className="pi-threshold-guide">
            <span
              className={
                threshold === 65
                  ? 'active'
                  : ''
              }
            >
              Broad
            </span>

            <i />

            <span
              className={
                threshold === 72
                  ? 'active'
                  : ''
              }
            >
              Balanced
            </span>

            <i />

            <span
              className={
                threshold === 80
                  ? 'active'
                  : ''
              }
            >
              Strict
            </span>

            <i />

            <span
              className={
                threshold === 90
                  ? 'active'
                  : ''
              }
            >
              Very strict
            </span>
          </div>
        </section>

        {/* =================================================
            LOADING / STATES
        ================================================= */}

        {loading ? (
          <section className="pi-state">
            <span className="pi-loader" />

            <strong>
              Comparing previous-year
              questions…
            </strong>

            <p>
              Looking for repeated wording
              and similar question patterns.
            </p>
          </section>
        ) : !subjectCode ? (
          <section className="pi-state">
            <CircleAlert
              size={30}
            />

            <strong>
              No subject selected.
            </strong>

            <p>
              Extract questions from at
              least one paper first.
            </p>
          </section>
        ) : !data ? (
          <section className="pi-state">
            <CircleAlert
              size={30}
            />

            <strong>
              Intelligence data could not
              be loaded.
            </strong>

            <p>
              Try another subject or
              threshold.
            </p>
          </section>
        ) : (
          <>
            {/* =============================================
                SUMMARY
            ============================================= */}

            <section className="pi-summary-grid" id="pi-analysis-results">
              <IntelligenceStat
                icon={FileQuestion}
                label="Questions analyzed"
                value={formatCount(
                  summary.totalQuestions
                )}
                caption="Extracted questions available for this subject"
              />

              <IntelligenceStat
                icon={Layers3}
                label="Repeated instances"
                value={formatCount(
                  summary.repeatedQuestionInstances
                )}
                caption="Question appearances belonging to repeat clusters"
                tone="blue"
              />

              <IntelligenceStat
                icon={TrendingUp}
                label="Repeat rate"
                value={`${repeatRate}%`}
                caption="Share of analyzed questions found inside repeat patterns"
                tone="green"
              />

              <IntelligenceStat
                icon={History}
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
                SUBJECT ANALYSIS STRIP
            ============================================= */}

            <section className="pi-analysis-strip">
              <div className="pi-current-subject">
                <span>
                  Analysis
                </span>

                <strong>
                  {data.subject
                    ?.subjectCode ||
                    subjectCode}
                  {' · '}
                  {data.subject?.subject ||
                    'Subject'}
                </strong>
              </div>

              <div>
                <span>
                  Exact clusters
                </span>

                <strong>
                  {
                    summary.exactClusters ||
                    0
                  }
                </strong>
              </div>

              <div>
                <span>
                  Similar clusters
                </span>

                <strong>
                  {
                    summary.similarClusters ||
                    0
                  }
                </strong>
              </div>

              <div>
                <span>
                  Match threshold
                </span>

                <strong>
                  {data.threshold ||
                    threshold}
                  %
                </strong>
              </div>
            </section>

            {/* =============================================
                TOPIC SIGNALS
            ============================================= */}

            {data.topicSignals
              ?.length > 0 && (
              <section className="pi-topic-signals">
                <header className="pi-section-head">
                  <div>
                    <span className="pi-eyebrow">
                      <Sparkles
                        size={14}
                      />
                      Topic Signals
                    </span>

                    <h2>
                      Topics appearing
                      across the analyzed
                      questions.
                    </h2>

                    <p>
                      These are existing
                      topic labels from the
                      question archive, not
                      predicted exam
                      guarantees.
                    </p>
                  </div>
                </header>

                <div className="pi-topic-list">
                  {data.topicSignals.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          item.topic
                        }
                      >
                        <span className="pi-topic-rank">
                          {index + 1}
                        </span>

                        <span className="pi-topic-name">
                          {
                            item.topic
                          }
                        </span>

                        <strong>
                          {
                            item.count
                          }
                        </strong>
                      </div>
                    )
                  )}
                </div>
              </section>
            )}

            {/* =============================================
                CLUSTERS
            ============================================= */}

            <section className="pi-cluster-section">
              <header className="pi-section-head pi-cluster-section-head">
                <div>
                  <span className="pi-eyebrow">
                    <GitCompareArrows
                      size={14}
                    />
                    Repeated PYQs
                  </span>

                  <h2>
                    {
                      filteredClusters.length
                    }{' '}
                    matching repeat
                    {filteredClusters.length ===
                    1
                      ? ''
                      : ' clusters'}
                  </h2>

                  <p>
                    Open a cluster to
                    compare the individual
                    question appearances.
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

              {filteredClusters.length ? (
                <div className="pi-cluster-list">
                  {filteredClusters.map(
                    (
                      cluster,
                      index
                    ) => (
                      <ClusterCard
                        key={`${cluster.representativeQuestionId}-${cluster.occurrenceCount}`}
                        cluster={
                          cluster
                        }
                        index={
                          index
                        }
                      />
                    )
                  )}
                </div>
              ) : (
                <section className="pi-no-clusters">
                  <span>
                    <GitCompareArrows
                      size={28}
                    />
                  </span>

                  <h3>
                    No matching repeat
                    clusters.
                  </h3>

                  <p>
                    {search
                      ? 'Try a broader search term or clear the cluster search.'
                      : 'Try lowering the similarity threshold, or add more previous-year papers to the archive.'}
                  </p>

                  {search && (
                    <button
                      type="button"
                      onClick={() =>
                        setSearch('')
                      }
                    >
                      Clear Search
                    </button>
                  )}
                </section>
              )}
            </section>

            {/* =============================================
                METHODOLOGY
            ============================================= */}

            <details className="pi-method">
              <summary>How matching works</summary>
              <p>
                Exact clusters share highly matching wording. Similar clusters
                meet the selected similarity threshold.
              </p>
            </details>
          </>
        )}
      </div>
    </main>
  );
}
