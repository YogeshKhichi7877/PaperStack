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
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  FileQuestion,
  FileStack,
  Gauge,
  GraduationCap,
  LayoutDashboard,
  Library,
  Printer,
  Target,
  Upload,
} from 'lucide-react';

import {
  getSemesterSurvivalOptions,
  getSemesterSurvivalPack,
} from '../services/semesterSurvivalApi';
import { OFFICIAL_BRANCHES } from '../config/branches';

import './SemesterSurvivalPage.css';
import QuestionText from '../components/QuestionText';

/* =========================================================
   PREFERENCES
========================================================= */

function preferredBranch() {
  try {
    return (
      localStorage.getItem(
        'paperstack_preferred_branch'
      ) || 'CSE'
    );
  } catch {
    return 'CSE';
  }
}

function preferredSemester() {
  try {
    const value = Number(
      localStorage.getItem(
        'paperstack_preferred_semester'
      )
    );

    return Number.isFinite(value) &&
      value >= 1 &&
      value <= 8
      ? value
      : 5;
  } catch {
    return 5;
  }
}

/* =========================================================
   CHECKLIST
========================================================= */

function checklistKey(
  branch,
  semester,
  examType
) {
  return [
    'paperstack_survival',
    branch,
    `sem${semester}`,
    examType || 'all',
  ].join('_');
}

function readChecklist(
  branch,
  semester,
  examType
) {
  try {
    const raw = localStorage.getItem(
      checklistKey(
        branch,
        semester,
        examType
      )
    );

    const parsed = raw
      ? JSON.parse(raw)
      : [];

    return new Set(
      Array.isArray(parsed)
        ? parsed
        : []
    );
  } catch {
    return new Set();
  }
}

/* =========================================================
   HELPERS
========================================================= */

function kindLabel(kind) {
  const labels = {
    question_paper: 'PYQs',
    solution: 'Solutions',
    notes: 'Notes',
    formula_sheet: 'Formula Sheets',
    assignment: 'Assignments',
    lab_material: 'Labs',
    quiz: 'Quizzes',
    viva_questions: 'Viva',
    important_questions: 'Important Qs',
    syllabus: 'Syllabus',
    revision_sheet: 'Revision',
    other: 'Other',
  };

  return labels[kind] || kind;
}

function formatCount(value) {
  return Number(value || 0).toLocaleString(
    'en-IN'
  );
}

/* =========================================================
   SUMMARY CARD
========================================================= */

function SummaryCard({
  icon: Icon,
  label,
  value,
  caption,
  tone = 'teal',
}) {
  return (
    <article
      className={`sp-summary-card sp-summary-${tone}`}
    >
      <span className="sp-summary-icon">
        <Icon size={22} />
      </span>

      <div>
        <span className="sp-summary-label">
          {label}
        </span>

        <strong>{value}</strong>

        <p>{caption}</p>
      </div>
    </article>
  );
}

/* =========================================================
   MISSION ITEM
========================================================= */

function MissionItem({
  item,
  index,
}) {
  return (
    <article className="sp-mission-card">
      <div className="sp-mission-number">
        {index + 1}
      </div>

      <div className="sp-mission-content">
        <div className="sp-mission-top">
          <div>
            <strong>
              {item.subject}
            </strong>

            <span>
              {item.subjectCode}
            </span>
          </div>

          <div className="sp-support-score">
            {item.supportScore}
            <small>/100</small>
          </div>
        </div>

        <div className="sp-support-track">
          <span
            style={{
              width: `${Math.min(
                100,
                Math.max(
                  0,
                  Number(
                    item.supportScore || 0
                  )
                )
              )}%`,
            }}
          />
        </div>

        <p>{item.reason}</p>

        <Link
          className="sp-mission-action"
          to={`/subject/${encodeURIComponent(item.subjectCode)}`}
        >
          Study
          <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}

/* =========================================================
   SUBJECT CARD
========================================================= */

function SubjectCard({
  subject,
  done,
  onToggle,
}) {
  const [expanded, setExpanded] = useState(false);
  const topTopics =
    subject?.intelligence?.topTopics || [];

  const mustPractice =
    subject?.intelligence
      ?.mustPractice || [];

  const resources =
    subject?.resources?.byKind || {};

  const supportScore = Number(
    subject?.supportScore || 0
  );

  return (
    <article
      className={`sp-subject ${
        done ? 'done' : ''
      }`}
    >
      <header className="sp-subject-header">
        <div className="sp-subject-title">
          <div className="sp-subject-code">
            {subject.shortCode ||
              subject.subjectCode}
          </div>

          <div>
            <span>
              {subject.subjectCode}
            </span>

            <h3>{subject.subject}</h3>

            <p>
              {subject.supportBand ||
                'Archive support'}
            </p>
          </div>
        </div>

        <div className="sp-subject-header-right">
          <div className="sp-subject-support">
            <span>
              Archive support
            </span>

            <strong>
              {supportScore}
              <small>/100</small>
            </strong>
          </div>

          <button
            type="button"
            className={`sp-revised-button ${
              done ? 'is-done' : ''
            } sp-no-print`}
            onClick={() =>
              onToggle(
                subject.subjectCode
              )
            }
          >
            {done ? (
              <>
                <CheckCircle2
                  size={16}
                />
                Revised
              </>
            ) : (
              <>
                <Check size={16} />
                Mark revised
              </>
            )}
          </button>

          <button
            type="button"
            className="sp-subject-expand sp-no-print"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Less' : 'More'}
            <ChevronRight size={15} />
          </button>
        </div>
      </header>

      <div className="sp-subject-support-bar">
        <span
          style={{
            width: `${Math.min(
              100,
              Math.max(
                0,
                supportScore
              )
            )}%`,
          }}
        />
      </div>

      {expanded && <>
      <div className="sp-subject-stats">
        <div>
          <span>PYQ Archive</span>

          <strong>
            {subject.archive
              ?.completionPct || 0}
            %
          </strong>
        </div>

        <div>
          <span>Questions</span>

          <strong>
            {formatCount(
              subject.questions?.total
            )}
          </strong>
        </div>

        <div>
          <span>Solutions</span>

          <strong>
            {formatCount(
              subject.questions
                ?.solutionsReady
            )}
          </strong>
        </div>

        <div>
          <span>
            Resource Types
          </span>

          <strong>
            {formatCount(
              subject.resources
                ?.kindsAvailable
            )}
          </strong>
        </div>

        <div>
          <span>
            Repeat Clusters
          </span>

          <strong>
            {formatCount(
              subject.intelligence
                ?.repeatedClusters
            )}
          </strong>
        </div>
      </div>

      <div className="sp-subject-body">
        {/* IMPORTANT TOPICS */}

        <section className="sp-subject-panel">
          <header>
            <Target size={18} />

            <div>
              <h4>
                Important topic signals
              </h4>

              <p>
                Topics showing useful PYQ
                patterns.
              </p>
            </div>
          </header>

          {topTopics.length ? (
            <div className="sp-topic-list">
              {topTopics.map(
                (topic) => (
                  <span
                    key={topic.topic}
                  >
                    <b>
                      {topic.topic}
                    </b>

                    <small>
                      Score {topic.score}
                    </small>
                  </span>
                )
              )}
            </div>
          ) : (
            <p className="sp-muted">
              More extracted questions are
              needed before topic signals
              can be shown.
            </p>
          )}
        </section>

        {/* RESOURCE SHELF */}

        <section className="sp-subject-panel">
          <header>
            <Library size={18} />

            <div>
              <h4>
                Resource shelf
              </h4>

              <p>
                Everything PaperStack has
                for this subject.
              </p>
            </div>
          </header>

          {Object.keys(resources).length ? (
            <div className="sp-resource-list">
              {Object.entries(
                resources
              ).map(
                ([kind, count]) => (
                  <span key={kind}>
                    <b>
                      {kindLabel(kind)}
                    </b>

                    <small>
                      {count}
                    </small>
                  </span>
                )
              )}
            </div>
          ) : (
            <p className="sp-muted">
              No indexed resources are
              available yet.
            </p>
          )}
        </section>

        {/* MUST PRACTICE */}

        <section className="sp-subject-panel">
          <header>
            <FileQuestion size={18} />

            <div>
              <h4>
                Must-practice PYQs
              </h4>

              <p>
                Useful questions worth
                opening before the exam.
              </p>
            </div>
          </header>

          {mustPractice.length ? (
            <div className="sp-practice-list">
              {mustPractice.map(
                (question) => (
                  <Link
                    key={question._id}
                    to={`/questions/${question._id}`}
                  >
                    <div>
                      <strong>
                        {question.questionLabel ||
                          'PYQ'}
                      </strong>

                      {question.marks !=
                        null && (
                        <span>
                          {
                            question.marks
                          }{' '}
                          marks
                        </span>
                      )}
                    </div>

                    <p>
                      <QuestionText inline>{question.questionText}</QuestionText>
                    </p>

                    <ChevronRight
                      size={16}
                    />
                  </Link>
                )
              )}
            </div>
          ) : (
            <p className="sp-muted">
              Must-practice questions will
              appear when intelligence data
              becomes available.
            </p>
          )}
        </section>
      </div>

      {subject.archive?.missing > 0 && (
        <div className="sp-gap">
          <div>
            <CircleAlert size={18} />

            <span>
              <strong>
                Archive gap detected
              </strong>

              <small>
                {subject.archive.missing}{' '}
                tracked{' '}
                {subject.archive
                  .missing === 1
                  ? 'paper slot is'
                  : 'paper slots are'}{' '}
                still missing.
              </small>
            </span>
          </div>

          {subject.missingSlots?.[0] && (
            <Link
              className="sp-no-print"
              to={
                subject.missingSlots[0]
                  .contributionUrl
              }
            >
              Contribute paper
              <ArrowRight size={14} />
            </Link>
          )}
        </div>
      )}
      </>}

      <nav className="sp-tools sp-no-print">
        <Link
          className="sp-tool-primary"
          to={subject.links.subjectHub}
        >
          <BookOpen size={15} />
          Subject Hub
        </Link>

        <Link
          to={subject.links.revision}
        >
          Revision
        </Link>

        <Link
          to={subject.links.warRoom}
        >
          Exam Planner
        </Link>

        <Link to={subject.links.ask}>
          Ask PaperStack
        </Link>

        <Link
          to={subject.links.mocks}
        >
          Mock Exam
        </Link>
      </nav>
    </article>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function SemesterSurvivalPage({
  toast,
}) {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [options, setOptions] =
    useState({
      branches: OFFICIAL_BRANCHES.map(({ key }) => key),
      semesters: [
        1, 2, 3, 4, 5, 6, 7,
      ],
      examTypes: [
        'Mid-Sem',
        'End-Sem',
      ],
    });

  const [branch, setBranch] =
    useState(
      searchParams.get('branch') ||
        preferredBranch()
    );

  const [
    semester,
    setSemester,
  ] = useState(
    Number(
      searchParams.get('semester') ||
        preferredSemester()
    )
  );

  const [
    examType,
    setExamType,
  ] = useState(
    searchParams.get('examType') ||
      ''
  );

  const [pack, setPack] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [checked, setChecked] =
    useState(() =>
      readChecklist(
        branch,
        semester,
        examType
      )
    );

  /* =========================================================
     OPTIONS
  ========================================================= */

  useEffect(() => {
    getSemesterSurvivalOptions()
      .then((data) => {
        if (data) {
          setOptions((current) => ({
            ...current,
            ...data,
          }));
        }
      })
      .catch((error) => {
        console.error(
          'Survival options failed:',
          error
        );
      });
  }, []);

  /* =========================================================
     LOAD PACK
  ========================================================= */

  useEffect(() => {
    try {
      localStorage.setItem(
        'paperstack_preferred_branch',
        branch
      );

      localStorage.setItem(
        'paperstack_preferred_semester',
        String(semester)
      );
    } catch {}

    setChecked(
      readChecklist(
        branch,
        semester,
        examType
      )
    );

    const params = {
      branch,
      semester: String(semester),
    };

    if (examType) {
      params.examType =
        examType;
    }

    setSearchParams(params, {
      replace: true,
    });

    let mounted = true;

    setLoading(true);

    getSemesterSurvivalPack({
      branch,
      semester,
      examType,
    })
      .then((data) => {
        if (mounted) {
          setPack(data || null);
        }
      })
      .catch((error) => {
        console.error(
          'Semester survival pack failed:',
          error
        );

        if (mounted) {
          setPack(null);
        }

        toast?.(
          error.response?.data
            ?.error ||
            'Could not build the semester survival pack.',
          'error'
        );
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    branch,
    semester,
    examType,
    setSearchParams,
    toast,
  ]);

  /* =========================================================
     PROGRESS
  ========================================================= */

  const completedCount =
    useMemo(
      () =>
        pack?.subjects?.filter(
          (subject) =>
            checked.has(
              subject.subjectCode
            )
        ).length || 0,
      [pack, checked]
    );

  const progress =
    pack?.subjects?.length
      ? Math.round(
          (completedCount /
            pack.subjects.length) *
            100
        )
      : 0;

  const selectedExam =
    examType || 'Full semester';

  function toggleSubject(
    subjectCode
  ) {
    const next = new Set(checked);

    if (next.has(subjectCode)) {
      next.delete(subjectCode);
    } else {
      next.add(subjectCode);
    }

    setChecked(next);

    try {
      localStorage.setItem(
        checklistKey(
          branch,
          semester,
          examType
        ),
        JSON.stringify([...next])
      );
    } catch {}
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main className="sp-page">
      <Helmet>
        <title>
          Semester Survival -
          PaperStack
        </title>

        <meta
          name="description"
          content="Organize your semester using PaperStack PYQs, revision intelligence, solutions, mocks, resources and archive coverage."
        />
      </Helmet>

      <div className="sp-shell">
        {/* =================================================
            HERO
        ================================================= */}

        <section className="sp-hero">
          <div className="sp-hero-copy">
            <span className="sp-eyebrow">
              <GraduationCap
                size={16}
              />
              Semester Survival
            </span>

            <h1>
              What should you
              <br />

              <span>
                study next?
              </span>
            </h1>

            <p>
              See priority subjects first, then open the exact study tool you need.
            </p>

            <div className="sp-hero-context">
              <span>
                <b>{branch}</b>
                Branch
              </span>

              <span>
                <b>
                  Semester {semester}
                </b>
                Current semester
              </span>

              <span>
                <b>{selectedExam}</b>
                Exam focus
              </span>
            </div>
          </div>

          <div className="sp-progress-card">
            <div
              className="sp-progress-ring"
              style={{
                background: `conic-gradient(
                  #00858d 0% ${progress}%,
                  #d7eeee ${progress}% 100%
                )`,
              }}
            >
              <div>
                <strong>
                  {progress}%
                </strong>

                <span>revised</span>
              </div>
            </div>

            <div className="sp-progress-copy">
              <strong>
                {completedCount}/
                {pack?.subjects?.length ||
                  0}
              </strong>

              <span>
                subjects marked complete
              </span>
            </div>
          </div>
        </section>

        {/* =================================================
            CONTROLS
        ================================================= */}

        <section className="sp-controls sp-no-print">
          <div className="sp-control-group">
            <label>
              Branch

              <select
                value={branch}
                onChange={(event) =>
                  setBranch(
                    event.target.value
                  )
                }
              >
                {options.branches.map(
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
              Semester

              <select
                value={semester}
                onChange={(event) =>
                  setSemester(
                    Number(
                      event.target.value
                    )
                  )
                }
              >
                {options.semesters.map(
                  (item) => (
                    <option
                      key={item}
                      value={item}
                    >
                      Semester {item}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              Exam Focus

              <select
                value={examType}
                onChange={(event) =>
                  setExamType(
                    event.target.value
                  )
                }
              >
                <option value="">
                  All exams
                </option>

                {options.examTypes.map(
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
          </div>

          <div className="sp-control-actions">
            <button
              type="button"
              onClick={() =>
                window.print()
              }
            >
              <Printer size={16} />
              Print
            </button>

            <Link to="/dashboard">
              <LayoutDashboard
                size={16}
              />
              Dashboard
            </Link>
          </div>
        </section>

        {/* =================================================
            STATE
        ================================================= */}

        {loading ? (
          <div className="sp-state">
            <span className="sp-loader" />

            <strong>
              Building your semester
              workspace…
            </strong>

            <p>
              Combining papers, questions,
              resources and archive
              intelligence.
            </p>
          </div>
        ) : !pack ? (
          <div className="sp-state">
            <CircleAlert size={34} />

            <strong>
              Semester data couldn't be
              loaded.
            </strong>

            <p>
              Try changing the branch or
              semester and reload the page.
            </p>
          </div>
        ) : (
          <>
            {/* =============================================
                SUMMARY
            ============================================= */}

            <section className="sp-summary">
              <SummaryCard
                icon={Gauge}
                label="Archive coverage"
                value={`${pack.summary.archiveCompletionPct}%`}
                caption={`${pack.summary.availableSlots}/${pack.summary.expectedSlots} paper slots available`}
              />

              <SummaryCard
                icon={FileQuestion}
                label="Questions"
                value={formatCount(
                  pack.summary
                    .extractedQuestions
                )}
                caption={`Across ${pack.summary.subjects} subjects`}
                tone="blue"
              />

              <SummaryCard
                icon={CheckCircle2}
                label="Solution-ready"
                value={formatCount(
                  pack.summary
                    .questionsWithSolutions
                )}
                caption="Questions with approved solutions"
                tone="green"
              />

              <SummaryCard
                icon={FileStack}
                label="Study resources"
                value={formatCount(
                  pack.summary
                    .totalResources
                )}
                caption="PYQs, notes, solutions and more"
                tone="yellow"
              />

              <SummaryCard
                icon={CircleAlert}
                label="Archive gaps"
                value={formatCount(
                  pack.summary
                    .missingSlots
                )}
                caption="Tracked paper slots still missing"
                tone="red"
              />
            </section>

            {/* =============================================
                MISSION ORDER
            ============================================= */}

            <section className="sp-mission">
              <div className="sp-section-head">
                <div>
                  <span className="sp-eyebrow">
                    <Target
                      size={15}
                    />
                    Where to start
                  </span>

                  <h2>
                    Study these subjects first.
                  </h2>

                  <p>
                    Priority is based on archive coverage and available study support.
                  </p>
                </div>

                <small>
                  Archive support is not a
                  judgement of your ability
                  or subject difficulty.
                </small>
              </div>

              <div className="sp-mission-grid">
                {(pack.missionOrder ||
                  []).map(
                  (item, index) => (
                    <MissionItem
                      key={
                        `${item.subjectCode}-${index}`
                      }
                      item={item}
                      index={index}
                    />
                  )
                )}
              </div>
            </section>

            {/* =============================================
                SUBJECT COMMAND CENTER
            ============================================= */}

            <section className="sp-subjects">
              <div className="sp-section-head">
                <div>
                  <span className="sp-eyebrow">
                    <BookOpen size={15} />
                    Subject workspace
                  </span>

                  <h2>
                    Your semester,
                    subject by subject.
                  </h2>

                  <p>
                    Open only what you need:
                    papers, revision,
                    important topics,
                    questions and mocks.
                  </p>
                </div>

                <div className="sp-section-progress">
                  <ClipboardCheck
                    size={18}
                  />

                  <span>
                    <strong>
                      {completedCount}
                    </strong>
                    {' / '}
                    {pack.subjects?.length ||
                      0}{' '}
                    revised
                  </span>
                </div>
              </div>

              <div className="sp-subject-list">
                {(pack.subjects ||
                  []).map((subject, index) => (
                  <SubjectCard
                    key={
                      `${subject.subjectCode}-${index}`
                    }
                    subject={subject}
                    done={checked.has(
                      subject.subjectCode
                    )}
                    onToggle={
                      toggleSubject
                    }
                  />
                ))}
              </div>
            </section>

            {/* =============================================
                MISSING PAPERS
            ============================================= */}

            {pack.missingSlots
              ?.length > 0 && (
              <section className="sp-missing">
                <div className="sp-section-head">
                  <div>
                    <span className="sp-eyebrow">
                      <Upload size={15} />
                      Help your batch
                    </span>

                    <h2>
                      Papers still missing
                      from this semester.
                    </h2>

                    <p>
                      If you have one of
                      these papers, adding
                      it improves this
                      survival pack for
                      everyone.
                    </p>
                  </div>

                  <Link
                    className="sp-missing-main-link sp-no-print"
                    to="/contribute"
                  >
                    Contribute Paper
                    <ArrowRight
                      size={15}
                    />
                  </Link>
                </div>

                <div className="sp-missing-grid">
                  {pack.missingSlots
                    .slice(0, 12)
                    .map((slot) => (
                      <article
                        key={[
                          slot.subjectCode,
                          slot.year,
                          slot.examType,
                        ].join('-')}
                      >
                        <span className="sp-missing-icon">
                          <FileQuestion
                            size={18}
                          />
                        </span>

                        <div>
                          <strong>
                            {slot.subject}
                          </strong>

                          <span>
                            {
                              slot.subjectCode
                            }
                            {' · '}
                            {slot.year}
                            {' · '}
                            {slot.examType}
                          </span>
                        </div>

                        <Link
                          className="sp-no-print"
                          to={
                            slot.contributionUrl
                          }
                        >
                          Add
                          <ArrowRight
                            size={14}
                          />
                        </Link>
                      </article>
                    ))}
                </div>
              </section>
            )}

            {/* =============================================
                METHODOLOGY
            ============================================= */}

            <section className="sp-methodology">
              <div className="sp-methodology-icon">
                <BarChart3 size={20} />
              </div>

              <div>
                <strong>
                  What does “archive
                  support” mean?
                </strong>

                <p>
                  {
                    pack.methodology
                      .supportScore
                  }
                </p>

                <small>
                  {
                    pack.methodology
                      .disclaimer
                  }
                </small>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
