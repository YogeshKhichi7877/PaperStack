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
  AlertCircle,
  ArrowRight,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileArchive,
  FileCheck2,
  FileText,
  FolderUp,
  GraduationCap,
  History,
  Layers3,
  Lightbulb,
  Loader2,
  NotebookPen,
  Paperclip,
  Sparkles,
  Upload,
  X,
} from 'lucide-react';

import {
  fetchResourceContributionConfig,
  fetchMyResourceContributions,
  submitResourceContribution,
} from '../services/resourceContributionApi';
import { OFFICIAL_BRANCHES } from '../config/branches';

import './ResourceContributionPage.css';
import { useStudentProfile } from '../context/StudentProfileContext';

/* =========================================================
   FALLBACK CONFIG
========================================================= */

const FALLBACK_TYPES = [
  {
    value: 'solution',
    label: 'Solution',
    description:
      'Solved PYQs, worked examples or assignment solutions.',
    icon: 'solution',
  },
  {
    value: 'notes',
    label: 'Notes',
    description:
      'Unit notes, class notes or concise revision material.',
    icon: 'notes',
  },
  {
    value: 'formula_sheet',
    label: 'Formula Sheet',
    description:
      'Compact formula collections for fast revision.',
    icon: 'formula',
  },
  {
    value: 'assignment',
    label: 'Assignment',
    description:
      'Useful assignment material or reference work.',
    icon: 'assignment',
  },
  {
    value: 'lab_material',
    label: 'Lab Material',
    description:
      'Lab manuals, experiments, programs or lab references.',
    icon: 'lab',
  },
  {
    value: 'quiz',
    label: 'Quiz',
    description:
      'Quiz questions, short tests or practice sheets.',
    icon: 'quiz',
  },
  {
    value: 'viva_questions',
    label: 'Viva Questions',
    description:
      'Viva questions and short oral-exam preparation.',
    icon: 'viva',
  },
  {
    value: 'important_questions',
    label: 'Important Questions',
    description:
      'Curated questions worth revising before an exam.',
    icon: 'important',
  },
  {
    value: 'syllabus',
    label: 'Syllabus',
    description:
      'Official or useful subject syllabus material.',
    icon: 'syllabus',
  },
  {
    value: 'revision_sheet',
    label: 'Revision Notes',
    description:
      'Structured last-minute revision material.',
    icon: 'revision',
  },
  {
    value: 'other',
    label: 'Other Resource',
    description:
      'Any useful academic resource that does not fit above.',
    icon: 'other',
  },
];

const FALLBACK_POINTS = {
  solution: 80,
  notes: 60,
  formula_sheet: 50,
  assignment: 40,
  lab_material: 40,
  quiz: 30,
  viva_questions: 30,
  important_questions: 50,
  syllabus: 30,
  revision_sheet: 60,
  other: 20,
};

/* =========================================================
   HELPERS
========================================================= */

function cleanParam(
  params,
  key
) {
  return String(
    params.get(key) || ''
  ).trim();
}

function formatKind(value) {
  return String(
    value || ''
  )
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (char) =>
        char.toUpperCase()
    );
}

function getTypeIcon(
  type
) {
  const value =
    type?.value || type;

  if (
    value === 'solution'
  ) {
    return FileCheck2;
  }

  if (
    value === 'notes'
  ) {
    return NotebookPen;
  }

  if (
    value ===
    'formula_sheet'
  ) {
    return Sparkles;
  }

  if (
    value ===
      'assignment' ||
    value === 'quiz' ||
    value ===
      'important_questions'
  ) {
    return ClipboardCheck;
  }

  if (
    value ===
    'lab_material'
  ) {
    return Layers3;
  }

  if (
    value ===
    'viva_questions'
  ) {
    return GraduationCap;
  }

  if (
    value === 'syllabus'
  ) {
    return BookOpen;
  }

  if (
    value ===
    'revision_sheet'
  ) {
    return FileText;
  }

  return FileArchive;
}

function statusLabel(
  status
) {
  if (
    status === 'approved'
  ) {
    return 'Approved';
  }

  if (
    status ===
    'needs_correction'
  ) {
    return 'Needs correction';
  }

  if (
    status === 'rejected'
  ) {
    return 'Rejected';
  }

  if (
    status === 'duplicate'
  ) {
    return 'Duplicate';
  }

  return 'In review';
}

function formatFileSize(
  bytes
) {
  if (!bytes) {
    return '';
  }

  const mb =
    bytes /
    1024 /
    1024;

  if (mb >= 1) {
    return `${mb.toFixed(
      2
    )} MB`;
  }

  return `${(
    bytes / 1024
  ).toFixed(0)} KB`;
}

/* =========================================================
   MAIN
========================================================= */

export default function ResourceContributionPage({
  user,
  toast,
}) {
  const { semester: preferredSemester } = useStudentProfile();
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] =
    useSearchParams();

  const [
    config,
    setConfig,
  ] =
    useState(null);

  const [
    history,
    setHistory,
  ] =
    useState([]);

  const [
    loadingHistory,
    setLoadingHistory,
  ] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    file,
    setFile,
  ] =
    useState(null);

  const [
    confirmed,
    setConfirmed,
  ] =
    useState(false);

  const [
    ,
    setActiveStep,
  ] =
    useState(1);

  const [
    form,
    setForm,
  ] =
    useState(() => ({
      kind:
        cleanParam(
          searchParams,
          'kind'
        ) || 'notes',

      title: '',

      subjectName:
        cleanParam(
          searchParams,
          'subject'
        ) ||
        cleanParam(
          searchParams,
          'subjectName'
        ),

      subjectCode:
        cleanParam(
          searchParams,
          'subjectCode'
        ),

      subjectShortCode:
        cleanParam(
          searchParams,
          'shortCode'
        ),

      branch:
        cleanParam(
          searchParams,
          'branch'
        ) || 'CSE',

      semester:
        cleanParam(
          searchParams,
          'semester'
        ) || String(preferredSemester || ''),

      year:
        cleanParam(
          searchParams,
          'year'
        ),

      examType:
        cleanParam(
          searchParams,
          'examType'
        ),

      tags: '',
      topics: '',
      description: '',
    }));

  /* =========================================================
     CONFIG
  ========================================================= */

  useEffect(() => {
    setForm((current) => ({ ...current, semester: String(preferredSemester || current.semester || '') }));
  }, [preferredSemester]);

  useEffect(() => {
    let mounted = true;

    fetchResourceContributionConfig()
      .then(
        (result) => {
          if (!mounted) {
            return;
          }

          setConfig(result);

          setForm(
            (current) => ({
              ...current,

              kind:
                current.kind ||
                result
                  ?.resourceTypes?.[0]
                  ?.value ||
                'notes',
            })
          );
        }
      )
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     HISTORY
  ========================================================= */

  useEffect(() => {
    if (!user) {
      return;
    }

    let mounted = true;

    setLoadingHistory(
      true
    );

    fetchMyResourceContributions()
      .then(
        (result) => {
          if (!mounted) {
            return;
          }

          setHistory(
            Array.isArray(
              result
                ?.contributions
            )
              ? result.contributions
              : []
          );
        }
      )
      .catch(() => {})
      .finally(() => {
        if (mounted) {
          setLoadingHistory(
            false
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  /* =========================================================
     CONFIG DERIVED
  ========================================================= */

  const rawTypes =
    config
      ?.resourceTypes
      ?.length
      ? config.resourceTypes
      : FALLBACK_TYPES;

  const resourceTypes =
    useMemo(() => {
      return rawTypes.map(
        (type) => {
          const fallback =
            FALLBACK_TYPES.find(
              (item) =>
                item.value ===
                type.value
            );

          return {
            ...fallback,
            ...type,

            description:
              type.description ||
              fallback
                ?.description ||
              'Useful academic resource.',
          };
        }
      );
    }, [rawTypes]);

  const pointRules =
    config
      ?.points
      ?.rules ||
    FALLBACK_POINTS;

  const selectedPoints =
    Number(
      pointRules[
        form.kind
      ] || 0
    );

  const firstBonus =
    Number(
      config
        ?.points
        ?.firstCategoryBonus ||
        25
    );

  const selectedType =
    useMemo(
      () =>
        resourceTypes.find(
          (item) =>
            item.value ===
            form.kind
        ) ||
        resourceTypes[0] ||
        null,
      [
        resourceTypes,
        form.kind,
      ]
    );

  const selectedLabel =
    selectedType
      ?.label ||
    'Resource';

  const selectedDescription =
    selectedType
      ?.description ||
    'Useful academic resource.';

  /* =========================================================
     FORM COMPLETION
  ========================================================= */

  const completeness =
    useMemo(() => {
      const checks = [
        Boolean(
          form.kind
        ),
        Boolean(
          form.title.trim()
        ),
        Boolean(
          form.subjectName.trim()
        ),
        Boolean(
          form.branch
        ),
        Boolean(
          form.semester
        ),
        Boolean(file),
        confirmed,
      ];

      const done =
        checks.filter(
          Boolean
        ).length;

      return {
        done,

        total:
          checks.length,

        percent:
          Math.round(
            (
              done /
              checks.length
            ) *
              100
          ),
      };
    }, [
      form,
      file,
      confirmed,
    ]);

  /* =========================================================
     FORM UPDATE
  ========================================================= */

  function update(
    key,
    value
  ) {
    setForm(
      (current) => ({
        ...current,
        [key]: value,
      })
    );
  }

  /* =========================================================
     SUBMIT
  ========================================================= */

  async function submit(
    event
  ) {
    event.preventDefault();

    if (!user) {
      const redirect =
        `${window.location.pathname}${window.location.search}`;

      navigate(
        `/login?redirect=${encodeURIComponent(
          redirect
        )}`
      );

      return;
    }

    if (!file) {
      toast?.(
        'Choose a resource file first.',
        'error'
      );

      return;
    }

    if (!confirmed) {
      toast?.(
        'Confirm that the resource is useful and correctly labelled.',
        'error'
      );

      return;
    }

    const required = [
      [
        'kind',
        'resource type',
      ],
      [
        'title',
        'title',
      ],
      [
        'subjectName',
        'subject',
      ],
      [
        'branch',
        'branch',
      ],
      [
        'semester',
        'semester',
      ],
    ];

    const missing =
      required.filter(
        ([key]) =>
          !String(
            form[key] || ''
          ).trim()
      );

    if (
      missing.length
    ) {
      toast?.(
        `Missing ${missing
          .map(
            (item) =>
              item[1]
          )
          .join(', ')}.`,
        'error'
      );

      return;
    }

    const payload =
      new FormData();

    Object.entries(
      form
    ).forEach(
      ([key, value]) => {
        if (
          value !== '' &&
          value != null
        ) {
          payload.append(
            key,
            value
          );
        }
      }
    );

    payload.append(
      'file',
      file
    );

    setSubmitting(
      true
    );

    try {
      const result =
        await submitResourceContribution(
          payload
        );

      toast?.(
        result.message ||
          'Resource submitted for review.',
        'success'
      );

      const contribution =
        result.contribution;

      if (
        contribution
      ) {
        setHistory(
          (current) => [
            contribution,
            ...current,
          ]
        );
      }

      setFile(null);
      setConfirmed(false);

      setForm(
        (current) => ({
          ...current,

          title: '',
          tags: '',
          topics: '',
          description: '',
        })
      );

      setActiveStep(1);
    } catch (error) {
      toast?.(
        error.response
          ?.data
          ?.error ||
          'Resource upload failed.',
        'error'
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="rc-page">
      <Helmet>
        <title>
          Upload Notes &amp; Resources -
          PaperStack
        </title>

        <meta
          name="description"
          content="Contribute notes, solutions, formula sheets, lab material and other academic resources to PaperStack."
        />
      </Helmet>

      <div className="rc-shell">
        {/* =================================================
            PAGE INTRO
        ================================================= */}

        <header className="rc-header">
          <div className="rc-header-copy">
            <span className="rc-kicker">
              <FolderUp
                size={15}
              />

              Upload Notes &amp; Resources
            </span>

            <h1>
              Share something
              <br />

              <span>
                worth keeping.
              </span>
            </h1>

            <p>
              Help your batch and juniors by uploading a useful resource.
            </p>
          </div>

          <div className="rc-header-aside" hidden>
            <img src="/resource-upload-owl.png" alt="" aria-hidden="true" />
            <div className="rc-header-note">
              <span>Your upload journey</span>
              <div><b>01</b>Prepare</div>
              <i />
              <div><b>02</b>Review</div>
              <i />
              <div><b>03</b>Publish</div>
            </div>
          </div>
        </header>

        {/* =================================================
            RESOURCE TYPE BOARD
        ================================================= */}

        <section className="rc-type-section">
          <header>
            <div>
              <span>
                Step 1
              </span>

              <h2>
                What are you
                contributing?
              </h2>

              <p>
                Choose a resource type to begin.
              </p>
            </div>

            <div className="rc-current-reward">
              <Award
                size={18}
              />

              <span>
                Reward
              </span>

              <strong>
                +
                {
                  selectedPoints
                }
              </strong>

              <small>
                XP after approval
              </small>
            </div>
          </header>

          <div className="rc-type-grid">
            {resourceTypes.map(
              (type) => {
                const Icon =
                  getTypeIcon(
                    type
                  );

                const active =
                  form.kind ===
                  type.value;

                return (
                  <button
                    key={
                      type.value
                    }
                    type="button"
                    className={
                      active
                        ? 'active'
                        : ''
                    }
                    onClick={() => {
                      update(
                        'kind',
                        type.value
                      );

                      setActiveStep(
                        2
                      );
                    }}
                  >
                    <span className="rc-type-icon">
                      <Icon
                        size={18}
                      />
                    </span>

                    <span className="rc-type-copy">
                      <strong>
                        {
                          type.label
                        }
                      </strong>

                      <small>
                        {
                          type.description
                        }
                      </small>
                    </span>

                    <b>
                      +
                      {pointRules[
                        type.value
                      ] || 0}
                    </b>

                    {active && (
                      <Check
                        size={14}
                      />
                    )}
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* =================================================
            MAIN WORKSPACE
        ================================================= */}

        <section className="rc-workspace">
          {/* ===============================================
              LEFT: FORM
          =============================================== */}

          <form
            className="rc-form"
            onSubmit={
              submit
            }
          >
            {/* =============================================
                FORM HEADER
            ============================================= */}

            <header className="rc-form-head">
              <div>
                <span>
                  Step 2
                </span>

                <h2>
                  Prepare the resource.
                </h2>

                <p>
                  Good labels make the
                  material easier for
                  students to discover
                  later.
                </p>
              </div>

              <div className="rc-progress">
                <span>
                  Form completeness
                </span>

                <strong>
                  {
                    completeness.percent
                  }
                  %
                </strong>

                <div>
                  <i
                    style={{
                      width:
                        `${completeness.percent}%`,
                    }}
                  />
                </div>
              </div>
            </header>

            {/* =============================================
                CURRENT TYPE
            ============================================= */}

            <div className="rc-selected-type">
              {(() => {
                const Icon =
                  getTypeIcon(
                    selectedType
                  );

                return (
                  <span>
                    <Icon
                      size={18}
                    />
                  </span>
                );
              })()}

              <div>
                <strong>
                  {
                    selectedLabel
                  }
                </strong>

                <p>
                  {
                    selectedDescription
                  }
                </p>
              </div>

              <b>
                +
                {
                  selectedPoints
                }{' '}
                XP
              </b>
            </div>

            {/* =============================================
                BASIC INFO
            ============================================= */}

            <section className="rc-form-section">
              <div className="rc-form-section-number">
                01
              </div>

              <div className="rc-form-section-content">
                <header>
                  <strong>
                    Basic details
                  </strong>

                  <span>
                    What students will
                    see first.
                  </span>
                </header>

                <div className="rc-form-grid">
                  <label className="rc-field-wide">
                    <span>
                      Resource title *
                    </span>

                    <input
                      value={
                        form.title
                      }
                      onChange={(
                        event
                      ) =>
                        update(
                          'title',
                          event.target
                            .value
                        )
                      }
                      placeholder="Example: Unit 3 Projection concise notes"
                      maxLength={
                        180
                      }
                    />

                    <small>
                      Keep it descriptive
                      instead of writing
                      only “notes” or
                      “solution”.
                    </small>
                  </label>

                  <label>
                    <span>
                      Subject *
                    </span>

                    <input
                      value={
                        form.subjectName
                      }
                      onChange={(
                        event
                      ) =>
                        update(
                          'subjectName',
                          event.target
                            .value
                        )
                      }
                      placeholder="Computer Graphics"
                    />
                  </label>

                  <label>
                    <span>
                      Subject code
                    </span>

                    <input
                      value={
                        form.subjectCode
                      }
                      onChange={(
                        event
                      ) =>
                        update(
                          'subjectCode',
                          event.target
                            .value
                        )
                      }
                      placeholder="CS502"
                    />
                  </label>
                </div>
              </div>
            </section>

            {/* =============================================
                ACADEMIC CONTEXT
            ============================================= */}

            <section className="rc-form-section">
              <div className="rc-form-section-number">
                02
              </div>

              <div className="rc-form-section-content">
                <header>
                  <strong>
                    Academic context
                  </strong>

                  <span>
                    Where this material
                    belongs.
                  </span>
                </header>

                <div className="rc-form-grid rc-grid-4">
                  <label>
                    <span>
                      Branch *
                    </span>

                    <select
                      value={
                        form.branch
                      }
                      onChange={(
                        event
                      ) =>
                        update(
                          'branch',
                          event.target
                            .value
                        )
                      }
                    >
                      {OFFICIAL_BRANCHES.map(({ key }) => <option key={key} value={key}>{key}</option>)}
                    </select>
                  </label>

                  <label>
                    <span>
                      Semester *
                    </span>

                    <select
                      value={
                        form.semester
                      }
                      onChange={(
                        event
                      ) =>
                        update(
                          'semester',
                          event.target
                            .value
                        )
                      }
                    >
                      <option value="">
                        Select
                      </option>

                      {[
                        1,
                        2,
                        3,
                        4,
                        5,
                        6,
                        7,
                        8,
                      ].map(
                        (semester) => (
                          <option
                            key={
                              semester
                            }
                            value={
                              semester
                            }
                          >
                            Semester{' '}
                            {
                              semester
                            }
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label>
                    <span>
                      Year
                    </span>

                    <input
                      value={
                        form.year
                      }
                      onChange={(
                        event
                      ) =>
                        update(
                          'year',
                          event.target
                            .value
                        )
                      }
                      inputMode="numeric"
                      placeholder="2026"
                    />
                  </label>

                  <label>
                    <span>
                      Exam / context
                    </span>

                    <select
                      value={
                        form.examType
                      }
                      onChange={(
                        event
                      ) =>
                        update(
                          'examType',
                          event.target
                            .value
                        )
                      }
                    >
                      <option value="">
                        General
                      </option>

                      <option value="Mid-Sem">
                        Mid-Sem
                      </option>

                      <option value="End-Sem">
                        End-Sem
                      </option>

                      <option value="Quiz">
                        Quiz
                      </option>

                      <option value="Assignment">
                        Assignment
                      </option>

                      <option value="Lab">
                        Lab
                      </option>
                    </select>
                  </label>
                </div>
              </div>
            </section>

            {/* =============================================
                DISCOVERY
            ============================================= */}

            <section className="rc-form-section">
              <div className="rc-form-section-number">
                03
              </div>

              <div className="rc-form-section-content">
                <header>
                  <strong>
                    Help students find it
                  </strong>

                  <span>
                    Optional, but useful.
                  </span>
                </header>

                <div className="rc-form-grid">
                  <label>
                    <span>
                      Topics
                    </span>

                    <input
                      value={
                        form.topics
                      }
                      onChange={(
                        event
                      ) =>
                        update(
                          'topics',
                          event.target
                            .value
                        )
                      }
                      placeholder="projection, transformations, clipping"
                    />

                    <small>
                      Separate topics with
                      commas.
                    </small>
                  </label>

                  <label>
                    <span>
                      Tags
                    </span>

                    <input
                      value={
                        form.tags
                      }
                      onChange={(
                        event
                      ) =>
                        update(
                          'tags',
                          event.target
                            .value
                        )
                      }
                      placeholder="unit-3, handwritten, exam-ready"
                    />
                  </label>

                  <label className="rc-field-wide">
                    <span>
                      Description
                    </span>

                    <textarea
                      value={
                        form.description
                      }
                      onChange={(
                        event
                      ) =>
                        update(
                          'description',
                          event.target
                            .value
                        )
                      }
                      placeholder="Describe what is included, which units it covers, and why it may be useful."
                      maxLength={
                        1500
                      }
                    />

                    <small className="rc-character-count">
                      {
                        form.description
                          .length
                      }
                      /1500
                    </small>
                  </label>
                </div>
              </div>
            </section>

            {/* =============================================
                FILE DROP
            ============================================= */}

            <section className="rc-form-section">
              <div className="rc-form-section-number">
                04
              </div>

              <div className="rc-form-section-content">
                <header>
                  <strong>
                    Attach the material
                  </strong>

                  <span>
                    Max file size:
                    20 MB.
                  </span>
                </header>

                <div
                  className={`rc-upload ${
                    file
                      ? 'has-file'
                      : ''
                  }`}
                >
                  <input
                    id="resource-file"
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip"
                    onChange={(
                      event
                    ) =>
                      setFile(
                        event.target
                          .files?.[0] ||
                          null
                      )
                    }
                  />

                  {!file ? (
                    <label htmlFor="resource-file">
                      <span className="rc-upload-icon">
                        <Upload
                          size={25}
                        />
                      </span>

                      <strong>
                        Choose the resource
                        file
                      </strong>

                      <p>
                        PDF, image, Office
                        document, text,
                        CSV or ZIP.
                      </p>

                      <b>
                        Browse file
                      </b>
                    </label>
                  ) : (
                    <div className="rc-file-selected">
                      <span className="rc-file-icon">
                        <Paperclip
                          size={21}
                        />
                      </span>

                      <div>
                        <strong>
                          {
                            file.name
                          }
                        </strong>

                        <span>
                          {formatFileSize(
                            file.size
                          )}
                        </span>
                      </div>

                      <button
                        type="button"
                        aria-label="Remove selected file"
                        onClick={() =>
                          setFile(
                            null
                          )
                        }
                      >
                        <X
                          size={15}
                        />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* =============================================
                CONFIRM
            ============================================= */}

            <section className="rc-submit-area">
              <label className="rc-confirm">
                <input
                  type="checkbox"
                  checked={
                    confirmed
                  }
                  onChange={(
                    event
                  ) =>
                    setConfirmed(
                      event.target
                        .checked
                    )
                  }
                />

                <span className="rc-confirm-box">
                  {confirmed && (
                    <Check
                      size={12}
                    />
                  )}
                </span>

                <span>
                  <strong>
                    Final check
                  </strong>

                  I confirm this resource
                  is useful, correctly
                  labelled and
                  appropriate to share
                  with IIIT Surat
                  students.
                </span>
              </label>

              {!user && (
                <div className="rc-login-note">
                  <AlertCircle
                    size={15}
                  />

                  <span>
                    You can prepare the
                    form now, but you
                    need to sign in
                    before submitting.
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="rc-submit"
                disabled={
                  submitting
                }
              >
                {submitting ? (
                  <>
                    <Loader2
                      size={15}
                      className="rc-spin"
                    />

                    Uploading…
                  </>
                ) : (
                  <>
                    <FolderUp
                      size={15}
                    />

                    Submit{' '}
                    {
                      selectedLabel
                    }{' '}
                    for review

                    <ArrowRight
                      size={14}
                    />
                  </>
                )}
              </button>

              <p className="rc-submit-note">
                Points are added only
                after the resource is
                approved.
              </p>
            </section>
          </form>

          {/* ===============================================
              RIGHT DESK
          =============================================== */}

          <aside className="rc-sidebar">
            {/* =============================================
                REWARD RECEIPT
            ============================================= */}

            <section className="rc-reward-slip">
              <header>
                <span>
                  Contribution reward
                </span>

                <Award
                  size={17}
                />
              </header>

              <strong>
                +
                {
                  selectedPoints
                }
                <small>
                  XP
                </small>
              </strong>

              <p>
                Earned after admin
                approval.
              </p>

              <div className="rc-reward-line">
                <span>
                  Resource
                </span>

                <b>
                  {
                    selectedLabel
                  }
                </b>
              </div>

              <div className="rc-reward-line">
                <span>
                  Base reward
                </span>

                <b>
                  +
                  {
                    selectedPoints
                  }
                </b>
              </div>

              <div className="rc-reward-line">
                <span>
                  First category bonus
                </span>

                <b>
                  +
                  {
                    firstBonus
                  }{' '}
                  possible
                </b>
              </div>

              <div className="rc-reward-total">
                <span>
                  Maximum possible
                </span>

                <strong>
                  +
                  {selectedPoints +
                    firstBonus}
                  XP
                </strong>
              </div>

              <small>
                Duplicate or rejected
                uploads earn 0 points.
              </small>
            </section>

            {/* =============================================
                REVIEW CHECKLIST
            ============================================= */}

            <section className="rc-checklist">
              <header>
                <ClipboardCheck
                  size={16}
                />

                <div>
                  <strong>
                    Before submitting
                  </strong>

                  <span>
                    Quick quality check
                  </span>
                </div>
              </header>

              <div>
                <span
                  className={
                    form.title.trim()
                      ? 'done'
                      : ''
                  }
                >
                  <CheckCircle2
                    size={13}
                  />

                  Clear title
                </span>

                <span
                  className={
                    form.subjectName.trim()
                      ? 'done'
                      : ''
                  }
                >
                  <CheckCircle2
                    size={13}
                  />

                  Correct subject
                </span>

                <span
                  className={
                    form.semester
                      ? 'done'
                      : ''
                  }
                >
                  <CheckCircle2
                    size={13}
                  />

                  Semester selected
                </span>

                <span
                  className={
                    file
                      ? 'done'
                      : ''
                  }
                >
                  <CheckCircle2
                    size={13}
                  />

                  File attached
                </span>

                <span
                  className={
                    confirmed
                      ? 'done'
                      : ''
                  }
                >
                  <CheckCircle2
                    size={13}
                  />

                  Sharing confirmed
                </span>
              </div>
            </section>

            {/* =============================================
                WHY CONTRIBUTE
            ============================================= */}

            <section className="rc-impact">
              <Lightbulb
                size={17}
              />

              <div>
                <span>
                  Why contribute?
                </span>

                <strong>
                  One useful upload can
                  save many students
                  hours.
                </strong>

                <p>
                  Good notes and solved
                  material remain inside
                  the Subject Hub instead
                  of getting buried in
                  old Drive folders or
                  chats.
                </p>
              </div>
            </section>

            {/* =============================================
                HISTORY
            ============================================= */}

            <section className="rc-history-section">
              <header>
                <div>
                  <span>
                    Your submissions
                  </span>

                  <strong>
                    Review history
                  </strong>
                </div>

                <History
                  size={17}
                />
              </header>

              {loadingHistory ? (
                <div className="rc-history-loading">
                  <Loader2
                    size={17}
                    className="rc-spin"
                  />

                  Loading…
                </div>
              ) : history.length ? (
                <div className="rc-history">
                  {history
                    .slice(
                      0,
                      7
                    )
                    .map(
                      (item) => (
                        <div
                          key={
                            item._id
                          }
                        >
                          <span className="rc-history-marker" />

                          <div>
                            <strong>
                              {
                                item.title
                              }
                            </strong>

                            <small>
                              {formatKind(
                                item.kind
                              )}
                            </small>
                          </div>

                          <b
                            className={
                              `status-${item.status}`
                            }
                          >
                            {statusLabel(
                              item.status
                            )}
                          </b>
                        </div>
                      )
                    )}
                </div>
              ) : (
                <div className="rc-no-history">
                  <History
                    size={18}
                  />

                  <p>
                    No resource uploads
                    yet.
                  </p>
                </div>
              )}
            </section>

            {/* =============================================
                PAPER CONTRIBUTION LINK
            ============================================= */}

            <Link
              to="/contribute"
              className="rc-paper-link"
            >
              <span>
                <FileText
                  size={18}
                />
              </span>

              <div>
                <strong>
                  Uploading a previous
                  question paper?
                </strong>

                <small>
                  Use Paper Contribution
                  instead.
                </small>
              </div>

              <ChevronRight
                size={15}
              />
            </Link>
          </aside>
        </section>
      </div>
    </main>
  );
}
