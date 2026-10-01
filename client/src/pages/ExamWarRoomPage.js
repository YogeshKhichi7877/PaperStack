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
  AlertTriangle,
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  Clock3,
  Crosshair,
  FileQuestion,
  Flame,
  GraduationCap,
  History,
  ListChecks,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TimerReset,
  TrendingUp,
  Zap,
} from 'lucide-react';

import {
  getExamWarRoom,
  getExamWarRoomSubjects,
} from '../services/examWarRoomApi';

import {
  askSelectedQuestion,
} from '../services/questionAssistantApi';

import {
  mockMistakes,
  mockWeaknesses,
  readMockEvidence,
} from '../utils/studyEvidence';

import {
  battlePlan,
  examMinutes,
  rankActions,
  readinessBreakdown,
} from '../utils/warRoomPlan';

import './ExamWarRoomPage.css';
import { useStudentProfile } from '../context/StudentProfileContext';
import { preferredSubject, prioritizeSubjects } from '../utils/semesterPersonalization';

const MathAnswer = React.lazy(
  () =>
    import(
      '../components/MathAnswer'
    )
);

/* =========================================================
   STORAGE
========================================================= */

function keyFor(
  subjectCode,
  examType,
  part
) {
  return `paperstack_war_room${
    part ? `_${part}` : ''
  }_${
    subjectCode || 'subject'
  }_${
    examType || 'all'
  }`;
}

function readJson(
  key,
  fallback
) {
  try {
    const raw =
      localStorage.getItem(key);

    return raw
      ? JSON.parse(raw)
      : fallback;
  } catch {
    return fallback;
  }
}

/* =========================================================
   HELPERS
========================================================= */

function countdown(minutes) {
  if (minutes == null) {
    return 'Not set';
  }

  if (minutes <= 0) {
    return 'Exam time';
  }

  const days =
    Math.floor(
      minutes / 1440
    );

  const hours =
    Math.floor(
      (minutes % 1440) /
        60
    );

  const mins =
    minutes % 60;

  if (days) {
    return `${days}d ${hours}h`;
  }

  if (hours) {
    return `${hours}h ${mins}m`;
  }

  return `${mins}m`;
}

function formatTimer(seconds) {
  const safe =
    Math.max(
      0,
      Number(seconds || 0)
    );

  const minutes =
    Math.floor(
      safe / 60
    );

  const secs =
    safe % 60;

  return `${String(
    minutes
  ).padStart(2, '0')}:${String(
    secs
  ).padStart(2, '0')}`;
}

function readinessTone(value) {
  if (value == null) {
    return 'neutral';
  }

  if (value >= 75) {
    return 'good';
  }

  if (value >= 50) {
    return 'developing';
  }

  return 'attention';
}

function weaknessLabel(
  accuracy
) {
  if (accuracy < 60) {
    return 'Needs attention';
  }

  if (accuracy < 75) {
    return 'Developing';
  }

  return 'Strong';
}

/* =========================================================
   STATUS STAT
========================================================= */

function WarStat({
  icon: Icon,
  label,
  value,
  caption,
  tone = 'teal',
}) {
  return (
    <article
      className={`wr-stat wr-stat-${tone}`}
    >
      <span className="wr-stat-icon">
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
   MAIN PAGE
========================================================= */

export default function ExamWarRoomPage({
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
    examType,
    setExamType,
  ] = useState(
    searchParams.get(
      'examType'
    ) || ''
  );

  const [
    minutes,
    setMinutes,
  ] = useState(
    Number(
      searchParams.get(
        'minutes'
      )
    ) || 60
  );

  const [
    room,
    setRoom,
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
    completed,
    setCompleted,
  ] = useState(
    new Set()
  );

  const [
    examTime,
    setExamTime,
  ] = useState('');

  const [
    now,
    setNow,
  ] = useState(
    Date.now()
  );

  const [
    planOffset,
    setPlanOffset,
  ] = useState(0);

  const [
    manualEmergency,
    setManualEmergency,
  ] = useState(false);

  const [
    drillMinutes,
    setDrillMinutes,
  ] = useState(0);

  const [
    emergencyReveal,
    setEmergencyReveal,
  ] = useState(false);

  const [
    timerLeft,
    setTimerLeft,
  ] = useState(
    minutes * 60
  );

  const [
    timerRunning,
    setTimerRunning,
  ] = useState(false);

  const [
    generatedAnswer,
    setGeneratedAnswer,
  ] = useState(null);

  const [
    answerLoading,
    setAnswerLoading,
  ] = useState(false);

  /* =========================================================
     SUBJECTS
  ========================================================= */

  useEffect(() => {
    let active = true;

    getExamWarRoomSubjects()
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
        if (!active) {
          return;
        }

        const message =
          error.response?.data
            ?.error ||
          'Could not load Exam Planner subjects.';

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
  }, [semester, toast]);

  /* =========================================================
     LOCAL STATE
  ========================================================= */

  useEffect(() => {
    setCompleted(
      new Set(
        readJson(
          keyFor(
            subjectCode,
            examType,
            ''
          ),
          []
        )
      )
    );

    try {
      setExamTime(
        localStorage.getItem(
          keyFor(
            subjectCode,
            examType,
            'exam_time'
          )
        ) || ''
      );
    } catch {
      setExamTime('');
    }

    setPlanOffset(0);
    setManualEmergency(false);
    setDrillMinutes(0);
    setEmergencyReveal(false);
    setGeneratedAnswer(null);
  }, [
    subjectCode,
    examType,
  ]);

  /* =========================================================
     LOAD WAR ROOM
  ========================================================= */

  useEffect(() => {
    if (!subjectCode) {
      setLoading(false);
      setRoom(null);

      return;
    }

    let active = true;

    setLoading(true);

    const params = {
      subjectCode,
      minutes:
        String(minutes),
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

    getExamWarRoom(
      subjectCode,
      {
        examType,
        minutes,
      }
    )
      .then((data) => {
        if (!active) {
          return;
        }

        setRoom(data);
        setLoadError('');
      })

      .catch((error) => {
        if (!active) {
          return;
        }

        const message =
          error.response?.data
            ?.error ||
          'Could not prepare the Exam Planner.';

        setRoom(null);
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
    minutes,
    setSearchParams,
    toast,
  ]);

  /* =========================================================
     CLOCK
  ========================================================= */

  useEffect(() => {
    const id =
      setInterval(
        () =>
          setNow(
            Date.now()
          ),
        30000
      );

    return () =>
      clearInterval(id);
  }, []);

  useEffect(() => {
    setTimerRunning(false);

    setTimerLeft(
      minutes * 60
    );
  }, [minutes]);

  useEffect(() => {
    if (
      !timerRunning ||
      timerLeft <= 0
    ) {
      return undefined;
    }

    const id =
      setInterval(
        () =>
          setTimerLeft(
            (value) =>
              Math.max(
                0,
                value - 1
              )
          ),
        1000
      );

    return () =>
      clearInterval(id);
  }, [
    timerRunning,
    timerLeft,
  ]);

  /* =========================================================
     EVIDENCE
  ========================================================= */

  const history =
    useMemo(
      () =>
        readMockEvidence(
          subjectCode
        ),
      [subjectCode]
    );

  const weaknesses =
    useMemo(
      () =>
        mockWeaknesses(
          history
        ),
      [history]
    );

  const mistakes =
    useMemo(
      () =>
        mockMistakes(
          history
        ),
      [history]
    );

  const actions =
    useMemo(
      () =>
        rankActions(
          room?.command
            ?.actions ||
            [],
          completed,
          weaknesses
        ),
      [
        room,
        completed,
        weaknesses,
      ]
    );

  const nextAction =
    actions[0] || null;

  const nextPractice =
    (
      room?.missions
        ?.practice || []
    ).find(
      (item) =>
        item.questionId ===
        nextAction?.questionId
    );

  const revisionDone =
    useMemo(() => {
      const key =
        `paperstack_revision_checklist_v2_${
          localStorage.getItem(
            'username'
          ) || 'guest'
        }_${
          subjectCode ||
          'subject'
        }_${
          examType ||
          'all'
        }`;

      return readJson(
        key,
        {}
      );
    }, [
      subjectCode,
      examType,
    ]);

  const readiness =
    useMemo(
      () =>
        readinessBreakdown(
          room,
          completed,
          revisionDone,
          history
        ),
      [
        room,
        completed,
        revisionDone,
        history,
      ]
    );

  const remaining =
    examMinutes(
      examTime,
      now
    );

  const emergency =
    manualEmergency ||
    (
      remaining != null &&
      remaining <= 180
    );

  const plan =
    battlePlan(
      actions,
      remaining == null
        ? minutes
        : Math.min(
            minutes,
            Math.max(
              1,
              remaining
            )
          ),
      planOffset
    );

  const revision =
    room?.command
      ?.revision || {};

  const revisionUrl =
    `/revision-sheets?subjectCode=${encodeURIComponent(
      subjectCode
    )}${
      examType
        ? `&examType=${encodeURIComponent(
            examType
          )}`
        : ''
    }`;

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

  const drills =
    useMemo(() => {
      const weakByTopic =
        new Map(
          weaknesses.map(
            (item) => [
              String(
                item.topic
              )
                .toLowerCase()
                .trim(),

              item,
            ]
          )
        );

      const ranked = [
        ...(
          room?.missions
            ?.practice ||
          []
        ),
      ].sort(
        (a, b) => {
          const score =
            (item) =>
              Number(
                item.revisionScore ||
                  0
              ) +
              Math.max(
                0,
                70 -
                  (
                    weakByTopic.get(
                      String(
                        item.matchedTopic ||
                          ''
                      )
                        .toLowerCase()
                        .trim()
                    )?.accuracy ??
                    70
                  )
              );

          return (
            score(b) -
            score(a)
          );
        }
      );

      const count =
        drillMinutes === 5
          ? 1
          : drillMinutes === 10
          ? 2
          : drillMinutes === 20
          ? 4
          : 0;

      return ranked.slice(
        0,
        count
      );
    }, [
      room,
      weaknesses,
      drillMinutes,
    ]);

  const emergencyRecall =
    revision.rapidRecall?.[0];

  const readinessPercent =
    readiness.percentage;

  const readinessClass =
    readinessTone(
      readinessPercent
    );

  /* =========================================================
     ACTIONS
  ========================================================= */

  function toggleComplete(id) {
    const next =
      new Set(
        completed
      );

    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }

    setCompleted(next);

    try {
      localStorage.setItem(
        keyFor(
          subjectCode,
          examType,
          ''
        ),
        JSON.stringify(
          [...next]
        )
      );
    } catch {}
  }

  function updateExamTime(
    value
  ) {
    setExamTime(value);

    try {
      const key =
        keyFor(
          subjectCode,
          examType,
          'exam_time'
        );

      if (value) {
        localStorage.setItem(
          key,
          value
        );
      } else {
        localStorage.removeItem(
          key
        );
      }
    } catch {}
  }

  function actionHref(
    action
  ) {
    return (
      action?.href ||
      revisionUrl
    );
  }

  async function generatePracticeAnswer(
    questionId
  ) {
    if (
      !questionId ||
      answerLoading
    ) {
      return;
    }

    setAnswerLoading(true);
    setGeneratedAnswer(null);

    try {
      const result =
        await askSelectedQuestion(
          questionId,
          {
            query:
              'Generate a complete exam-ready worked answer for this question. Explain the concept first in simple language, then solve it step by step. Show formulas, substitutions, intermediate calculations, mathematical symbols, units where relevant, and a clearly identified final answer. For theory questions, structure the answer with definition, key points, explanation, example and exam-ready conclusion where appropriate.',
          }
        );

      setGeneratedAnswer({
        questionId,
        text:
          result.answer,
        mode:
          result.mode,
      });
    } catch (error) {
      toast?.(
        error.response?.data
          ?.error ||
          'Could not prepare a practice answer.',
        'error'
      );
    } finally {
      setAnswerLoading(false);
    }
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <main className="wr-page">
      <Helmet>
        <title>
          Exam Planner -
          PaperStack
        </title>

        <meta
          name="description"
          content="A time-aware exam command center that turns PaperStack archive evidence and personal mock performance into an actionable study plan."
        />
      </Helmet>

      <div className="wr-shell">
        {/* =================================================
            HERO
        ================================================= */}

        <section className="wr-hero">
          <div className="wr-hero-copy">
            <span className="wr-eyebrow">
              <Crosshair
                size={15}
              />

              Exam Planner
            </span>

            <h1>
              Stop wondering
              what to study.
              <br />

              <span>
                Execute the plan.
              </span>
            </h1>

            <p>Turn your syllabus and PYQs into a focused revision plan.</p>

            <div className="wr-hero-points" hidden>
              <span>
                <CheckCircle2
                  size={14}
                />

                Time-aware priorities
              </span>

              <span>
                <CheckCircle2
                  size={14}
                />

                Mock weakness tracking
              </span>

              <span>
                <CheckCircle2
                  size={14}
                />

                Rapid drills
              </span>

              <span>
                <CheckCircle2
                  size={14}
                />

                Worked practice help
              </span>
            </div>
          </div>

          <aside
            className={`wr-hero-command wr-readiness-${readinessClass}`}
          >
            <div className="wr-command-label">
              <span>
                Command status
              </span>

              {emergency && (
                <b>
                  <Flame
                    size={12}
                  />
                  Final hours
                </b>
              )}
            </div>

            <strong className="wr-command-code">
              {subjectCode ||
                '—'}
            </strong>

            <p>
              {selectedSubject
                ?.subject ||
                room?.subject
                  ?.subject ||
                'Choose a subject'}
            </p>

            <div className="wr-command-readiness">
              <div>
                <span>
                  Recorded readiness
                </span>

                <strong>
                  {readinessPercent ==
                  null
                    ? '—'
                    : `${readinessPercent}%`}
                </strong>
              </div>

              <div className="wr-command-track">
                <span
                  style={{
                    width: `${
                      readinessPercent ||
                      0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div className="wr-command-meta">
              <span>
                <b>
                  {countdown(
                    remaining
                  )}
                </b>
                Until exam
              </span>

              <span>
                <b>
                  {minutes} min
                </b>
                Focus block
              </span>
            </div>

            <div className="wr-command-actions">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById(
                      'war-next-action'
                    )
                    ?.scrollIntoView({
                      behavior:
                        'smooth',
                    })
                }
              >
                <Target
                  size={14}
                />

                What now?
              </button>

              <button
                type="button"
                className={
                  emergency
                    ? 'is-emergency'
                    : ''
                }
                onClick={() =>
                  setManualEmergency(
                    (value) =>
                      !value
                  )
                }
              >
                <Zap size={14} />

                {emergency
                  ? 'Exit emergency'
                  : 'Emergency mode'}
              </button>
            </div>
          </aside>
        </section>

        {/* =================================================
            CONTROLS
        ================================================= */}

        <section className="wr-controls">
          <div className="wr-control-head">
            <div>
              <Target size={17} />

              <span>
                Start your Exam Planner
              </span>
            </div>

            <small>
              Semester {semester} subjects appear first.
            </small>
          </div>

          <div className="wr-control-grid">
            <label className="wr-subject-control">
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
              >
                {!subjects.length && (
                  <option value="">
                    No extracted
                    subjects
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

                {(
                  selectedSubject
                    ?.examTypes ||
                  []
                ).map(
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
              <span>
                Exam date & time
              </span>

              <input
                type="datetime-local"
                value={examTime}
                onChange={(
                  event
                ) =>
                  updateExamTime(
                    event.target
                      .value
                  )
                }
              />
            </label>

            <label>
              <span>
                Focus window
              </span>

              <select
                value={minutes}
                onChange={(
                  event
                ) =>
                  setMinutes(
                    Number(
                      event.target
                        .value
                    )
                  )
                }
              >
                {[
                  30,
                  45,
                  60,
                  90,
                  120,
                ].map(
                  (value) => (
                    <option
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      {value} minutes
                    </option>
                  )
                )}
              </select>
            </label>
          </div>
        </section>

        {/* =================================================
            STATES
        ================================================= */}

        {loading ? (
          <section className="wr-state">
            <span className="wr-loader" />

            <strong>
              Building your command
              center…
            </strong>

            <p>
              Combining archive evidence,
              revision data and your recent
              mock performance.
            </p>
          </section>
        ) : !room ? (
          <section className="wr-state">
            <CircleAlert
              size={30}
            />

            <strong>
              Exam Planner is not available
              yet.
            </strong>

            <p>
              {loadError ||
                'No archive questions are available for this subject yet.'}
            </p>
          </section>
        ) : (
          <>
            {/* =============================================
                STATUS
            ============================================= */}

            <section className="wr-status-grid">
              <WarStat
                icon={Clock3}
                label="Exam countdown"
                value={countdown(
                  remaining
                )}
                caption={
                  examTime
                    ? 'Based on your selected exam time'
                    : 'Set exam time for live countdown'
                }
              />

              <WarStat
                icon={ShieldCheck}
                label="Recorded readiness"
                value={
                  readinessPercent ==
                  null
                    ? 'No data'
                    : `${readinessPercent}%`
                }
                caption="Based on activity recorded inside PaperStack"
                tone="green"
              />

              <WarStat
                icon={FileQuestion}
                label="Archive questions"
                value={
                  room.summary
                    ?.questionsAnalyzed ||
                  0
                }
                caption="Questions available as study evidence"
                tone="blue"
              />

              <WarStat
                icon={Brain}
                label="Weak topics"
                value={
                  weaknesses.filter(
                    (item) =>
                      item.accuracy <
                      75
                  ).length
                }
                caption="From evaluated mock performance"
                tone="yellow"
              />
            </section>

            {/* =============================================
                EMERGENCY MODE
            ============================================= */}

            {emergency ? (
              <section className="wr-emergency">
                <header className="wr-emergency-head">
                  <div>
                    <span className="wr-emergency-label">
                      <Flame
                        size={14}
                      />

                      Final Hours Protocol
                    </span>

                    <h2>
                      No new chapters.
                      <br />

                      <span>
                        Recall, repair,
                        execute.
                      </span>
                    </h2>

                    <p>
                      PaperStack is reducing
                      the Exam Planner to short,
                      source-backed material
                      because the exam is
                      close.
                    </p>
                  </div>

                  <div className="wr-emergency-clock">
                    <span>
                      Exam in
                    </span>

                    <strong>
                      {countdown(
                        remaining
                      )}
                    </strong>
                  </div>
                </header>

                <div className="wr-emergency-grid">
                  <section>
                    <div className="wr-emergency-section-head">
                      <span>
                        01
                      </span>

                      <div>
                        <h3>
                          Critical formulas
                        </h3>

                        <p>
                          Scan, recall,
                          move on.
                        </p>
                      </div>
                    </div>

                    {revision
                      .lastFiveMinutes
                      ?.formulas
                      ?.length ? (
                      <div className="wr-emergency-formulas">
                        {revision.lastFiveMinutes.formulas.map(
                          (
                            item,
                            index
                          ) => (
                            <div
                              className="wr-formula"
                              key={
                                index
                              }
                            >
                              <Suspense
                                fallback="Loading formula..."
                              >
                                <MathAnswer>
                                  {`$$\n${item.latex}\n$$`}
                                </MathAnswer>
                              </Suspense>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <p className="wr-empty">
                        No approved
                        formulas stored
                        yet.
                      </p>
                    )}
                  </section>

                  <section>
                    <div className="wr-emergency-section-head">
                      <span>
                        02
                      </span>

                      <div>
                        <h3>
                          Definitions
                        </h3>

                        <p>
                          Short theory
                          answers worth
                          recalling.
                        </p>
                      </div>
                    </div>

                    <div className="wr-emergency-definitions">
                      {(
                        revision
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

                            <p>
                              {
                                item.answer
                              }
                            </p>
                          </article>
                        )
                      )}

                      {!revision
                        .lastFiveMinutes
                        ?.definitions
                        ?.length && (
                        <p className="wr-empty">
                          No approved
                          definitions yet.
                        </p>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="wr-emergency-section-head">
                      <span>
                        03
                      </span>

                      <div>
                        <h3>
                          My mistakes
                        </h3>

                        <p>
                          Don't repeat
                          these in the
                          exam.
                        </p>
                      </div>
                    </div>

                    <div className="wr-emergency-mistakes">
                      {mistakes
                        .slice(
                          0,
                          4
                        )
                        .map(
                          (
                            item
                          ) => (
                            <article
                              key={`${item.questionId}-${item.text}`}
                            >
                              <AlertTriangle
                                size={14}
                              />

                              <span>
                                {
                                  item.text
                                }
                              </span>
                            </article>
                          )
                        )}

                      {!mistakes.length && (
                        <p className="wr-empty">
                          No evaluated
                          mock mistakes
                          are saved on
                          this device.
                        </p>
                      )}
                    </div>
                  </section>

                  <section>
                    <div className="wr-emergency-section-head">
                      <span>
                        04
                      </span>

                      <div>
                        <h3>
                          High-frequency
                          concepts
                        </h3>

                        <p>
                          Final topic cues
                          from the archive.
                        </p>
                      </div>
                    </div>

                    <div className="wr-emergency-facts">
                      {(
                        revision
                          .lastFiveMinutes
                          ?.facts || []
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
                </div>

                <section className="wr-emergency-recall">
                  <div className="wr-emergency-recall-head">
                    <div>
                      <span>
                        Rapid recall
                      </span>

                      <strong>
                        Can you answer
                        this without
                        looking?
                      </strong>
                    </div>

                    <GraduationCap
                      size={24}
                    />
                  </div>

                  {emergencyRecall ? (
                    <>
                      <p className="wr-emergency-question">
                        {
                          emergencyRecall.prompt
                        }
                      </p>

                      {emergencyReveal && (
                        <div className="wr-emergency-answer">
                          <React.Suspense fallback={emergencyRecall.answer || 'No approved answer is available yet.'}>
                            <MathAnswer>{emergencyRecall.answer || 'No approved answer is available yet.'}</MathAnswer>
                          </React.Suspense>
                        </div>
                      )}

                      <div className="wr-emergency-actions">
                        <button
                          type="button"
                          onClick={() =>
                            setEmergencyReveal(
                              (value) =>
                                !value
                            )
                          }
                        >
                          {emergencyReveal
                            ? 'Hide answer'
                            : 'Reveal answer'}
                        </button>

                        <Link
                          to={`/questions/${emergencyRecall.questionId}`}
                        >
                          View question
                          <ArrowRight
                            size={13}
                          />
                        </Link>
                      </div>
                    </>
                  ) : (
                    <p className="wr-empty">
                      No recall question
                      available yet.
                    </p>
                  )}
                </section>

                <footer className="wr-emergency-footer">
                  <Link
                    to={
                      revisionUrl
                    }
                  >
                    <BookOpen
                      size={14}
                    />
                    Open rapid revision
                  </Link>

                  <button
                    type="button"
                    onClick={() =>
                      setDrillMinutes(
                        5
                      )
                    }
                  >
                    <Zap
                      size={14}
                    />
                    Start 5 min final drill
                  </button>
                </footer>

                {drillMinutes ===
                  5 && (
                  <div className="wr-emergency-drill">
                    {drills.map(
                      (item) => (
                        <Link
                          key={
                            item.questionId
                          }
                          to={`/questions/${item.questionId}`}
                        >
                          <FileQuestion
                            size={14}
                          />

                          {item.title}

                          <ArrowRight
                            size={13}
                          />
                        </Link>
                      )
                    )}
                  </div>
                )}
              </section>
            ) : (
              <>
                {/* =========================================
                    BRIEFING
                ========================================= */}

                <section className="wr-briefing">
                  <span className="wr-briefing-icon">
                    <Sparkles
                      size={18}
                    />
                  </span>

                  <div>
                    <span>
                      PaperStack briefing
                    </span>

                    <React.Suspense fallback={<p>{room.command?.aiBriefing || room.command?.archiveBriefing}</p>}>
                      <MathAnswer>{room.command?.aiBriefing || room.command?.archiveBriefing}</MathAnswer>
                    </React.Suspense>

                    {history.length >
                      0 &&
                      weaknesses[0] && (
                        <small>
                          Your latest
                          evaluated mock
                          shows{' '}
                          <strong>
                            {
                              weaknesses[0]
                                .topic
                            }
                          </strong>{' '}
                          at{' '}
                          <strong>
                            {
                              weaknesses[0]
                                .accuracy
                            }
                            %
                          </strong>{' '}
                          estimated
                          accuracy.
                        </small>
                      )}

                    {!history.length && (
                      <small>
                        No evaluated mock
                        history is saved
                        on this device,
                        so personal
                        performance is
                        not included yet.
                      </small>
                    )}
                  </div>
                </section>

                {/* =========================================
                    NEXT ACTION
                ========================================= */}

                <section
                  id="war-next-action"
                  className="wr-next"
                >
                  <div className="wr-next-number">
                    01
                  </div>

                  <div className="wr-next-main">
                    <span>
                      Next best action
                    </span>

                    {nextAction ? (
                      <>
                        <h2>
                          {
                            nextAction.title
                          }
                        </h2>

                        <p>
                          {
                            nextAction.reason
                          }

                          {nextAction.weakness
                            ? ` Latest recorded mock accuracy: ${nextAction.weakness.accuracy}%.`
                            : ''}

                          {' '}
                          Estimated focus:{' '}
                          <strong>
                            {
                              nextAction.minutes
                            }{' '}
                            min
                          </strong>
                          .
                        </p>

                        <div className="wr-next-actions">
                          <Link
                            className="wr-primary-link"
                            to={actionHref(
                              nextAction
                            )}
                          >
                            Start now

                            <ArrowRight
                              size={14}
                            />
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              toggleComplete(
                                nextAction.id
                              )
                            }
                          >
                            <Check
                              size={14}
                            />

                            Mark complete
                          </button>

                          {nextPractice &&
                            !nextPractice.approvedSolutionCount && (
                              <button
                                type="button"
                                className="wr-practice-answer-button"
                                disabled={
                                  answerLoading
                                }
                                onClick={() =>
                                  generatePracticeAnswer(
                                    nextPractice.questionId
                                  )
                                }
                              >
                                <Brain
                                  size={14}
                                />

                                {answerLoading
                                  ? 'Preparing answer…'
                                  : 'Explain this question'}
                              </button>
                            )}
                        </div>

                        {generatedAnswer
                          ?.questionId ===
                          nextAction.questionId && (
                          <div className="wr-generated-answer">
                            <header>
                              <Sparkles
                                size={17}
                              />

                              <div>
                                <strong>
                                  PaperStack practice explanation
                                </strong>

                                <span>
                                  Study guidance
                                  generated for
                                  this question.
                                  Verify against
                                  approved material
                                  when available.
                                </span>
                              </div>
                            </header>

                            <div className="wr-generated-answer-body">
                              <Suspense
                                fallback="Preparing formatted answer..."
                              >
                                <MathAnswer>
                                  {
                                    generatedAnswer.text
                                  }
                                </MathAnswer>
                              </Suspense>
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <h2>
                          Archive actions
                          complete.
                        </h2>

                        <p>
                          Review your mock
                          mistakes or take
                          another practice
                          test to create a
                          fresh study
                          signal.
                        </p>

                        <Link
                          className="wr-primary-link"
                          to={
                            revisionUrl
                          }
                        >
                          Open revision
                          workspace

                          <ArrowRight
                            size={14}
                          />
                        </Link>
                      </>
                    )}
                  </div>

                  {nextAction && (
                    <aside className="wr-next-time">
                      <Clock3
                        size={20}
                      />

                      <strong>
                        {
                          nextAction.minutes
                        }
                      </strong>

                      <span>
                        minutes
                      </span>
                    </aside>
                  )}
                </section>

                {/* =========================================
                    PRIORITY BOARD
                ========================================= */}

                <section className="wr-section">
                  <header className="wr-section-head">
                    <div>
                      <span className="wr-eyebrow">
                        <Crosshair
                          size={14}
                        />
                        Priority Board
                      </span>

                      <h2>
                        Where your attention
                        should go.
                      </h2>

                      <p>
                        Archive evidence and
                        mock performance are
                        separated into clear
                        priority lanes.
                      </p>
                    </div>
                  </header>

                  <div className="wr-priority-grid">
                    <article className="wr-priority-now">
                      <header>
                        <span>
                          <Flame
                            size={16}
                          />
                        </span>

                        <div>
                          <strong>
                            Do now
                          </strong>

                          <small>
                            Highest priority
                          </small>
                        </div>
                      </header>

                      <div>
                        {actions
                          .slice(0, 3)
                          .map(
                            (
                              item,
                              index
                            ) => (
                              <Link
                                key={
                                  item.id
                                }
                                to={actionHref(
                                  item
                                )}
                              >
                                <span>
                                  {index +
                                    1}
                                </span>

                                <div>
                                  <strong>
                                    {
                                      item.topic
                                    }
                                  </strong>

                                  <small>
                                    {
                                      item.occurrences
                                    }{' '}
                                    archived
                                    questions
                                  </small>
                                </div>

                                <ChevronRight
                                  size={14}
                                />
                              </Link>
                            )
                          )}

                        {!actions.length && (
                          <p className="wr-empty">
                            No pending
                            archive actions.
                          </p>
                        )}
                      </div>
                    </article>

                    <article className="wr-priority-soon">
                      <header>
                        <span>
                          <History
                            size={16}
                          />
                        </span>

                        <div>
                          <strong>
                            Revise soon
                          </strong>

                          <small>
                            Next in queue
                          </small>
                        </div>
                      </header>

                      <div>
                        {actions
                          .slice(3, 6)
                          .map(
                            (
                              item,
                              index
                            ) => (
                              <Link
                                key={
                                  item.id
                                }
                                to={actionHref(
                                  item
                                )}
                              >
                                <span>
                                  {index +
                                    4}
                                </span>

                                <div>
                                  <strong>
                                    {
                                      item.topic
                                    }
                                  </strong>
                                </div>

                                <ChevronRight
                                  size={14}
                                />
                              </Link>
                            )
                          )}

                        {actions.length <=
                          3 && (
                          <p className="wr-empty">
                            Nothing queued
                            here.
                          </p>
                        )}
                      </div>
                    </article>

                    <article className="wr-priority-strong">
                      <header>
                        <span>
                          <ShieldCheck
                            size={16}
                          />
                        </span>

                        <div>
                          <strong>
                            Recorded strong
                          </strong>

                          <small>
                            Maintain, don't
                            over-study
                          </small>
                        </div>
                      </header>

                      <div>
                        {weaknesses
                          .filter(
                            (item) =>
                              item.accuracy >=
                              75
                          )
                          .slice(0, 3)
                          .map(
                            (
                              item
                            ) => (
                              <div
                                key={
                                  item.topic
                                }
                                className="wr-strong-topic"
                              >
                                <CheckCircle2
                                  size={15}
                                />

                                <span>
                                  <strong>
                                    {
                                      item.topic
                                    }
                                  </strong>

                                  <small>
                                    {
                                      item.accuracy
                                    }
                                    % in
                                    evaluated
                                    mocks
                                  </small>
                                </span>
                              </div>
                            )
                          )}

                        {!weaknesses.some(
                          (item) =>
                            item.accuracy >=
                            75
                        ) && (
                          <p className="wr-empty">
                            No strong topics
                            recorded yet.
                          </p>
                        )}
                      </div>
                    </article>
                  </div>
                </section>

                {/* =========================================
                    BATTLE PLAN
                ========================================= */}

                <section className="wr-section wr-battle-section">
                  <header className="wr-section-head">
                    <div>
                      <span className="wr-eyebrow">
                        <ListChecks
                          size={14}
                        />

                        Battle Plan
                      </span>

                      <h2>
                        Your next study
                        block.
                      </h2>

                      <p>
                        A short sequence
                        built from unfinished
                        priority actions.
                      </p>
                    </div>

                    <button
                      type="button"
                      className="wr-regenerate-plan"
                      onClick={() =>
                        setPlanOffset(
                          (value) =>
                            value + 1
                        )
                      }
                    >
                      <RefreshCw
                        size={14}
                      />

                      Regenerate plan
                    </button>
                  </header>

                  <div className="wr-plan-console">
                    <div className="wr-timer-console">
                      <span>
                        Focus timer
                      </span>

                      <strong>
                        {formatTimer(
                          timerLeft
                        )}
                      </strong>

                      <div>
                        <button
                          type="button"
                          className="wr-timer-main"
                          onClick={() =>
                            setTimerRunning(
                              (value) =>
                                !value
                            )
                          }
                        >
                          {timerRunning ? (
                            <>
                              <Pause
                                size={14}
                              />
                              Pause
                            </>
                          ) : (
                            <>
                              <Play
                                size={14}
                              />
                              Start
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTimerRunning(
                              false
                            );

                            setTimerLeft(
                              minutes *
                                60
                            );
                          }}
                        >
                          <TimerReset
                            size={14}
                          />

                          Reset
                        </button>
                      </div>

                      <small>
                        {minutes}-minute
                        focus block
                      </small>
                    </div>

                    <div className="wr-plan-list">
                      {plan.length ? (
                        plan.map(
                          (
                            item,
                            index
                          ) => {
                            const done =
                              completed.has(
                                item.id
                              );

                            return (
                              <article
                                key={
                                  item.id
                                }
                                className={
                                  done
                                    ? 'is-done'
                                    : ''
                                }
                              >
                                <span className="wr-plan-number">
                                  {String(
                                    index +
                                      1
                                  ).padStart(
                                    2,
                                    '0'
                                  )}
                                </span>

                                <div className="wr-plan-main">
                                  <strong>
                                    {
                                      item.title
                                    }
                                  </strong>

                                  <small>
                                    {
                                      item.minutes
                                    }{' '}
                                    min
                                    {' · '}
                                    {
                                      item.reason
                                    }
                                  </small>
                                </div>

                                <Link
                                  to={actionHref(
                                    item
                                  )}
                                >
                                  Open
                                </Link>

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleComplete(
                                      item.id
                                    )
                                  }
                                >
                                  <Check
                                    size={13}
                                  />

                                  {done
                                    ? 'Done'
                                    : 'Mark'}
                                </button>
                              </article>
                            );
                          }
                        )
                      ) : (
                        <div className="wr-empty-box">
                          <CheckCircle2
                            size={20}
                          />

                          <div>
                            <strong>
                              No pending
                              battle-plan
                              actions.
                            </strong>

                            <p>
                              Complete a
                              fresh mock or
                              open the
                              revision
                              workspace to
                              create new
                              evidence.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* =========================================
                    WEAKNESS RADAR
                ========================================= */}

                <section className="wr-section">
                  <header className="wr-section-head">
                    <div>
                      <span className="wr-eyebrow">
                        <BarChart3
                          size={14}
                        />

                        Weakness Radar
                      </span>

                      <h2>
                        What your mocks are
                        telling you.
                      </h2>

                      <p>
                        Topic-level accuracy
                        from evaluated mock
                        answers.
                      </p>
                    </div>
                  </header>

                  {weaknesses.length ? (
                    <div className="wr-weak-list">
                      {weaknesses
                        .slice(0, 8)
                        .map(
                          (
                            item,
                            index
                          ) => {
                            const safe =
                              Math.max(
                                0,
                                Math.min(
                                  100,
                                  Number(
                                    item.accuracy ||
                                      0
                                  )
                                )
                              );

                            return (
                              <article
                                key={
                                  item.topic
                                }
                              >
                                <span className="wr-weak-rank">
                                  {String(
                                    index +
                                      1
                                  ).padStart(
                                    2,
                                    '0'
                                  )}
                                </span>

                                <div className="wr-weak-main">
                                  <div>
                                    <strong>
                                      {
                                        item.topic
                                      }
                                    </strong>

                                    <span>
                                      {weaknessLabel(
                                        safe
                                      )}
                                    </span>
                                  </div>

                                  <div className="wr-weak-track">
                                    <span
                                      style={{
                                        width: `${safe}%`,
                                      }}
                                    />
                                  </div>
                                </div>

                                <strong className="wr-weak-score">
                                  {safe}%
                                </strong>

                                <Link
                                  to={
                                    item.questionId
                                      ? `/questions/${item.questionId}`
                                      : revisionUrl
                                  }
                                >
                                  Fix this

                                  <ArrowRight
                                    size={13}
                                  />
                                </Link>
                              </article>
                            );
                          }
                        )}
                    </div>
                  ) : (
                    <div className="wr-empty-box">
                      <BarChart3
                        size={20}
                      />

                      <div>
                        <strong>
                          No weakness data
                          yet.
                        </strong>

                        <p>
                          Evaluate a mock to
                          create topic-level
                          performance
                          evidence.
                        </p>
                      </div>
                    </div>
                  )}
                </section>

                {/* =========================================
                    MY MISTAKES
                ========================================= */}

                <section className="wr-section">
                  <header className="wr-section-head">
                    <div>
                      <span className="wr-eyebrow">
                        <AlertTriangle
                          size={14}
                        />

                        Mistake Log
                      </span>

                      <h2>
                        Mistakes worth
                        fixing before the
                        exam.
                      </h2>

                      <p>
                        These come from your
                        evaluated mocks on
                        this device.
                      </p>
                    </div>

                    <span className="wr-section-count">
                      {mistakes.length}
                    </span>
                  </header>

                  {mistakes.length ? (
                    <div className="wr-mistakes">
                      {mistakes.map(
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
                    <div className="wr-empty-box">
                      <AlertTriangle
                        size={20}
                      />

                      <div>
                        <strong>
                          No recorded
                          mistakes yet.
                        </strong>

                        <p>
                          Take and evaluate
                          a mock to build a
                          personal mistake
                          log.
                        </p>
                      </div>
                    </div>
                  )}
                </section>

                {/* =========================================
                    RAPID DRILLS
                ========================================= */}

                <section className="wr-section">
                  <header className="wr-section-head">
                    <div>
                      <span className="wr-eyebrow">
                        <Zap
                          size={14}
                        />

                        Rapid Drills
                      </span>

                      <h2>
                        Practice according
                        to the time you
                        have.
                      </h2>

                      <p>
                        Short drills use
                        available practice
                        questions and your
                        weaker topics.
                      </p>
                    </div>
                  </header>

                  <div className="wr-drill-buttons">
                    {[
                      {
                        value: 5,
                        title:
                          '5 min drill',
                        description:
                          'One quick question',
                      },
                      {
                        value: 10,
                        title:
                          '10 min drill',
                        description:
                          'Two focused questions',
                      },
                      {
                        value: 20,
                        title:
                          '20 min mini mock',
                        description:
                          'Four-question practice',
                      },
                    ].map(
                      (item) => (
                        <button
                          key={
                            item.value
                          }
                          type="button"
                          aria-pressed={
                            drillMinutes ===
                            item.value
                          }
                          onClick={() =>
                            setDrillMinutes(
                              (
                                current
                              ) =>
                                current ===
                                item.value
                                  ? 0
                                  : item.value
                            )
                          }
                        >
                          <Clock3
                            size={17}
                          />

                          <span>
                            <strong>
                              {
                                item.title
                              }
                            </strong>

                            <small>
                              {
                                item.description
                              }
                            </small>
                          </span>
                        </button>
                      )
                    )}
                  </div>

                  {!!drillMinutes && (
                    <div className="wr-drill-list">
                      {drills.map(
                        (
                          item,
                          index
                        ) => (
                          <Link
                            key={
                              item.questionId
                            }
                            to={`/questions/${item.questionId}`}
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
                                {item.questionLabel ||
                                  'Question'}
                              </strong>

                              <small>
                                {
                                  item.title
                                }
                              </small>
                            </div>

                            <ArrowRight
                              size={14}
                            />
                          </Link>
                        )
                      )}

                      {!drills.length && (
                        <p className="wr-empty">
                          No practice
                          questions are
                          available for this
                          drill.
                        </p>
                      )}

                      {drillMinutes ===
                        20 && (
                        <Link
                          className="wr-mini-mock"
                          to={`/mock-exams?subjectCode=${encodeURIComponent(
                            subjectCode
                          )}&examType=${encodeURIComponent(
                            examType
                          )}&durationMinutes=20`}
                        >
                          <GraduationCap
                            size={15}
                          />

                          Generate a full
                          graded 20-minute
                          mock

                          <ArrowRight
                            size={14}
                          />
                        </Link>
                      )}
                    </div>
                  )}
                </section>

                {/* =========================================
                    READINESS
                ========================================= */}

                <section className="wr-section wr-readiness">
                  <header className="wr-section-head">
                    <div>
                      <span className="wr-eyebrow">
                        <TrendingUp
                          size={14}
                        />

                        Readiness Evidence
                      </span>

                      <h2>
                        What PaperStack has
                        actually recorded.
                      </h2>

                      <p>
                        This is preparation
                        evidence from your
                        PaperStack activity,
                        not a prediction of
                        exam performance.
                      </p>
                    </div>
                  </header>

                  <div className="wr-readiness-layout">
                    <div
                      className={`wr-readiness-score wr-readiness-${readinessClass}`}
                    >
                      <span>
                        Recorded preparation
                      </span>

                      <strong>
                        {readinessPercent ==
                        null
                          ? '—'
                          : readinessPercent}
                      </strong>

                      <small>
                        {readinessPercent ==
                        null
                          ? 'No measurable progress yet'
                          : '%'}
                      </small>

                      <div className="wr-readiness-ring">
                        <span
                          style={{
                            '--wr-progress':
                              `${
                                readinessPercent ||
                                0
                              }deg`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="wr-readiness-components">
                      {readiness.components.map(
                        (item) => (
                          <div
                            key={
                              item.label
                            }
                          >
                            <div>
                              <span>
                                {
                                  item.label
                                }
                              </span>

                              <strong>
                                {
                                  item.value
                                }
                                %
                              </strong>
                            </div>

                            <div className="wr-readiness-track">
                              <span
                                style={{
                                  width: `${Math.max(
                                    0,
                                    Math.min(
                                      100,
                                      Number(
                                        item.value ||
                                          0
                                      )
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                          </div>
                        )
                      )}

                      <p>
                        {
                          readiness.methodology
                        }
                      </p>
                    </div>
                  </div>
                </section>
              </>
            )}

            {/* =============================================
                METHODOLOGY
            ============================================= */}

            <section className="wr-method">
              <CircleAlert
                size={17}
              />

              <div>
                <strong>
                  About Exam Planner guidance
                </strong>

                <p>
                  {
                    room.methodology
                      ?.disclaimer
                  }
                </p>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
