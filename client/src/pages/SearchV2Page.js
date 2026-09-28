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
  BookOpen,
  ChevronRight,
  ExternalLink,
  FileQuestion,
  FileText,
  FolderOpen,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';

import {
  searchPaperStack,
} from '../services/searchV2Api';
import { OFFICIAL_BRANCHES } from '../config/branches';

import './SearchV2Page.css';

/* =========================================================
   RESULT HELPERS
========================================================= */

function resultTypeLabel(type) {
  const labels = {
    paper: 'Paper',
    resource: 'Resource',
    question: 'Question',
    subject: 'Subject',
  };

  return labels[type] || type;
}

function ResultIcon({
  type,
  size = 20,
}) {
  if (type === 'paper') {
    return <FileText size={size} />;
  }

  if (type === 'resource') {
    return <FolderOpen size={size} />;
  }

  if (type === 'question') {
    return <FileQuestion size={size} />;
  }

  return <BookOpen size={size} />;
}

function resultMeta(item) {
  return [
    item.subjectCode,

    item.branch ||
      (item.branches || []).join('/'),

    item.semester
      ? `Sem ${item.semester}`
      : (item.semesters || []).length
      ? `Sem ${(item.semesters || []).join(', ')}`
      : '',

    item.year,
    item.examType,
    item.kind,

    item.marks != null
      ? `${item.marks} marks`
      : '',
  ]
    .filter(Boolean)
    .join(' · ');
}

function safeScore(value) {
  const score = Math.round(
    Number(value || 0)
  );

  return Math.min(
    100,
    Math.max(0, score)
  );
}

/* =========================================================
   TYPE TABS
========================================================= */

const SEARCH_TYPES = [
  {
    value: 'all',
    label: 'Everything',
  },
  {
    value: 'paper',
    label: 'Papers',
  },
  {
    value: 'resource',
    label: 'Resources',
  },
  {
    value: 'question',
    label: 'Questions',
  },
  {
    value: 'subject',
    label: 'Subjects',
  },
];

/* =========================================================
   MAIN PAGE
========================================================= */

export default function SearchV2Page({
  toast,
}) {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [query, setQuery] =
    useState(
      searchParams.get('q') || ''
    );

  const [type, setType] =
    useState(
      searchParams.get('type') ||
        'all'
    );

  const [branch, setBranch] =
    useState(
      searchParams.get('branch') ||
        ''
    );

  const [
    semester,
    setSemester,
  ] = useState(
    searchParams.get(
      'semester'
    ) || ''
  );

  const [year, setYear] =
    useState(
      searchParams.get('year') ||
        ''
    );

  const [
    examType,
    setExamType,
  ] = useState(
    searchParams.get(
      'examType'
    ) || ''
  );

  const [data, setData] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const paramsKey =
    searchParams.toString();

  const hasExecutedSearch =
    Boolean(paramsKey);

  /* =========================================================
     SEARCH
  ========================================================= */

  function runSearch(
    overrides = {}
  ) {
    const next = {
      q:
        overrides.q ??
        query,

      type:
        overrides.type ??
        type,

      branch:
        overrides.branch ??
        branch,

      semester:
        overrides.semester ??
        semester,

      year:
        overrides.year ??
        year,

      examType:
        overrides.examType ??
        examType,
    };

    const params =
      new URLSearchParams();

    Object.entries(
      next
    ).forEach(
      ([key, value]) => {
        if (
          value &&
          !(
            key === 'type' &&
            value === 'all'
          )
        ) {
          params.set(
            key,
            String(value)
          );
        }
      }
    );

    const nextKey =
      params.toString();

    /*
      If search parameters are unchanged,
      run the request again instead of
      relying on the URL effect.
    */

    if (
      nextKey === paramsKey
    ) {
      setLoading(true);

      searchPaperStack({
        ...next,
        limit: 36,
      })
        .then(setData)

        .catch((error) => {
          toast?.(
            error.response?.data
              ?.error ||
              'Search failed.',
            'error'
          );
        })

        .finally(() =>
          setLoading(false)
        );

      return;
    }

    setSearchParams(
      params,
      {
        replace: true,
      }
    );
  }

  /* =========================================================
     URL → SEARCH
  ========================================================= */

  useEffect(() => {
    const current =
      new URLSearchParams(
        paramsKey
      );

    const initial = {
      q:
        current.get('q') ||
        '',

      type:
        current.get(
          'type'
        ) || 'all',

      branch:
        current.get(
          'branch'
        ) || '',

      semester:
        current.get(
          'semester'
        ) || '',

      year:
        current.get(
          'year'
        ) || '',

      examType:
        current.get(
          'examType'
        ) || '',
    };

    setQuery(initial.q);
    setType(initial.type);
    setBranch(initial.branch);
    setSemester(
      initial.semester
    );
    setYear(initial.year);
    setExamType(
      initial.examType
    );

    const active =
      Boolean(
        initial.q ||
          initial.branch ||
          initial.semester ||
          initial.year ||
          initial.examType ||
          initial.type !==
            'all'
      );

    if (!active) {
      setData(null);
      setLoading(false);

      return undefined;
    }

    let mounted = true;

    setLoading(true);

    searchPaperStack({
      ...initial,
      limit: 36,
    })
      .then((result) => {
        if (mounted) {
          setData(result);
        }
      })

      .catch((error) => {
        if (
          mounted &&
          toast
        ) {
          toast(
            error.response?.data
              ?.error ||
              'Search failed.',
            'error'
          );
        }
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
    paramsKey,
    toast,
  ]);

  /* =========================================================
     INFERRED QUERY
  ========================================================= */

  const inferredChips =
    useMemo(() => {
      const inferred =
        data?.inferred || {};

      return [
        inferred.subjectCode
          ? `${
              inferred.subjectName ||
              inferred.subjectCode
            } (${
              inferred.subjectCode
            })`
          : '',

        inferred.branch || '',

        inferred.semester
          ? `Semester ${inferred.semester}`
          : '',

        inferred.examType || '',

        inferred.year || '',
      ].filter(Boolean);
    }, [data]);

  const activeFilterCount =
    useMemo(
      () =>
        [
          branch,
          semester,
          year,
          examType,
        ].filter(Boolean)
          .length,
      [
        branch,
        semester,
        year,
        examType,
      ]
    );

  /* =========================================================
     ACTIONS
  ========================================================= */

  function submit(event) {
    event.preventDefault();
    runSearch();
  }

  function changeType(value) {
    setType(value);

    /*
      If the user already has a search
      open, type tabs refresh results
      immediately.
    */

    if (
      hasExecutedSearch
    ) {
      runSearch({
        type: value,
      });
    }
  }

  function clearAll() {
    setQuery('');
    setType('all');
    setBranch('');
    setSemester('');
    setYear('');
    setExamType('');
    setData(null);

    setSearchParams(
      {},
      {
        replace: true,
      }
    );
  }

  function quickSearch(q) {
    setQuery(q);

    runSearch({
      q,
    });
  }

  /* =========================================================
     RESULT COUNTS
  ========================================================= */

  const counts = [
    {
      key: 'subjects',
      label: 'Subjects',
      value:
        data?.counts
          ?.subjects || 0,
    },
    {
      key: 'papers',
      label: 'Papers',
      value:
        data?.counts
          ?.papers || 0,
    },
    {
      key: 'resources',
      label: 'Resources',
      value:
        data?.counts
          ?.resources || 0,
    },
    {
      key: 'questions',
      label: 'Questions',
      value:
        data?.counts
          ?.questions || 0,
    },
  ];

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="s2-page">
      <Helmet>
        <title>
          Search - PaperStack
        </title>

        <meta
          name="description"
          content="Search PaperStack papers, questions, resources and subject hubs."
        />
      </Helmet>

      <div className="s2-shell">
        {/* ===============================================
            SEARCH HEADER
        =============================================== */}

        <header className="s2-header">
          <div>
            <span className="s2-eyebrow">
              <Search size={15} />
              PaperStack Search
            </span>

            <h1>
              Find what you need.
              <span>
                {' '}
                Skip the digging.
              </span>
            </h1>

            <p>
              Search across papers,
              questions, subjects and
              student resources from one
              place.
            </p>
          </div>
        </header>

        {/* ===============================================
            MAIN SEARCH BAR
        =============================================== */}

        <form
          className="s2-search"
          onSubmit={submit}
        >
          <Search
            className="s2-search-icon"
            size={21}
          />

          <input
            value={query}
            onChange={(event) =>
              setQuery(
                event.target.value
              )
            }
            placeholder="Search subject, paper, topic, question or code…"
            aria-label="Search PaperStack"
            autoFocus
          />

          {query && (
            <button
              type="button"
              className="s2-search-clear"
              aria-label="Clear search text"
              onClick={() =>
                setQuery('')
              }
            >
              <X size={16} />
            </button>
          )}

          <button
            type="submit"
            className="s2-search-submit"
          >
            Search
            <ArrowRight
              size={16}
            />
          </button>
        </form>

        <p className="s2-search-hint">
          Try{' '}
          <button
            type="button"
            onClick={() =>
              quickSearch(
                'CG CSE sem 5 mid sem 2025'
              )
            }
          >
            CG CSE sem 5 mid sem
            2025
          </button>

          <span>or</span>

          <button
            type="button"
            onClick={() =>
              quickSearch(
                'perspective projection'
              )
            }
          >
            perspective projection
          </button>
        </p>

        {/* ===============================================
            TYPE TABS
        =============================================== */}

        <section className="s2-type-tabs">
          <div
            role="tablist"
            aria-label="Search result type"
          >
            {SEARCH_TYPES.map(
              (item) => (
                <button
                  key={
                    item.value
                  }
                  type="button"
                  role="tab"
                  aria-selected={
                    type ===
                    item.value
                  }
                  onClick={() =>
                    changeType(
                      item.value
                    )
                  }
                >
                  {item.label}

                  {data &&
                    item.value !==
                      'all' && (
                      <span>
                        {item.value ===
                        'paper'
                          ? data
                              ?.counts
                              ?.papers ||
                            0
                          : item.value ===
                            'resource'
                          ? data
                              ?.counts
                              ?.resources ||
                            0
                          : item.value ===
                            'question'
                          ? data
                              ?.counts
                              ?.questions ||
                            0
                          : data
                              ?.counts
                              ?.subjects ||
                            0}
                      </span>
                    )}
                </button>
              )
            )}
          </div>
        </section>

        {/* ===============================================
            FILTERS
        =============================================== */}

        <section className="s2-filters">
          <div className="s2-filter-heading">
            <div>
              <SlidersHorizontal
                size={17}
              />

              <span>
                Narrow results
              </span>

              {activeFilterCount >
                0 && (
                <b>
                  {
                    activeFilterCount
                  }
                </b>
              )}
            </div>

            {activeFilterCount >
              0 && (
              <button
                type="button"
                className="s2-reset-filters"
                onClick={() => {
                  setBranch('');
                  setSemester('');
                  setYear('');
                  setExamType('');
                }}
              >
                Reset filters
              </button>
            )}
          </div>

          <div className="s2-filter-grid">
            <label>
              <span>Branch</span>

              <select
                value={branch}
                onChange={(event) =>
                  setBranch(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Any branch
                </option>

                {OFFICIAL_BRANCHES.map(({ key, name }) => <option key={key} value={key}>{name}</option>)}
              </select>
            </label>

            <label>
              <span>Semester</span>

              <select
                value={semester}
                onChange={(event) =>
                  setSemester(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Any semester
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
                  (item) => (
                    <option
                      value={item}
                      key={item}
                    >
                      Semester {item}
                    </option>
                  )
                )}
              </select>
            </label>

            <label>
              <span>Year</span>

              <input
                value={year}
                onChange={(event) =>
                  setYear(
                    event.target.value
                  )
                }
                inputMode="numeric"
                placeholder="e.g. 2025"
              />
            </label>

            <label>
              <span>
                Exam type
              </span>

              <select
                value={examType}
                onChange={(event) =>
                  setExamType(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Any exam
                </option>

                <option value="Mid-Sem">
                  Mid-Sem
                </option>

                <option value="End-Sem">
                  End-Sem
                </option>
              </select>
            </label>

            <button
              type="button"
              className="s2-apply"
              onClick={() =>
                runSearch()
              }
            >
              Apply Filters
            </button>

            <button
              type="button"
              className="s2-clear-all"
              onClick={clearAll}
            >
              <X size={14} />
              Clear All
            </button>
          </div>
        </section>

        {/* ===============================================
            QUERY UNDERSTANDING
        =============================================== */}

        {inferredChips.length >
          0 && (
          <section className="s2-intent">
            <span>
              PaperStack understood:
            </span>

            <div>
              {inferredChips.map(
                (chip) => (
                  <b
                    key={String(
                      chip
                    )}
                  >
                    {chip}
                  </b>
                )
              )}
            </div>
          </section>
        )}

        {/* ===============================================
            START STATE
        =============================================== */}

        {!loading &&
          !hasExecutedSearch && (
            <section className="s2-start">
              <div className="s2-start-icon">
                <Search size={29} />
              </div>

              <h2>
                Start with whatever you
                remember.
              </h2>

              <p>
                Subject name, code,
                topic, year or exam type
                — the search does not
                need perfect wording.
              </p>

              <div className="s2-example-grid">
                <button
                  type="button"
                  onClick={() =>
                    quickSearch(
                      'Computer Graphics Mid-Sem 2025'
                    )
                  }
                >
                  <FileText
                    size={17}
                  />

                  <span>
                    <strong>
                      Find a paper
                    </strong>

                    <small>
                      Computer Graphics
                      Mid-Sem 2025
                    </small>
                  </span>

                  <ChevronRight
                    size={16}
                  />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    quickSearch(
                      'perspective projection'
                    )
                  }
                >
                  <FileQuestion
                    size={17}
                  />

                  <span>
                    <strong>
                      Find a topic
                    </strong>

                    <small>
                      perspective
                      projection
                    </small>
                  </span>

                  <ChevronRight
                    size={16}
                  />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    quickSearch(
                      'CS504'
                    )
                  }
                >
                  <BookOpen
                    size={17}
                  />

                  <span>
                    <strong>
                      Search by code
                    </strong>

                    <small>
                      CS504
                    </small>
                  </span>

                  <ChevronRight
                    size={16}
                  />
                </button>
              </div>
            </section>
          )}

        {/* ===============================================
            LOADING
        =============================================== */}

        {loading && (
          <section className="s2-loading">
            <span className="s2-spinner" />

            <div>
              <strong>
                Searching PaperStack…
              </strong>

              <p>
                Checking subjects,
                papers, resources and
                extracted questions.
              </p>
            </div>
          </section>
        )}

        {/* ===============================================
            RESULTS
        =============================================== */}

        {!loading &&
          hasExecutedSearch && (
            <section className="s2-results">
              <header className="s2-result-head">
                <div>
                  <span className="s2-eyebrow">
                    Search Results
                  </span>

                  <h2>
                    {data?.counts
                      ?.returned || 0}{' '}
                    best matches
                  </h2>

                  {query && (
                    <p>
                      For “{query}”
                    </p>
                  )}
                </div>

                <div className="s2-result-counts">
                  {counts.map(
                    (item) => (
                      <span
                        key={
                          item.key
                        }
                      >
                        <b>
                          {
                            item.value
                          }
                        </b>

                        {
                          item.label
                        }
                      </span>
                    )
                  )}
                </div>
              </header>

              {data?.results?.length ? (
                <div className="s2-list">
                  {data.results.map(
                    (item) => {
                      const score =
                        safeScore(
                          item.relevanceScore
                        );

                      return (
                        <article
                          key={`${item.type}-${item._id}`}
                          className={`s2-result-item s2-result-${item.type}`}
                        >
                          <div className="s2-result-icon">
                            <ResultIcon
                              type={
                                item.type
                              }
                            />
                          </div>

                          <div className="s2-body">
                            <div className="s2-result-topline">
                              <span className="s2-type">
                                {resultTypeLabel(
                                  item.type
                                )}
                              </span>

                              {resultMeta(
                                item
                              ) && (
                                <span className="s2-meta">
                                  {resultMeta(
                                    item
                                  )}
                                </span>
                              )}
                            </div>

                            <h3>
                              {
                                item.title
                              }
                            </h3>

                            {item.type ===
                              'question' &&
                              item.primaryTopic && (
                                <p>
                                  Topic:{' '}
                                  {
                                    item.primaryTopic
                                  }
                                </p>
                              )}

                            <div className="s2-actions">
                              {item.actionUrl && (
                                <Link
                                  to={
                                    item.actionUrl
                                  }
                                >
                                  Open
                                  <ArrowRight
                                    size={
                                      14
                                    }
                                  />
                                </Link>
                              )}

                              {item.fileUrl && (
                                <a
                                  href={
                                    item.fileUrl
                                  }
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <ExternalLink
                                    size={
                                      13
                                    }
                                  />
                                  Open File
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="s2-score">
                            <div>
                              <strong>
                                {score}%
                              </strong>

                              <span>
                                match
                              </span>
                            </div>

                            <div className="s2-score-track">
                              <span
                                style={{
                                  width: `${score}%`,
                                }}
                              />
                            </div>
                          </div>
                        </article>
                      );
                    }
                  )}
                </div>
              ) : (
                <section className="s2-empty">
                  <span>
                    <Search
                      size={28}
                    />
                  </span>

                  <h3>
                    No strong matches
                    found.
                  </h3>

                  <p>
                    Try removing a filter,
                    searching a subject
                    code, or using fewer
                    words.
                  </p>

                  <button
                    type="button"
                    onClick={clearAll}
                  >
                    Clear Search
                  </button>
                </section>
              )}
            </section>
          )}
      </div>
    </main>
  );
}
