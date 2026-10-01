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
  useNavigate,
} from 'react-router-dom';

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Eye,
  FileCheck2,
  FileSearch,
  Filter,
  Flag,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react';

import {
  getVerificationQueue,
} from '../services/verificationApi';

import PaperVerificationModal, {
  VerificationStatusBadge,
} from '../components/PaperVerificationModal';

import './VerificationPage.css';

/* =========================================================
   HELPERS
========================================================= */

const STATUS_OPTIONS = [
  {
    value: 'all',
    label: 'All papers',
  },
  {
    value: 'unverified',
    label: 'Not checked',
  },
  {
    value: 'collecting',
    label: 'Collecting checks',
  },
  {
    value: 'verified',
    label: 'Verified',
  },
  {
    value: 'needs-review',
    label: 'Needs review',
  },
];

function numberOrZero(
  value
) {
  return Number(
    value || 0
  );
}

function formatPercent(
  value
) {
  if (
    value == null ||
    Number.isNaN(
      Number(value)
    )
  ) {
    return '—';
  }

  return `${Math.round(
    Number(value)
  )}%`;
}

function confidenceClass(
  value
) {
  if (
    value == null
  ) {
    return 'unknown';
  }

  const number =
    Number(value);

  if (number >= 85) {
    return 'strong';
  }

  if (number >= 65) {
    return 'medium';
  }

  return 'weak';
}

function statusPriority(
  status
) {
  if (
    status ===
    'needs-review'
  ) {
    return 0;
  }

  if (
    status ===
    'unverified'
  ) {
    return 1;
  }

  if (
    status ===
    'collecting'
  ) {
    return 2;
  }

  if (
    status ===
    'verified'
  ) {
    return 3;
  }

  return 4;
}

function verificationProgress(
  summary
) {
  const responses =
    numberOrZero(
      summary?.totalResponses
    );

  const metadata =
    summary
      ?.metadataCorrectPercentage;

  const pdf =
    summary
      ?.pdfReadablePercentage;

  if (
    !responses &&
    metadata == null &&
    pdf == null
  ) {
    return 0;
  }

  const values = [
    metadata,
    pdf,
  ].filter(
    (value) =>
      value != null
  );

  if (!values.length) {
    return Math.min(
      100,
      responses * 25
    );
  }

  return Math.round(
    values.reduce(
      (
        sum,
        value
      ) =>
        sum +
        Number(value),
      0
    ) /
      values.length
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function VerificationPage({
  user,
  toast,
}) {
  const navigate =
    useNavigate();

  const [
    data,
    setData,
  ] = useState({
    items: [],
    stats: {},
  });

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    status,
    setStatus,
  ] =
    useState('all');

  const [
    search,
    setSearch,
  ] =
    useState('');

  const [
    sortBy,
    setSortBy,
  ] =
    useState(
      'priority'
    );

  const [
    selectedPaper,
    setSelectedPaper,
  ] =
    useState(null);

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
            await getVerificationQueue({
              limit: 150,
            });

          setData(
            result || {
              items: [],
              stats: {},
            }
          );
        } catch (error) {
          console.error(
            'Verification queue load failed:',
            error
          );

          toast?.(
            'Failed to load verification queue',
            'error'
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
     FILTERED QUEUE
  ========================================================= */

  const filtered =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase();

      const items =
        (
          data.items ||
          []
        ).filter(
          (item) => {
            const summary =
              item.summary ||
              {};

            const paper =
              item.paper ||
              {};

            const statusMatches =
              status ===
                'all' ||
              summary.status ===
                status;

            const pool =
              [
                paper.subject,
                paper.subjectCode,
                paper.branch,
                paper.semester,
                paper.year,
                paper.examType,
              ]
                .filter(
                  Boolean
                )
                .join(' ')
                .toLowerCase();

            return (
              statusMatches &&
              (
                !term ||
                pool.includes(
                  term
                )
              )
            );
          }
        );

      return items.sort(
        (a, b) => {
          const aSummary =
            a.summary || {};

          const bSummary =
            b.summary || {};

          const aPaper =
            a.paper || {};

          const bPaper =
            b.paper || {};

          if (
            sortBy ===
            'checks'
          ) {
            return (
              numberOrZero(
                bSummary.totalResponses
              ) -
              numberOrZero(
                aSummary.totalResponses
              )
            );
          }

          if (
            sortBy ===
            'year'
          ) {
            return (
              numberOrZero(
                bPaper.year
              ) -
              numberOrZero(
                aPaper.year
              )
            );
          }

          if (
            sortBy ===
            'subject'
          ) {
            return String(
              aPaper.subject ||
                ''
            ).localeCompare(
              String(
                bPaper.subject ||
                  ''
              )
            );
          }

          const priority =
            statusPriority(
              aSummary.status
            ) -
            statusPriority(
              bSummary.status
            );

          if (priority) {
            return priority;
          }

          return (
            numberOrZero(
              aSummary.totalResponses
            ) -
            numberOrZero(
              bSummary.totalResponses
            )
          );
        }
      );
    }, [
      data.items,
      status,
      search,
      sortBy,
    ]);

  /* =========================================================
     STATS
  ========================================================= */

  const stats =
    data.stats || {};

  const total =
    numberOrZero(
      stats.total
    );

  const verified =
    numberOrZero(
      stats.verified
    );

  const unverified =
    numberOrZero(
      stats.unverified
    );

  const collecting =
    numberOrZero(
      stats.collecting
    );

  const needsReview =
    numberOrZero(
      stats[
        'needs-review'
      ]
    );

  const verifiedPercent =
    total
      ? Math.round(
          (
            verified /
            total
          ) *
            100
        )
      : 0;

  const remaining =
    unverified +
    collecting +
    needsReview;

  const activeFilters =
    Number(
      status !==
        'all'
    ) +
    Number(
      Boolean(
        search.trim()
      )
    );

  function clearFilters() {
    setStatus('all');
    setSearch('');
    setSortBy(
      'priority'
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <main className="vq-page">
      <Helmet>
        <title>
          Verify Papers -
          PaperStack
        </title>

        <meta
          name="description"
          content="Help verify IIIT Surat papers and improve the accuracy of PaperStack."
        />
      </Helmet>

      <div className="vq-shell">
        {/* =================================================
            AUDIT HEADER
        ================================================= */}

        <header className="vq-header">
          <div className="vq-header-copy">
            <span className="vq-kicker">
              <ShieldCheck
                size={15}
              />

              Verify Papers
            </span>

            <h1>
              Check the paper.
              <br />

              <span>
                Protect the archive.
              </span>
            </h1>

            <p>
              Verify whether paper
              details are correct and
              whether the uploaded PDF
              is readable. Independent
              student checks help keep
              PaperStack reliable.
            </p>

            <div className="vq-header-points">
              <span>
                <CheckCircle2
                  size={13}
                />

                Confirm metadata
              </span>

              <span>
                <CheckCircle2
                  size={13}
                />

                Check PDF quality
              </span>

              <span>
                <CheckCircle2
                  size={13}
                />

                Flag mistakes
              </span>
            </div>
          </div>

          <aside className="vq-audit-meter">
            <header>
              <span>
                Archive health
              </span>

              <ClipboardCheck
                size={17}
              />
            </header>

            <div className="vq-audit-score">
              <strong>
                {
                  verifiedPercent
                }
              </strong>

              <span>%</span>
            </div>

            <div className="vq-audit-track">
              <i
                style={{
                  width:
                    `${verifiedPercent}%`,
                }}
              />
            </div>

            <p>
              {verified} of{' '}
              {total}{' '}
              papers currently
              community verified.
            </p>

            <div className="vq-audit-bottom">
              <span>
                <b>
                  {remaining}
                </b>

                still active
              </span>

              <span>
                <b>
                  {needsReview}
                </b>

                flagged
              </span>
            </div>
          </aside>
        </header>

        {/* =================================================
            VERIFICATION PROCESS
        ================================================= */}

        <section className="vq-process">
          <div className="vq-process-title">
            <span>
              Verification process
            </span>

            <strong>
              Three quick checks.
            </strong>
          </div>

          <div className="vq-process-steps">
            <div>
              <span>
                01
              </span>

              <div>
                <strong>
                  Open paper
                </strong>

                <small>
                  Inspect the
                  uploaded file.
                </small>
              </div>
            </div>

            <i />

            <div>
              <span>
                02
              </span>

              <div>
                <strong>
                  Compare details
                </strong>

                <small>
                  Subject, year,
                  semester and exam.
                </small>
              </div>
            </div>

            <i />

            <div>
              <span>
                03
              </span>

              <div>
                <strong>
                  Submit check
                </strong>

                <small>
                  Confirm or report
                  an issue.
                </small>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            STATUS LEDGER
        ================================================= */}

        <section className="vq-status-ledger">
          <article>
            <span className="vq-ledger-icon">
              <FileSearch
                size={18}
              />
            </span>

            <div>
              <span>
                Archive queue
              </span>

              <strong>
                {total}
              </strong>

              <small>
                Papers tracked
              </small>
            </div>
          </article>

          <article>
            <span className="vq-ledger-icon waiting">
              <Eye
                size={18}
              />
            </span>

            <div>
              <span>
                Not checked
              </span>

              <strong>
                {
                  unverified
                }
              </strong>

              <small>
                Need first review
              </small>
            </div>
          </article>

          <article>
            <span className="vq-ledger-icon collecting">
              <Users
                size={18}
              />
            </span>

            <div>
              <span>
                Collecting
              </span>

              <strong>
                {
                  collecting
                }
              </strong>

              <small>
                More checks needed
              </small>
            </div>
          </article>

          <article className="vq-ledger-attention">
            <span className="vq-ledger-icon issue">
              <Flag
                size={18}
              />
            </span>

            <div>
              <span>
                Needs review
              </span>

              <strong>
                {
                  needsReview
                }
              </strong>

              <small>
                Possible issues
              </small>
            </div>
          </article>

          <article>
            <span className="vq-ledger-icon verified">
              <FileCheck2
                size={18}
              />
            </span>

            <div>
              <span>
                Verified
              </span>

              <strong>
                {
                  verified
                }
              </strong>

              <small>
                Community checked
              </small>
            </div>
          </article>
        </section>

        {/* =================================================
            QUEUE HEADER
        ================================================= */}

        <section className="vq-queue-section">
          <header className="vq-queue-heading">
            <div>
              <span>
                Verification Queue
              </span>

              <h2>
                Papers waiting for
                community checks.
              </h2>

              <p>
                Start with flagged or
                unverified papers where
                your review is most
                useful.
              </p>
            </div>

            <button
              type="button"
              className="vq-refresh"
              onClick={
                load
              }
              disabled={
                loading
              }
            >
              <RefreshCw
                size={13}
              />

              Refresh
            </button>
          </header>

          {/* ===============================================
              TOOLBAR
          =============================================== */}

          <div className="vq-toolbar">
            <div className="vq-status-tabs">
              {STATUS_OPTIONS.map(
                (
                  option
                ) => (
                  <button
                    type="button"
                    key={
                      option.value
                    }
                    className={
                      status ===
                      option.value
                        ? 'active'
                        : ''
                    }
                    onClick={() =>
                      setStatus(
                        option.value
                      )
                    }
                  >
                    {
                      option.label
                    }

                    {option.value !==
                      'all' && (
                      <span>
                        {numberOrZero(
                          stats[
                            option.value
                          ]
                        )}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>

            <div className="vq-toolbar-tools">
              <label className="vq-search">
                <Search
                  size={15}
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
                  placeholder="Search subject, code, year..."
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
                      size={13}
                    />
                  </button>
                )}
              </label>

              <label className="vq-sort">
                <SlidersHorizontal
                  size={14}
                />

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
                  <option value="priority">
                    Priority
                  </option>

                  <option value="checks">
                    Most checks
                  </option>

                  <option value="year">
                    Newest year
                  </option>

                  <option value="subject">
                    Subject A–Z
                  </option>
                </select>
              </label>

              {activeFilters >
                0 && (
                <button
                  type="button"
                  className="vq-clear"
                  onClick={
                    clearFilters
                  }
                >
                  <Filter
                    size={13}
                  />

                  Clear
                </button>
              )}
            </div>
          </div>

          {/* ===============================================
              TABLE HEADER
          =============================================== */}

          {!loading &&
            filtered.length >
              0 && (
            <div className="vq-list-head">
              <span>
                Status
              </span>

              <span>
                Paper
              </span>

              <span>
                Community checks
              </span>

              <span>
                Metadata
              </span>

              <span>
                PDF
              </span>

              <span>
                Issues
              </span>

              <span>
                Action
              </span>
            </div>
          )}

          {/* ===============================================
              LOADING
          =============================================== */}

          {loading ? (
            <div className="vq-loading">
              <span className="vq-loader" />

              <strong>
                Opening verification
                queue…
              </strong>

              <p>
                Loading paper status
                and community checks.
              </p>
            </div>
          ) : filtered.length ? (
            /* =============================================
                QUEUE ROWS
            ============================================= */

            <div className="vq-list">
              {filtered.map(
                (
                  item,
                  index
                ) => {
                  const paper =
                    item.paper ||
                    {};

                  const summary =
                    item.summary ||
                    {};

                  const metadata =
                    summary.metadataCorrectPercentage;

                  const pdfQuality =
                    summary.pdfReadablePercentage;

                  const progress =
                    verificationProgress(
                      summary
                    );

                  const issues =
                    summary.issueBreakdown ||
                    [];

                  return (
                    <article
                      className={`vq-row status-${summary.status || 'unverified'}`}
                      key={
                        paper._id
                      }
                    >
                      {/* ===================================
                          STATUS
                      =================================== */}

                      <div className="vq-status-cell">
                        <span className="vq-mobile-label">
                          Status
                        </span>

                        <VerificationStatusBadge
                          summary={
                            summary
                          }
                        />

                        <small>
                          {summary.totalResponses ||
                            0}{' '}
                          check
                          {Number(
                            summary.totalResponses ||
                              0
                          ) === 1
                            ? ''
                            : 's'}
                        </small>
                      </div>

                      {/* ===================================
                          PAPER
                      =================================== */}

                      <div className="vq-paper-cell">
                        <div className="vq-paper-index">
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            '0'
                          )}
                        </div>

                        <div>
                          <span>
                            {paper.subjectCode ||
                              'Paper'}
                          </span>

                          <h3>
                            {paper.subject ||
                              'Untitled paper'}
                          </h3>

                          <div className="vq-paper-meta">
                            <span>
                              {paper.branch ||
                                'Branch'}
                            </span>

                            <i />

                            <span>
                              Sem{' '}
                              {paper.semester ||
                                '—'}
                            </span>

                            <i />

                            <span>
                              {paper.examType ||
                                'Exam'}
                            </span>

                            <i />

                            <span>
                              {paper.year ||
                                'Year'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* ===================================
                          CHECKS
                      =================================== */}

                      <div className="vq-checks-cell">
                        <span className="vq-mobile-label">
                          Community
                          checks
                        </span>

                        <strong>
                          {summary.totalResponses ||
                            0}
                        </strong>

                        <div className="vq-check-progress">
                          <i
                            style={{
                              width:
                                `${progress}%`,
                            }}
                          />
                        </div>

                        <small>
                          {progress}%
                          confidence
                          signal
                        </small>
                      </div>

                      {/* ===================================
                          METADATA
                      =================================== */}

                      <div className={`vq-score-cell ${confidenceClass(
                        metadata
                      )}`}>
                        <span className="vq-mobile-label">
                          Metadata
                        </span>

                        <strong>
                          {formatPercent(
                            metadata
                          )}
                        </strong>

                        <div>
                          <i
                            style={{
                              width:
                                `${
                                  metadata ==
                                  null
                                    ? 0
                                    : Number(
                                        metadata
                                      )
                                }%`,
                            }}
                          />
                        </div>

                        <small>
                          correct
                        </small>
                      </div>

                      {/* ===================================
                          PDF
                      =================================== */}

                      <div className={`vq-score-cell ${confidenceClass(
                        pdfQuality
                      )}`}>
                        <span className="vq-mobile-label">
                          PDF quality
                        </span>

                        <strong>
                          {formatPercent(
                            pdfQuality
                          )}
                        </strong>

                        <div>
                          <i
                            style={{
                              width:
                                `${
                                  pdfQuality ==
                                  null
                                    ? 0
                                    : Number(
                                        pdfQuality
                                      )
                                }%`,
                            }}
                          />
                        </div>

                        <small>
                          readable
                        </small>
                      </div>

                      {/* ===================================
                          ISSUES
                      =================================== */}

                      <div className="vq-issues-cell">
                        <span className="vq-mobile-label">
                          Issues
                        </span>

                        {issues.length ? (
                          <>
                            <strong>
                              {issues.reduce(
                                (
                                  totalIssues,
                                  issue
                                ) =>
                                  totalIssues +
                                  numberOrZero(
                                    issue.count
                                  ),
                                0
                              )}
                            </strong>

                            <small>
                              {issues[0]
                                ?.label ||
                                'Issue reported'}
                            </small>

                            {issues.length >
                              1 && (
                              <span className="vq-more-issues">
                                +
                                {issues.length -
                                  1}{' '}
                                more
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <CheckCircle2
                              size={17}
                            />

                            <small>
                              No issues
                              reported
                            </small>
                          </>
                        )}
                      </div>

                      {/* ===================================
                          ACTIONS
                      =================================== */}

                      <div className="vq-actions">
                        {paper.filePath && (
                          <a
                            href={
                              paper.filePath
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Eye
                              size={13}
                            />

                            PDF
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPaper(
                              paper
                            )
                          }
                        >
                          Verify

                          <ChevronRight
                            size={13}
                          />
                        </button>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            <div className="vq-empty">
              <span>
                <FileCheck2
                  size={25}
                />
              </span>

              <h3>
                Nothing in this queue.
              </h3>

              <p>
                No papers match the
                current status and
                search filters.
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
        </section>

        {/* =================================================
            TRUST NOTE
        ================================================= */}

        <section className="vq-trust-note">
          <AlertTriangle
            size={16}
          />

          <div>
            <strong>
              Verification is not a
              popularity vote.
            </strong>

            <p>
              Review the actual paper
              before confirming it.
              Report incorrect details
              or unreadable files
              instead of approving
              automatically.
            </p>
          </div>
        </section>
      </div>

      {/* ===================================================
          MODAL
      =================================================== */}

      {selectedPaper && (
        <PaperVerificationModal
          paper={
            selectedPaper
          }
          user={user}
          toast={toast}
          navigate={
            navigate
          }
          onClose={() =>
            setSelectedPaper(
              null
            )
          }
          onUpdated={() => {
            setSelectedPaper(
              null
            );

            load();
          }}
        />
      )}
    </main>
  );
}
