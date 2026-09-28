import { OFFICIAL_BRANCHES as OFFICIAL_BRANCHES_CONFIG } from '../config/branches';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Helmet,
} from 'react-helmet-async';

import {
  Link,
} from 'react-router-dom';

import {
  ArrowLeft,
  ArrowRight,
  BookOpenCheck,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Database,
  FilePlus2,
  Layers3,
  LibraryBig,
  RefreshCw,
  Search,
  Target,
  X,
} from 'lucide-react';

import {
  getArchiveCompletion,
} from '../services/archiveCompletionApi';

import './ArchiveCompletionPage.css';

/* =========================================================
   OFFICIAL IIIT SURAT BRANCHES
========================================================= */

const OFFICIAL_BRANCHES = OFFICIAL_BRANCHES_CONFIG.map(({ key, short, name }) => ({ key, short, name }));

/* =========================================================
   HELPERS
========================================================= */

function numberValue(
  value
) {
  const parsed =
    Number(value);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : 0;
}

function pct(
  value
) {
  const number =
    numberValue(
      value
    );

  return `${
    Number.isInteger(
      number
    )
      ? number
      : number.toFixed(
          1
        )
  }%`;
}

function formatNumber(
  value
) {
  return numberValue(
    value
  ).toLocaleString(
    'en-IN'
  );
}

function normalizeText(
  value
) {
  return String(
    value || ''
  )
    .trim()
    .toLowerCase()
    .replace(
      /[_–—]/g,
      '-'
    )
    .replace(
      /\s+/g,
      ' '
    );
}

function canonicalBranch(
  value
) {
  const branch =
    normalizeText(
      value
    );

  if (
    [
      'cse',
      'computer science',
      'computer science and engineering',
      'computer science & engineering',
    ].includes(
      branch
    )
  ) {
    return 'CSE';
  }

  if (
    [
      'cse (ai-ml)',
      'cse ai-ml',
      'cse ai ml',
      'ai-ml',
      'ai ml',
      'aiml',
      'artificial intelligence and machine learning',
      'computer science and engineering (ai-ml)',
      'computer science & engineering (ai-ml)',
    ].includes(
      branch
    )
  ) {
    return 'CSE (AI-ML)';
  }

  if (
    [
      'cyber security',
      'cybersecurity',
      'cyber',
      'cse cyber security',
      'cse (cyber security)',
    ].includes(
      branch
    )
  ) {
    return 'Cyber Security';
  }

  if (
    [
      'mathematics and computing',
      'mathematics & computing',
      'maths and computing',
      'maths & computing',
      'mnc',
      'mn&c',
      'mac',
    ].includes(
      branch
    )
  ) {
    return 'Mathematics and Computing';
  }

  if (
    [
      'ece',
      'electronics and communication engineering',
      'electronics & communication engineering',
    ].includes(
      branch
    )
  ) {
    return 'ECE';
  }

  return String(
    value || ''
  ).trim();
}

function branchDefinition(
  key
) {
  return (
    OFFICIAL_BRANCHES.find(
      (item) =>
        item.key ===
        key
    ) || {
      key,
      short: key,
      name: key,
    }
  );
}

function completionValue(
  item
) {
  const expected =
    numberValue(
      item?.expected
    );

  const available =
    numberValue(
      item?.available
    );

  if (expected > 0) {
    return Math.min(
      100,
      Math.max(
        0,
        (
          available /
          expected
        ) *
          100
      )
    );
  }

  return Math.min(
    100,
    Math.max(
      0,
      numberValue(
        item?.completionPct
      )
    )
  );
}

function completionClass(
  value
) {
  const score =
    numberValue(
      value
    );

  if (score >= 90) {
    return 'complete';
  }

  if (score >= 70) {
    return 'healthy';
  }

  if (score >= 40) {
    return 'partial';
  }

  return 'critical';
}

function gapLabel(
  item
) {
  const missing =
    numberValue(
      item?.missing
    );

  if (!missing) {
    return 'Complete';
  }

  if (
    completionValue(
      item
    ) < 40
  ) {
    return 'Large gap';
  }

  return `${missing} missing`;
}

function ProgressBar({
  value,
  compact = false,
}) {
  const width =
    Math.max(
      0,
      Math.min(
        100,
        numberValue(
          value
        )
      )
    );

  return (
    <div
      className={`ac-progress-track ${
        compact
          ? 'compact'
          : ''
      }`}
      aria-label={`Archive completion ${pct(
        width
      )}`}
    >
      <span
        className="ac-progress-fill"
        style={{
          width:
            `${width}%`,
        }}
      />
    </div>
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function ArchiveCompletionPage({
  toast,
}) {
  const [
    data,
    setData,
  ] =
    useState(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    branch,
    setBranch,
  ] =
    useState('All');

  const [
    semester,
    setSemester,
  ] =
    useState('All');

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    expandedKey,
    setExpandedKey,
  ] =
    useState('');

  const [
    subjectStatus,
    setSubjectStatus,
  ] =
    useState('all');

  const [
    sortBy,
    setSortBy,
  ] =
    useState('missing');

  const [
    activeYear,
    setActiveYear,
  ] =
    useState('All');

  /* =========================================================
     LOAD
  ========================================================= */

  const load =
    useCallback(
      async () => {
        setLoading(
          true
        );

        try {
          const result =
            await getArchiveCompletion();

          setData(
            result ||
              null
          );
        } catch (
          error
        ) {
          console.error(
            'Archive completion load failed:',
            error
          );

          toast?.(
            'Failed to load archive completion data',
            'error'
          );

          setData(
            null
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [toast]
    );

  useEffect(() => {
    load();
  }, [load]);

  /* =========================================================
     RAW DATA
  ========================================================= */

  const summary =
    data?.summary ||
    {};

  const rawBranches =
    useMemo(
      () =>
        data?.branches ||
        [],
      [data]
    );

  const rawSemesters =
    useMemo(
      () =>
        data?.semesters ||
        [],
      [data]
    );

  const rawSubjects =
    useMemo(
      () =>
        data?.subjects ||
        [],
      [data]
    );

  /* =========================================================
     OFFICIAL BRANCH COVERAGE
  ========================================================= */

  const branches =
    useMemo(() => {
      const map =
        new Map(
          OFFICIAL_BRANCHES.map(
            (definition) => [
              definition.key,
              {
                ...definition,

                expected: 0,
                available: 0,
                missing: 0,
                completionPct: 0,
                hasData: false,
              },
            ]
          )
        );

      rawBranches.forEach(
        (item) => {
          const key =
            canonicalBranch(
              item.branch
            );

          if (
            !map.has(
              key
            )
          ) {
            return;
          }

          const current =
            map.get(
              key
            );

          const expected =
            current.expected +
            numberValue(
              item.expected
            );

          const available =
            current.available +
            numberValue(
              item.available
            );

          map.set(
            key,
            {
              ...current,

              expected,
              available,

              missing:
                Math.max(
                  0,
                  expected -
                    available
                ),

              completionPct:
                expected > 0
                  ? (
                      available /
                      expected
                    ) *
                    100
                  : numberValue(
                      item.completionPct
                    ),

              hasData:
                true,
            }
          );
        }
      );

      return Array.from(
        map.values()
      );
    }, [
      rawBranches,
    ]);

  /* =========================================================
     NORMALIZED SEMESTERS
  ========================================================= */

  const semesters =
    useMemo(
      () =>
        rawSemesters.map(
          (item) => ({
            ...item,

            branch:
              canonicalBranch(
                item.branch
              ),

            completionPct:
              completionValue(
                item
              ),
          })
        ),
      [rawSemesters]
    );

  /* =========================================================
     NORMALIZED SUBJECTS
  ========================================================= */

  const subjects =
    useMemo(
      () =>
        rawSubjects.map(
          (item) => ({
            ...item,

            branch:
              canonicalBranch(
                item.branch
              ),

            completionPct:
              completionValue(
                item
              ),
          })
        ),
      [rawSubjects]
    );

  /* =========================================================
     FILTERED SEMESTERS
  ========================================================= */

  const filteredSemesters =
    useMemo(
      () =>
        semesters
          .filter(
            (item) =>
              branch ===
                'All' ||
              item.branch ===
                branch
          )
          .sort(
            (
              a,
              b
            ) =>
              numberValue(
                a.semester
              ) -
              numberValue(
                b.semester
              )
          ),
      [
        semesters,
        branch,
      ]
    );

  /* =========================================================
     FILTERED SUBJECTS
  ========================================================= */

  const filteredSubjects =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      const result =
        subjects.filter(
          (item) => {
            const branchMatches =
              branch ===
                'All' ||
              item.branch ===
                branch;

            const semesterMatches =
              semester ===
                'All' ||
              numberValue(
                item.semester
              ) ===
                numberValue(
                  semester
                );

            const yearMatches =
              activeYear ===
                'All' ||
              (
                item.availableYears ||
                []
              ).some(
                (year) =>
                  String(
                    year
                  ) ===
                  String(
                    activeYear
                  )
              ) ||
              (
                item.missingSlots ||
                []
              ).some(
                (slot) =>
                  String(
                    slot.year
                  ) ===
                  String(
                    activeYear
                  )
              );

            const completion =
              completionValue(
                item
              );

            const statusMatches =
              subjectStatus ===
                'all' ||
              (
                subjectStatus ===
                  'complete' &&
                numberValue(
                  item.missing
                ) === 0
              ) ||
              (
                subjectStatus ===
                  'gaps' &&
                numberValue(
                  item.missing
                ) > 0
              ) ||
              (
                subjectStatus ===
                  'critical' &&
                completion < 40
              );

            const searchPool =
              [
                item.subject,
                item.subjectCode,
                item.shortCode,
                item.branch,
                `semester ${item.semester}`,
                `sem ${item.semester}`,
              ]
                .filter(
                  Boolean
                )
                .join(
                  ' '
                )
                .toLowerCase();

            return (
              branchMatches &&
              semesterMatches &&
              yearMatches &&
              statusMatches &&
              (
                !term ||
                searchPool.includes(
                  term
                )
              )
            );
          }
        );

      return result.sort(
        (a, b) => {
          if (
            sortBy ===
            'completion'
          ) {
            return (
              completionValue(
                a
              ) -
              completionValue(
                b
              )
            );
          }

          if (
            sortBy ===
            'name'
          ) {
            return String(
              a.subject ||
                ''
            ).localeCompare(
              String(
                b.subject ||
                  ''
              )
            );
          }

          return (
            numberValue(
              b.missing
            ) -
              numberValue(
                a.missing
              ) ||
            completionValue(
              a
            ) -
              completionValue(
                b
              )
          );
        }
      );
    }, [
      subjects,
      branch,
      semester,
      search,
      subjectStatus,
      sortBy,
      activeYear,
    ]);

  /* =========================================================
     YEARS
  ========================================================= */

  const years =
    useMemo(
      () =>
        [
          ...(
            data?.years ||
            []
          ),
        ].sort(
          (
            a,
            b
          ) =>
            numberValue(
              b.year
            ) -
            numberValue(
              a.year
            )
        ),
      [data]
    );

  /* =========================================================
     DERIVED SUMMARY
  ========================================================= */

  const overall =
    numberValue(
      summary.completionPct
    );

  const missing =
    numberValue(
      summary.missingSlots
    );

  const available =
    numberValue(
      summary.availableSlots
    );

  const expected =
    numberValue(
      summary.expectedSlots
    );

  const completeSubjects =
    subjects.filter(
      (item) =>
        numberValue(
          item.missing
        ) === 0
    ).length;

  const criticalSubjects =
    subjects.filter(
      (item) =>
        completionValue(
          item
        ) < 40
    ).length;

  const activeFilters =
    [
      branch !== 'All',
      semester !== 'All',
      activeYear !==
        'All',
      subjectStatus !==
        'all',
      Boolean(
        search.trim()
      ),
    ].filter(
      Boolean
    ).length;

  /* =========================================================
     ACTIONS
  ========================================================= */

  function clearFilters() {
    setBranch('All');
    setSemester('All');
    setActiveYear(
      'All'
    );
    setSubjectStatus(
      'all'
    );
    setSearch('');
    setSortBy(
      'missing'
    );
  }

  function focusBranch(
    value
  ) {
    setBranch(
      value
    );

    setSemester(
      'All'
    );

    setExpandedKey(
      ''
    );

    document
      .getElementById(
        'archive-subject-map'
      )
      ?.scrollIntoView({
        behavior:
          'smooth',
        block:
          'start',
      });
  }

  function focusSemester(
    item
  ) {
    setBranch(
      item.branch
    );

    setSemester(
      String(
        item.semester
      )
    );

    setExpandedKey(
      ''
    );

    document
      .getElementById(
        'archive-subject-map'
      )
      ?.scrollIntoView({
        behavior:
          'smooth',
        block:
          'start',
      });
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <main className="ac-page">
        <div className="ac-shell">
          <section className="ac-loading">
            <span className="ac-loader" />

            <strong>
              Mapping the archive…
            </strong>

            <p>
              Calculating coverage
              across branches,
              semesters, subjects
              and years.
            </p>
          </section>
        </div>
      </main>
    );
  }

  /* =========================================================
     ERROR
  ========================================================= */

  if (!data) {
    return (
      <main className="ac-page">
        <div className="ac-shell">
          <section className="ac-empty">
            <CircleAlert
              size={26}
            />

            <h1>
              Archive progress is
              unavailable.
            </h1>

            <p>
              Refresh the page or
              check that the
              PaperStack backend is
              running.
            </p>

            <button
              type="button"
              onClick={
                load
              }
            >
              <RefreshCw
                size={13}
              />

              Try again
            </button>
          </section>
        </div>
      </main>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="ac-page">
      <Helmet>
        <title>
          Archive Progress -
          PaperStack
        </title>

        <meta
          name="description"
          content="Track how complete the IIIT Surat PaperStack archive is by branch, semester, subject, year and exam type."
        />
      </Helmet>

      <div className="ac-shell">
        {/* =================================================
            TOP NAV
        ================================================= */}

        <div className="ac-topline">
          <Link
            to="/"
            className="ac-back"
          >
            <ArrowLeft
              size={13}
            />

            Archive
          </Link>

          <button
            type="button"
            onClick={load}
          >
            <RefreshCw
              size={12}
            />

            Refresh live data
          </button>
        </div>

        {/* =================================================
            COVERAGE ATLAS HEADER
        ================================================= */}

        <header className="ac-header">
          <div className="ac-header-copy">
            <span className="ac-eyebrow">
              <LibraryBig
                size={15}
              />

              Archive Coverage Atlas
            </span>

            <h1>
              See exactly
              <br />

              <span>
                what is still missing.
              </span>
            </h1>

            <p>
              PaperStack treats each
              expected subject,
              examination and year
              combination as an
              archive slot. This page
              works like a map of the
              archive: complete areas
              stay green, weak areas
              show where students can
              help.
            </p>

            <div className="ac-header-actions">
              <Link to="/missing-papers">
                Find missing papers

                <ArrowRight
                  size={13}
                />
              </Link>

              <Link to="/contribute">
                Contribute paper
              </Link>
            </div>
          </div>

          {/* ===============================================
              MASTER METER
          =============================================== */}

          <aside className="ac-master-meter">
            <header>
              <span>
                Archive coverage
              </span>

              <Database
                size={17}
              />
            </header>

            <div className="ac-master-number">
              <strong>
                {pct(
                  overall
                )}
              </strong>

              <span>
                complete
              </span>
            </div>

            <ProgressBar
              value={
                overall
              }
            />

            <div className="ac-master-ledger">
              <span>
                <b>
                  {formatNumber(
                    available
                  )}
                </b>

                available
              </span>

              <span>
                <b>
                  {formatNumber(
                    missing
                  )}
                </b>

                missing
              </span>

              <span>
                <b>
                  {formatNumber(
                    expected
                  )}
                </b>

                expected
              </span>
            </div>

            <Link to="/missing-papers">
              Work on a gap

              <ArrowRight
                size={12}
              />
            </Link>
          </aside>
        </header>

        {/* =================================================
            ARCHIVE LEDGER
        ================================================= */}

        <section className="ac-ledger">
          <div>
            <span>
              Expected slots
            </span>

            <strong>
              {formatNumber(
                summary.expectedSlots
              )}
            </strong>

            <small>
              catalog × year × exam
            </small>
          </div>

          <div>
            <span>
              Covered slots
            </span>

            <strong>
              {formatNumber(
                summary.availableSlots
              )}
            </strong>

            <small>
              currently available
            </small>
          </div>

          <div>
            <span>
              Missing slots
            </span>

            <strong>
              {formatNumber(
                summary.missingSlots
              )}
            </strong>

            <small>
              contribution targets
            </small>
          </div>

          <div>
            <span>
              Complete subjects
            </span>

            <strong>
              {
                completeSubjects
              }
            </strong>

            <small>
              no known gaps
            </small>
          </div>

          <div>
            <span>
              Critical subjects
            </span>

            <strong>
              {
                criticalSubjects
              }
            </strong>

            <small>
              below 40% coverage
            </small>
          </div>
        </section>

        {/* =================================================
            BRANCH MAP
        ================================================= */}

        <section className="ac-section ac-branch-section">
          <header className="ac-section-head">
            <div>
              <span>
                Branch Map
              </span>

              <h2>
                Coverage across
                IIIT Surat
              </h2>

              <p>
                Click a branch to
                inspect its semesters
                and exact subject gaps.
              </p>
            </div>

            <Layers3
              size={21}
            />
          </header>

          <div className="ac-branch-map">
            {branches.map(
              (
                item,
                index
              ) => {
                const score =
                  completionValue(
                    item
                  );

                const active =
                  branch ===
                  item.key;

                return (
                  <button
                    type="button"
                    key={
                      item.key
                    }
                    className={[
                      completionClass(
                        score
                      ),
                      active
                        ? 'active'
                        : '',
                      !item.hasData
                        ? 'no-data'
                        : '',
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' '
                      )}
                    onClick={() =>
                      focusBranch(
                        active
                          ? 'All'
                          : item.key
                      )
                    }
                  >
                    <span className="ac-branch-index">
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        '0'
                      )}
                    </span>

                    <span className="ac-branch-code">
                      {
                        item.short
                      }
                    </span>

                    <div className="ac-branch-copy">
                      <span>
                        {
                          item.name
                        }
                      </span>

                      <strong>
                        {item.hasData
                          ? pct(
                              score
                            )
                          : '—'}
                      </strong>

                      <small>
                        {item.hasData
                          ? `${formatNumber(
                              item.available
                            )}/${formatNumber(
                              item.expected
                            )} slots covered`
                          : 'Catalog coverage data not available'}
                      </small>

                      <ProgressBar
                        value={
                          score
                        }
                        compact
                      />
                    </div>

                    <ArrowRight
                      size={14}
                    />
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* =================================================
            SEMESTER HEATMAP
        ================================================= */}

        <section className="ac-section">
          <header className="ac-section-head">
            <div>
              <span>
                Semester Heatmap
              </span>

              <h2>
                Where are the
                biggest gaps?
              </h2>

              <p>
                Darker incomplete
                cells need more
                archive work.
              </p>
            </div>

            <div className="ac-semester-control">
              <label>
                <span>
                  Branch
                </span>

                <select
                  value={
                    branch
                  }
                  onChange={(
                    event
                  ) => {
                    setBranch(
                      event.target
                        .value
                    );

                    setSemester(
                      'All'
                    );
                  }}
                >
                  <option value="All">
                    All branches
                  </option>

                  {OFFICIAL_BRANCHES.map(
                    (
                      item
                    ) => (
                      <option
                        key={
                          item.key
                        }
                        value={
                          item.key
                        }
                      >
                        {
                          item.key
                        }
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>
          </header>

          {filteredSemesters.length ? (
            <div className="ac-semester-map">
              {filteredSemesters.map(
                (
                  item
                ) => {
                  const score =
                    completionValue(
                      item
                    );

                  const selected =
                    branch ===
                      item.branch &&
                    String(
                      semester
                    ) ===
                      String(
                        item.semester
                      );

                  const definition =
                    branchDefinition(
                      item.branch
                    );

                  return (
                    <button
                      type="button"
                      key={`${item.branch}-${item.semester}`}
                      className={[
                        completionClass(
                          score
                        ),
                        selected
                          ? 'active'
                          : '',
                      ]
                        .filter(
                          Boolean
                        )
                        .join(
                          ' '
                        )}
                      onClick={() =>
                        focusSemester(
                          item
                        )
                      }
                    >
                      <div className="ac-semester-top">
                        <span>
                          {
                            definition.short
                          }
                        </span>

                        <b>
                          Sem{' '}
                          {
                            item.semester
                          }
                        </b>
                      </div>

                      <strong>
                        {pct(
                          score
                        )}
                      </strong>

                      <ProgressBar
                        value={
                          score
                        }
                        compact
                      />

                      <div className="ac-semester-bottom">
                        <span>
                          {
                            item.available
                          }
                          /
                          {
                            item.expected
                          }
                        </span>

                        <span>
                          {
                            item.missing
                          }{' '}
                          missing
                        </span>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          ) : (
            <div className="ac-inline-empty">
              No semester coverage
              data exists for this
              branch yet.
            </div>
          )}
        </section>

        {/* =================================================
            YEAR TIMELINE
        ================================================= */}

        <section className="ac-section">
          <header className="ac-section-head">
            <div>
              <span>
                Archive Timeline
              </span>

              <h2>
                Historical depth
              </h2>

              <p>
                Select a year to
                narrow the subject
                map below.
              </p>
            </div>

            <CalendarRange
              size={21}
            />
          </header>

          <div className="ac-year-timeline">
            <button
              type="button"
              className={
                activeYear ===
                'All'
                  ? 'active'
                  : ''
              }
              onClick={() =>
                setActiveYear(
                  'All'
                )
              }
            >
              <span>
                ALL
              </span>

              <strong>
                Full archive
              </strong>

              <small>
                Every tracked year
              </small>
            </button>

            {years.map(
              (item) => {
                const score =
                  completionValue(
                    item
                  );

                return (
                  <button
                    type="button"
                    key={
                      item.year
                    }
                    className={[
                      completionClass(
                        score
                      ),
                      String(
                        activeYear
                      ) ===
                      String(
                        item.year
                      )
                        ? 'active'
                        : '',
                    ]
                      .filter(
                        Boolean
                      )
                      .join(
                        ' '
                      )}
                    onClick={() =>
                      setActiveYear(
                        String(
                          item.year
                        )
                      )
                    }
                  >
                    <span>
                      {
                        item.year
                      }
                    </span>

                    <strong>
                      {pct(
                        score
                      )}
                    </strong>

                    <small>
                      {
                        item.missing
                      }{' '}
                      missing
                    </small>

                    <ProgressBar
                      value={
                        score
                      }
                      compact
                    />
                  </button>
                );
              }
            )}
          </div>
        </section>

        {/* =================================================
            SUBJECT GAP MAP
        ================================================= */}

        <section
          className="ac-section ac-subject-section"
          id="archive-subject-map"
        >
          <header className="ac-subject-header">
            <div>
              <span>
                Subject Gap Map
              </span>

              <h2>
                Fill the exact
                missing slots
              </h2>

              <p>
                Use the filters,
                open a subject and
                contribute directly
                into a missing year
                or exam slot.
              </p>
            </div>

            <Target
              size={21}
            />
          </header>

          {/* ===============================================
              FILTER BAR
          =============================================== */}

          <div className="ac-filter-bar">
            <label className="ac-search">
              <Search
                size={14}
              />

              <input
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                placeholder="Search subject or code..."
              />

              {search && (
                <button
                  type="button"
                  onClick={() =>
                    setSearch(
                      ''
                    )
                  }
                  aria-label="Clear search"
                >
                  <X
                    size={12}
                  />
                </button>
              )}
            </label>

            <label>
              <span>
                Branch
              </span>

              <select
                value={
                  branch
                }
                onChange={(
                  event
                ) => {
                  setBranch(
                    event.target
                      .value
                  );

                  setSemester(
                    'All'
                  );
                }}
              >
                <option value="All">
                  All branches
                </option>

                {OFFICIAL_BRANCHES.map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item.key
                      }
                      value={
                        item.key
                      }
                    >
                      {
                        item.key
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Semester
              </span>

              <select
                value={
                  semester
                }
                onChange={(
                  event
                ) =>
                  setSemester(
                    event.target
                      .value
                  )
                }
              >
                <option value="All">
                  All semesters
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
                  (
                    value
                  ) => (
                    <option
                      key={
                        value
                      }
                      value={
                        value
                      }
                    >
                      Semester{' '}
                      {
                        value
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

              <select
                value={
                  activeYear
                }
                onChange={(
                  event
                ) =>
                  setActiveYear(
                    event.target
                      .value
                  )
                }
              >
                <option value="All">
                  All years
                </option>

                {years.map(
                  (
                    item
                  ) => (
                    <option
                      key={
                        item.year
                      }
                      value={
                        item.year
                      }
                    >
                      {
                        item.year
                      }
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>
                Coverage
              </span>

              <select
                value={
                  subjectStatus
                }
                onChange={(
                  event
                ) =>
                  setSubjectStatus(
                    event.target
                      .value
                  )
                }
              >
                <option value="all">
                  All subjects
                </option>

                <option value="critical">
                  Critical
                </option>

                <option value="gaps">
                  Has gaps
                </option>

                <option value="complete">
                  Complete
                </option>
              </select>
            </label>

            <label>
              <span>
                Sort
              </span>

              <select
                value={
                  sortBy
                }
                onChange={(
                  event
                ) =>
                  setSortBy(
                    event.target
                      .value
                  )
                }
              >
                <option value="missing">
                  Most missing
                </option>

                <option value="completion">
                  Lowest coverage
                </option>

                <option value="name">
                  Subject A-Z
                </option>
              </select>
            </label>

            {activeFilters >
              0 && (
              <button
                type="button"
                className="ac-clear"
                onClick={
                  clearFilters
                }
              >
                <X
                  size={12}
                />

                Clear

                <b>
                  {
                    activeFilters
                  }
                </b>
              </button>
            )}
          </div>

          {/* ===============================================
              RESULT SUMMARY
          =============================================== */}

          <div className="ac-results-line">
            <span>
              Showing{' '}
              <strong>
                {
                  filteredSubjects.length
                }
              </strong>{' '}
              subject
              {filteredSubjects.length ===
              1
                ? ''
                : 's'}
            </span>

            <span>
              {branch !==
              'All'
                ? branch
                : 'All branches'}

              {semester !==
                'All'
                ? ` · Semester ${semester}`
                : ''}

              {activeYear !==
                'All'
                ? ` · ${activeYear}`
                : ''}
            </span>
          </div>

          {/* ===============================================
              SUBJECT LEDGER HEADER
          =============================================== */}

          {!!filteredSubjects.length && (
            <div className="ac-subject-list-head">
              <span>
                Subject
              </span>

              <span>
                Coverage
              </span>

              <span>
                Archive slots
              </span>

              <span>
                Status
              </span>

              <span>
                Action
              </span>
            </div>
          )}

          {/* ===============================================
              SUBJECTS
          =============================================== */}

          <div className="ac-subject-list">
            {filteredSubjects.map(
              (
                item
              ) => {
                const rowKey =
                  `${item.branch}-${item.semester}-${item.subjectKey}`;

                const expanded =
                  expandedKey ===
                  rowKey;

                const score =
                  completionValue(
                    item
                  );

                const definition =
                  branchDefinition(
                    item.branch
                  );

                return (
                  <article
                    className={`ac-subject-row ${completionClass(
                      score
                    )} ${
                      expanded
                        ? 'expanded'
                        : ''
                    }`}
                    key={
                      rowKey
                    }
                  >
                    <div className="ac-subject-main">
                      {/* ===================================
                          SUBJECT
                      =================================== */}

                      <div className="ac-subject-identity">
                        <span className="ac-subject-code">
                          {item.shortCode ||
                            item.subjectCode ||
                            'SUB'}
                        </span>

                        <div>
                          <span>
                            {
                              definition.short
                            }{' '}
                            · Sem{' '}
                            {
                              item.semester
                            }
                          </span>

                          <h3>
                            {
                              item.subject
                            }
                          </h3>

                          <small>
                            {item.subjectCode ||
                              'Subject code'}
                          </small>
                        </div>
                      </div>

                      {/* ===================================
                          COVERAGE
                      =================================== */}

                      <div className="ac-subject-coverage">
                        <strong>
                          {pct(
                            score
                          )}
                        </strong>

                        <ProgressBar
                          value={
                            score
                          }
                          compact
                        />
                      </div>

                      {/* ===================================
                          SLOT COUNTS
                      =================================== */}

                      <div className="ac-subject-slots">
                        <strong>
                          {
                            item.available
                          }
                          /
                          {
                            item.expected
                          }
                        </strong>

                        <span>
                          {
                            item.availableYears
                              ?.length ||
                            0
                          }{' '}
                          years represented
                        </span>
                      </div>

                      {/* ===================================
                          STATUS
                      =================================== */}

                      <div className="ac-subject-status">
                        {numberValue(
                          item.missing
                        ) === 0 ? (
                          <CheckCircle2
                            size={14}
                          />
                        ) : (
                          <CircleAlert
                            size={14}
                          />
                        )}

                        <span>
                          {gapLabel(
                            item
                          )}
                        </span>
                      </div>

                      {/* ===================================
                          ACTIONS
                      =================================== */}

                      <div className="ac-subject-actions">
                        <Link
                          to={`/subject/${encodeURIComponent(
                            item.subjectCode ||
                              item.shortCode ||
                              item.subject
                          )}`}
                        >
                          Subject Hub
                        </Link>

                        {numberValue(
                          item.missing
                        ) >
                          0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedKey(
                                expanded
                                  ? ''
                                  : rowKey
                              )
                            }
                          >
                            {expanded
                              ? 'Hide gaps'
                              : `${item.missing} gaps`}

                            <ChevronDown
                              size={12}
                            />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* =====================================
                        EXPANDED GAP WORKSPACE
                    ===================================== */}

                    {expanded && (
                      <div className="ac-gap-workspace">
                        <header>
                          <div>
                            <span>
                              Missing
                              archive slots
                            </span>

                            <strong>
                              Contribute
                              directly into
                              one of these
                              gaps.
                            </strong>
                          </div>

                          <FilePlus2
                            size={18}
                          />
                        </header>

                        <div className="ac-gap-grid">
                          {(
                            item.missingSlots ||
                            []
                          ).map(
                            (
                              gap
                            ) => (
                              <Link
                                className="ac-gap-slot"
                                key={`${gap.year}-${gap.examType}`}
                                to={
                                  gap.contributionUrl
                                }
                              >
                                <div>
                                  <span>
                                    {
                                      gap.year
                                    }
                                  </span>

                                  <strong>
                                    {
                                      gap.examType
                                    }
                                  </strong>

                                  <small>
                                    Missing
                                    from archive
                                  </small>
                                </div>

                                <ArrowRight
                                  size={13}
                                />
                              </Link>
                            )
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              }
            )}

            {!filteredSubjects.length && (
              <div className="ac-no-results">
                <Search
                  size={22}
                />

                <strong>
                  No subjects match
                  these filters.
                </strong>

                <p>
                  Clear the filters
                  or choose another
                  branch, semester
                  or year.
                </p>

                <button
                  type="button"
                  onClick={
                    clearFilters
                  }
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </section>

        {/* =================================================
            CONTRIBUTION CTA
        ================================================= */}

        <section className="ac-contribution-strip">
          <div className="ac-contribution-icon">
            <BookOpenCheck
              size={22}
            />
          </div>

          <div>
            <span>
              Help finish the map
            </span>

            <h2>
              One old paper can
              close a real archive
              gap.
            </h2>

            <p>
              Check your Drive,
              gallery or old
              WhatsApp groups. If a
              missing paper exists,
              upload it and help
              future batches.
            </p>
          </div>

          <Link to="/contribute">
            Contribute paper

            <ArrowRight
              size={13}
            />
          </Link>
        </section>
      </div>
    </main>
  );
}