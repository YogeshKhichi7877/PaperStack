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
  getAdminModerationQueue,
  moderateContribution,
    moderateResourceContribution,
moderateExtractedQuestion,
  moderatePaperRequest,
  moderateReport,
  moderateSolution,
} from '../services/adminModerationApi';

import './AdminModerationPage.css';

const TABS = [
  {
    value:
      'all',
    label:
      'All',
    stat:
      'total',
  },
  {
    value:
      'contribution',
    label:
      'Papers',
    stat:
      'contribution',
  },
  {
    value:
      'resource',
    label:
      'Resources',
    stat:
      'resource',
  },
  {
    value:
      'solution',
    label:
      'Solutions',
    stat:
      'solution',
  },
  {
    value:
      'report',
    label:
      'Reports',
    stat:
      'report',
  },
  {
    value:
      'verification',
    label:
      'Verification',
    stat:
      'verification',
  },
  {
    value:
      'question_review',
    label:
      'Questions',
    stat:
      'question_review',
  },
  {
    value:
      'request',
    label:
      'Requests',
    stat:
      'request',
  },
];

function ageLabel(
  hours
) {
  const numeric =
    Number(hours) ||
    0;

  if (
    numeric <
    24
  ) {
    return `${numeric}h`;
  }

  return `${Math.floor(numeric / 24)}d`;
}

function kindLabel(
  value
) {
  const map = {
    contribution:
      'Paper contribution',
    resource:
      'Subject resource',
    solution:
      'Student solution',
    report:
      'Paper report',
    verification:
      'Verification issue',
    question_review:
      'Extracted question',
    request:
      'Missing-paper request',
  };

  return (
    map[value] ||
    value
  );
}

export default function AdminModerationPage({
  isAdmin,
  toast,
}) {
  const [
    kind,
    setKind,
  ] = useState(
    'all'
  );

  const [
    data,
    setData,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    busyId,
    setBusyId,
  ] = useState('');

  const [
    notes,
    setNotes,
  ] = useState({});

  const loadQueue = useCallback(async () => {
    if (
      !isAdmin
    ) {
      setLoading(
        false
      );

      return;
    }

    setLoading(
      true
    );

    try {
      setData(
        await getAdminModerationQueue({
          kind,
          limit:
            220,
        })
      );
    } catch (
      error
    ) {
      if (
        toast
      ) {
        toast(
          error.response?.data?.error ||
            'Could not load moderation queue.',
          'error'
        );
      }
    } finally {
      setLoading(
        false
      );
    }
  }, [
    isAdmin,
    kind,
    toast,
  ]);

  useEffect(() => {
    loadQueue();
  }, [
    loadQueue,
  ]);

  const urgent =
    useMemo(
      () =>
        Number(
          data?.stats?.urgent ||
          0
        ),
      [data]
    );

  function itemNote(
    item
  ) {
    return (
      notes[
        item.id
      ] ??
      item.note ??
      ''
    );
  }

  function setItemNote(
    item,
    value
  ) {
    setNotes(
      (
        current
      ) => ({
        ...current,
        [
          item.id
        ]:
          value,
      })
    );
  }

  async function runAction(
    item,
    action
  ) {
    const note =
      String(
        itemNote(
          item
        ) ||
        ''
      ).trim();

    if (
      [
        'contribution',
        'resource',
      ].includes(
        item.kind
      ) &&
      [
        'reject',
        'needs-correction',
      ].includes(
        action
      ) &&
      !note
    ) {
      toast?.(
        'Add an admin note before rejecting or requesting a correction.',
        'error'
      );

      return;
    }

    setBusyId(
      item.id
    );

    try {
      if (
        item.kind ===
        'contribution'
      ) {
        await moderateContribution(
          item.sourceId,
          action,
          {
            adminNote:
              note,
          }
        );
      }

      if (
        item.kind ===
        'resource'
      ) {
        await moderateResourceContribution(
          item.sourceId,
          action,
          {
            adminNote:
              note,
          }
        );
      }

      if (
        item.kind ===
        'solution'
      ) {
        await moderateSolution(
          item.sourceId,
          action,
          note
        );
      }

      if (
        item.kind ===
        'report'
      ) {
        await moderateReport(
          item.sourceId,
          action,
          note
        );
      }

      if (
        item.kind ===
        'request'
      ) {
        await moderatePaperRequest(
          item.sourceId,
          action
        );
      }

      if (
        item.kind ===
        'question_review'
      ) {
        await moderateExtractedQuestion(
          item.sourceId,
          action
        );
      }

      toast?.(
        'Moderation action saved.',
        'success'
      );

      await loadQueue();
    } catch (
      error
    ) {
      toast?.(
        error.response?.data?.error ||
          'Moderation action failed.',
        'error'
      );
    } finally {
      setBusyId('');
    }
  }

  if (
    !isAdmin
  ) {
    return (
      <main className="am-page">
        <Helmet>
          <title>
            Admin Moderation - PaperStack
          </title>
        </Helmet>

        <div className="am-shell">
          <div className="am-empty">
            <h1>
              Admin access required.
            </h1>

            <p>
              Enter admin mode to use
              the unified moderation
              queue.
            </p>

            <Link to="/admin">
              Open Admin Login
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="am-page">
      <Helmet>
        <title>
          Moderation Center - PaperStack
        </title>
      </Helmet>

      <div className="am-shell">
        <section className="am-hero">
          <div>
            <span>
              Advanced Admin Moderation
            </span>

            <h1>
              One queue for everything that needs a human decision.
            </h1>

            <p>
              Paper contributions,
              student solutions,
              reports, disputed
              verifications and
              high-demand missing-paper
              requests are prioritized
              in one place.
            </p>
          </div>

          <div className="am-pressure">
            <strong>
              {
                data
                  ?.stats
                  ?.total ||
                0
              }
            </strong>

            <span>
              unresolved
            </span>

            <p>
              {
                urgent
              } urgent · {
                data
                  ?.stats
                  ?.high ||
                0
              } high
            </p>
          </div>
        </section>

        <section className="am-tabs">
          {
            TABS.map(
              (
                tab
              ) => (
                <button
                  type="button"
                  key={
                    tab.value
                  }
                  className={
                    kind ===
                    tab.value
                      ? 'active'
                      : ''
                  }
                  onClick={() =>
                    setKind(
                      tab.value
                    )
                  }
                >
                  {
                    tab.label
                  }

                  <b>
                    {
                      data
                        ?.stats?.[
                          tab.stat
                        ] ||
                      0
                    }
                  </b>
                </button>
              )
            )
          }

          <button
            type="button"
            className="am-refresh"
            onClick={
              loadQueue
            }
          >
            Refresh
          </button>
        </section>

        {
          loading ? (
            <div className="am-empty">
              Loading moderation queue…
            </div>
          ) : !data
              ?.items
              ?.length ? (
            <div className="am-empty">
              <h2>
                Queue is clear.
              </h2>

              <p>
                There are no unresolved
                items in this category.
              </p>
            </div>
          ) : (
            <section className="am-list">
              {
                data.items.map(
                  (
                    item
                  ) => (
                    <article
                      key={
                        item.id
                      }
                      className={
                        `am-card ${item.priority}`
                      }
                    >
                      <div className="am-card-top">
                        <div className="am-kind">
                          {
                            kindLabel(
                              item.kind
                            )
                          }
                        </div>

                        <div className="am-priority">
                          <span>
                            {
                              item.priority
                            }
                          </span>

                          <b>
                            {
                              item.priorityScore
                            }
                          </b>
                        </div>
                      </div>

                      <div className="am-main">
                        <div>
                          <span className="am-meta">
                            {
                              item.subtitle
                            }
                          </span>

                          <h2>
                            {
                              item.title
                            }
                          </h2>

                          {
                            item.description && (
                              <p>
                                {
                                  item.description
                                }
                              </p>
                            )
                          }

                          <div className="am-small-meta">
                            <span>
                              Status: {
                                item.status
                              }
                            </span>

                            <span>
                              Age: {
                                ageLabel(
                                  item.ageHours
                                )
                              }
                            </span>

                            {
                              item.actorName && (
                                <span>
                                  By: {
                                    item.actorName
                                  }
                                </span>
                              )
                            }

                            {
                              item.requestCount >
                                0 && (
                                <span>
                                  Requests: {
                                    item.requestCount
                                  }
                                </span>
                              )
                            }

                            {
                              item.issueResponses >
                                0 && (
                                <span>
                                  Issue reports: {
                                    item.issueResponses
                                  }
                                </span>
                              )
                            }
                          </div>
                        </div>

                        <div className="am-source-links">
                          {
                            item.actionUrl && (
                              <Link
                                to={
                                  item.actionUrl
                                }
                              >
                                Open source
                              </Link>
                            )
                          }

                          {
                            item.fileUrl && (
                              <a
                                href={
                                  item.fileUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                Resource file
                              </a>
                            )
                          }

                          {
                            item.paperUrl && (
                              <a
                                href={
                                  item.paperUrl
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                PDF
                              </a>
                            )
                          }

                          {
                            item.questionId && (
                              <Link
                                to={
                                  `/questions/${item.questionId}`
                                }
                              >
                                Question
                              </Link>
                            )
                          }
                        </div>
                      </div>

                      {
                        ![
                          'verification',
                          'question_review',
                        ].includes(
                          item.kind
                        ) && (
                          <textarea
                            value={
                              itemNote(
                                item
                              )
                            }
                            onChange={(
                              event
                            ) =>
                              setItemNote(
                                item,
                                event.target
                                  .value
                              )
                            }
                            placeholder={
                              item.kind ===
                                'request'
                                ? 'Optional admin note'
                                : 'Admin / moderation note'
                            }
                            maxLength={
                              500
                            }
                          />
                        )
                      }

                      <div className="am-actions">
                        {
                          item.kind ===
                            'contribution' && (
                            <>
                              <button
                                type="button"
                                className="approve"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'approve'
                                  )
                                }
                              >
                                Approve
                              </button>

                              <button
                                type="button"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'needs-correction'
                                  )
                                }
                              >
                                Needs correction
                              </button>

                              <button
                                type="button"
                                className="danger"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'reject'
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          )
                        }

                        {
                          item.kind ===
                            'resource' && (
                            <>
                              <button
                                type="button"
                                className="approve"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'approve'
                                  )
                                }
                              >
                                Approve resource
                              </button>

                              <button
                                type="button"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'needs-correction'
                                  )
                                }
                              >
                                Needs correction
                              </button>

                              <button
                                type="button"
                                className="danger"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'reject'
                                  )
                                }
                              >
                                Reject
                              </button>

                              <span className="am-point-preview">
                                +{item.basePoints || 0} pts after approval
                              </span>
                            </>
                          )
                        }

                        {
                          item.kind ===
                            'solution' && (
                            <>
                              <button
                                type="button"
                                className="approve"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'approved'
                                  )
                                }
                              >
                                Approve solution
                              </button>

                              <button
                                type="button"
                                className="danger"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'rejected'
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          )
                        }

                        {
                          item.kind ===
                            'report' && (
                            <>
                              <button
                                type="button"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'reviewed'
                                  )
                                }
                              >
                                Mark reviewed
                              </button>

                              <button
                                type="button"
                                className="approve"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'resolved'
                                  )
                                }
                              >
                                Resolve
                              </button>
                            </>
                          )
                        }

                        {
                          item.kind ===
                            'request' && (
                            <>
                              <button
                                type="button"
                                className="approve"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'fulfilled'
                                  )
                                }
                              >
                                Mark fulfilled
                              </button>

                              <button
                                type="button"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'dismissed'
                                  )
                                }
                              >
                                Dismiss
                              </button>
                            </>
                          )
                        }

                        {
                          item.kind ===
                            'question_review' && (
                            <>
                              <button
                                type="button"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'reviewed'
                                  )
                                }
                              >
                                Mark reviewed
                              </button>

                              <button
                                type="button"
                                className="approve"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'verified'
                                  )
                                }
                              >
                                Verify question
                              </button>

                              <button
                                type="button"
                                className="danger"
                                disabled={
                                  busyId ===
                                  item.id
                                }
                                onClick={() =>
                                  runAction(
                                    item,
                                    'rejected'
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          )
                        }

                        {
                          item.kind ===
                            'verification' && (
                            <>
                              <Link
                                to={
                                  item.actionUrl
                                }
                                className="am-action-link"
                              >
                                Inspect paper
                              </Link>

                              <Link
                                to="/verify-archive"
                                className="am-action-link secondary"
                              >
                                Verification queue
                              </Link>
                            </>
                          )
                        }
                      </div>
                    </article>
                  )
                )
              }
            </section>
          )
        }

        <section className="am-footnote">
          <strong>
            Priority score
          </strong>

          <p>
            {
              data
                ?.methodology
                ?.priority
            }
          </p>

          <small>
            {
              data
                ?.methodology
                ?.sourceOfTruth
            }
          </small>
        </section>
      </div>
    </main>
  );
}
