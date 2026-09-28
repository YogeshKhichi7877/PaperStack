const Contribution =
  require('../models/Contribution');

const QuestionSolution =
  require('../models/QuestionSolution');

const ResourceContribution =
  require('../models/ResourceContribution');

const Report =
  require('../models/Report');

const PaperRequest =
  require('../models/PaperRequest');

const PaperVerification =
  require('../models/PaperVerification');

const Question =
  require('../models/Question');

const {
  decorateModerationItem,
  moderationStats,
  sortModerationItems,
} = require('./adminModerationMetrics');

function idString(value) {
  return String(
    value?._id ||
    value ||
    ''
  );
}

function cleanText(
  value,
  fallback = ''
) {
  return String(
    value ||
    fallback ||
    ''
  )
    .replace(
      /\s+/g,
      ' '
    )
    .trim();
}

function contributionItem(
  item
) {
  return {
    id:
      `contribution:${idString(item)}`,
    sourceId:
      idString(item),
    kind:
      'contribution',
    status:
      item.status ||
      'pending',
    title:
      cleanText(
        item.subject,
        'Paper contribution'
      ),
    subtitle:
      [
        item.branch,
        item.semester
          ? `Sem ${item.semester}`
          : '',
        item.year,
        item.examType,
      ]
        .filter(Boolean)
        .join(
          ' · '
        ),
    description:
      cleanText(
        item.title
      ),
    createdAt:
      item.createdAt,
    updatedAt:
      item.updatedAt,
    extractionWarningsCount:
      Array.isArray(
        item.extractionWarnings
      )
        ? item.extractionWarnings.length
        : 0,
    actorName:
      cleanText(
        item.contributorName,
        'Student'
      ),
    actorEmail:
      cleanText(
        item.contributorEmail
      ),
    note:
      cleanText(
        item.adminNote
      ),
    paperUrl:
      item.paperUrl ||
      '',
    solutionUrl:
      item.solutionUrl ||
      '',
    actionUrl:
      '/admin/contributions',
  };
}


function resourceItem(
  item
) {
  return {
    id:
      `resource:${idString(item)}`,
    sourceId:
      idString(item),
    kind:
      'resource',
    status:
      item.status ||
      'pending',
    title:
      cleanText(
        item.title,
        'Subject resource'
      ),
    subtitle:
      [
        item.subjectCode ||
          item.subjectShortCode ||
          item.subjectName,
        (item.branches || []).join(' / '),
        item.semesters?.length
          ? `Sem ${item.semesters.join(', ')}`
          : '',
        item.year,
        item.examType,
        String(item.kind || '').replace(/_/g, ' '),
      ]
        .filter(Boolean)
        .join(' · '),
    description:
      cleanText(
        item.description
      ).slice(
        0,
        260
      ),
    createdAt:
      item.createdAt,
    updatedAt:
      item.updatedAt,
    actorName:
      cleanText(
        item.contributorName,
        'Student'
      ),
    actorEmail:
      cleanText(
        item.contributorEmail
      ),
    note:
      cleanText(
        item.adminNote
      ),
    fileUrl:
      item.fileUrl ||
      '',
    basePoints:
      Number(
        item.basePoints ||
        0
      ),
    pointsAwarded:
      Number(
        item.pointsAwarded ||
        0
      ),
    resourceKind:
      item.kind ||
      'other',
    actionUrl:
      item.subjectKey
        ? `/subject/${encodeURIComponent(item.subjectKey)}`
        : '/contribute-resource',
  };
}

function solutionItem(
  item
) {
  const question =
    item.questionId &&
    typeof item.questionId ===
      'object'
      ? item.questionId
      : null;

  return {
    id:
      `solution:${idString(item)}`,
    sourceId:
      idString(item),
    kind:
      'solution',
    status:
      item.status ||
      'pending',
    title:
      cleanText(
        question?.questionLabel,
        'Student solution'
      ),
    subtitle:
      [
        question?.subjectCode ||
          question?.subject,
        question?.year,
        question?.examType,
      ]
        .filter(Boolean)
        .join(
          ' · '
        ),
    description:
      cleanText(
        item.answerText
      ).slice(
        0,
        260
      ),
    createdAt:
      item.createdAt,
    updatedAt:
      item.updatedAt,
    answerLength:
      String(
        item.answerText ||
        ''
      ).length,
    actorName:
      cleanText(
        item.authorName,
        'Student'
      ),
    note:
      cleanText(
        item.moderationNote
      ),
    questionId:
      idString(
        question?._id ||
        item.questionId
      ),
    actionUrl:
      '/admin/question-solutions',
  };
}

function reportItem(
  item
) {
  return {
    id:
      `report:${idString(item)}`,
    sourceId:
      idString(item),
    kind:
      'report',
    status:
      item.status ||
      'open',
    title:
      cleanText(
        item.reason,
        'Paper report'
      ),
    subtitle:
      cleanText(
        item.paperTitle,
        'Reported paper'
      ),
    description:
      cleanText(
        item.message
      ),
    createdAt:
      item.createdAt,
    updatedAt:
      item.updatedAt,
    reason:
      cleanText(
        item.reason
      ),
    actorName:
      cleanText(
        item.reporterName,
        'Student'
      ),
    actorEmail:
      cleanText(
        item.reporterEmail
      ),
    note:
      cleanText(
        item.adminNote
      ),
    paperId:
      idString(
        item.paperId?._id ||
        item.paperId
      ),
    actionUrl:
      '/admin/reports',
  };
}

function requestItem(
  item
) {
  return {
    id:
      `request:${idString(item)}`,
    sourceId:
      idString(item),
    kind:
      'request',
    status:
      item.status ||
      'open',
    title:
      cleanText(
        item.subject,
        'Missing paper request'
      ),
    subtitle:
      [
        item.subjectCode,
        item.branch,
        item.semester
          ? `Sem ${item.semester}`
          : '',
        item.year,
        item.examType,
      ]
        .filter(Boolean)
        .join(
          ' · '
        ),
    description:
      `${Number(item.requestCount || 0)} student request${Number(item.requestCount || 0) === 1 ? '' : 's'}`,
    createdAt:
      item.createdAt,
    updatedAt:
      item.updatedAt,
    requestCount:
      Number(
        item.requestCount ||
        0
      ),
    actionUrl:
      '/missing-papers',
  };
}

function questionReviewItem(
  item
) {
  return {
    id:
      `question_review:${idString(item)}`,
    sourceId:
      idString(item),
    kind:
      'question_review',
    status:
      item.status ||
      'extracted',
    title:
      cleanText(
        item.questionLabel,
        'Extracted question'
      ),
    subtitle:
      [
        item.subjectCode ||
          item.subject,
        item.branch,
        item.semester
          ? `Sem ${item.semester}`
          : '',
        item.year,
        item.examType,
      ]
        .filter(Boolean)
        .join(
          ' · '
        ),
    description:
      cleanText(
        item.questionText
      ).slice(
        0,
        320
      ),
    createdAt:
      item.createdAt,
    updatedAt:
      item.updatedAt,
    confidence:
      item.extraction?.confidence ??
      null,
    extractionSource:
      item.extraction?.source ||
      '',
    questionId:
      idString(item),
    actionUrl:
      `/questions/${encodeURIComponent(idString(item))}`,
  };
}

function groupVerificationIssues(
  rows = []
) {
  const grouped =
    new Map();

  rows.forEach(
    (row) => {
      const paper =
        row.paperId &&
        typeof row.paperId ===
          'object'
          ? row.paperId
          : null;

      if (
        !paper?._id
      ) {
        return;
      }

      const key =
        idString(
          paper._id
        );

      const current =
        grouped.get(
          key
        ) || {
          paper,
          rows: [],
          firstCreatedAt:
            row.createdAt,
        };

      current.rows.push(
        row
      );

      if (
        new Date(
          row.createdAt ||
          0
        ) <
        new Date(
          current.firstCreatedAt ||
          row.createdAt ||
          0
        )
      ) {
        current.firstCreatedAt =
          row.createdAt;
      }

      grouped.set(
        key,
        current
      );
    }
  );

  return [
    ...grouped.values(),
  ].map(
    ({
      paper,
      rows:
        issueRows,
      firstCreatedAt,
    }) => {
      const issueTypes =
        [
          ...new Set(
            issueRows.flatMap(
              (row) =>
                row.issueTypes ||
                []
            )
          ),
        ];

      const pdfUnreadable =
        issueRows.some(
          (row) =>
            row.pdfReadable ===
            false
        );

      const metadataWrong =
        issueRows.some(
          (row) =>
            row.metadataCorrect ===
            false
        );

      return {
        id:
          `verification:${idString(paper._id)}`,
        sourceId:
          idString(
            paper._id
          ),
        kind:
          'verification',
        status:
          'needs-review',
        title:
          cleanText(
            paper.subject,
            paper.title ||
              'Paper verification'
          ),
        subtitle:
          [
            paper.subjectCode,
            paper.branch,
            paper.semester
              ? `Sem ${paper.semester}`
              : '',
            paper.year,
            paper.examType,
          ]
            .filter(Boolean)
            .join(
              ' · '
            ),
        description:
          [
            metadataWrong
              ? 'Metadata disputed'
              : '',
            pdfUnreadable
              ? 'PDF readability issue'
              : '',
            issueTypes.length
              ? issueTypes
                  .join(
                    ', '
                  )
              : '',
          ]
            .filter(Boolean)
            .join(
              ' · '
            ),
        createdAt:
          firstCreatedAt,
        updatedAt:
          issueRows[
            0
          ]?.updatedAt ||
          issueRows[
            0
          ]?.createdAt,
        issueResponses:
          issueRows.length,
        issueTypes,
        pdfUnreadable,
        metadataWrong,
        paperId:
          idString(
            paper._id
          ),
        actionUrl:
          `/paper/${encodeURIComponent(idString(paper._id))}`,
      };
    }
  );
}

async function getModerationQueue({
  kind = 'all',
  limit = 160,
} = {}) {
  const safeLimit =
    Math.max(
      20,
      Math.min(
        300,
        Number(limit) ||
        160
      )
    );

  const [
    contributions,
    resourceContributions,
    solutions,
    reports,
    requests,
    verificationRows,
    questionReviews,
  ] =
    await Promise.all([
      Contribution.find({
        status: {
          $in: [
            'pending',
            'needs_correction',
          ],
        },
      })
        .sort({
          createdAt: 1,
        })
        .limit(
          safeLimit
        )
        .lean(),

      ResourceContribution.find({
        status: {
          $in: [
            'pending',
            'needs_correction',
          ],
        },
      })
        .sort({
          createdAt: 1,
        })
        .limit(
          safeLimit
        )
        .lean(),

      QuestionSolution.find({
        status:
          'pending',
      })
        .sort({
          createdAt: 1,
        })
        .limit(
          safeLimit
        )
        .populate(
          'questionId',
          '_id questionLabel questionText subject subjectCode branch semester year examType'
        )
        .lean(),

      Report.find({
        status: {
          $in: [
            'open',
            'reviewed',
          ],
        },
      })
        .sort({
          createdAt: 1,
        })
        .limit(
          safeLimit
        )
        .populate(
          'paperId',
          '_id title subject subjectCode branch semester year examType'
        )
        .lean(),

      PaperRequest.find({
        status:
          'open',
      })
        .sort({
          requestCount: -1,
          createdAt: 1,
        })
        .limit(
          safeLimit
        )
        .lean(),

      PaperVerification.find({
        $or: [
          {
            metadataCorrect:
              false,
          },
          {
            pdfReadable:
              false,
          },
          {
            issueTypes: {
              $exists:
                true,
              $ne:
                [],
            },
          },
        ],
      })
        .sort({
          createdAt: 1,
        })
        .limit(
          Math.max(
            safeLimit *
              3,
            300
          )
        )
        .populate(
          'paperId',
          '_id title subject subjectCode branch semester year examType'
        )
        .lean(),

      Question.find({
        $or: [
          {
            needsReview:
              true,
          },
          {
            status:
              'extracted',
            'extraction.confidence': {
              $lt:
                70,
            },
          },
        ],
        status: {
          $ne:
            'rejected',
        },
      })
        .sort({
          createdAt: 1,
        })
        .limit(
          safeLimit
        )
        .lean(),
    ]);

  const items =
    [
      ...contributions.map(
        contributionItem
      ),
      ...resourceContributions.map(
        resourceItem
      ),
      ...solutions.map(
        solutionItem
      ),
      ...reports.map(
        reportItem
      ),
      ...requests.map(
        requestItem
      ),
      ...groupVerificationIssues(
        verificationRows
      ),
      ...questionReviews.map(
        questionReviewItem
      ),
    ].map(
      (
        item
      ) =>
        decorateModerationItem(
          item
        )
    );

  const sorted =
    sortModerationItems(
      items
    );

  const validKinds = [
    'all',
    'contribution',
    'resource',
    'solution',
    'report',
    'verification',
    'question_review',
    'request',
  ];

  const safeKind =
    validKinds.includes(
      kind
    )
      ? kind
      : 'all';

  const filtered =
    safeKind ===
    'all'
      ? sorted
      : sorted.filter(
          (item) =>
            item.kind ===
            safeKind
        );

  return {
    kind:
      safeKind,
    stats:
      moderationStats(
        sorted
      ),
    returned:
      Math.min(
        filtered.length,
        safeLimit
      ),
    items:
      filtered.slice(
        0,
        safeLimit
      ),
    generatedAt:
      new Date()
        .toISOString(),
    methodology: {
      priority:
        'Priority combines queue type, age, report severity, verification consensus and request demand. It is used only to order admin work.',
      sourceOfTruth:
        'Approval/rejection actions continue to use the existing PaperStack moderation endpoints, so publishing behavior remains unchanged.',
    },
  };
}

module.exports = {
  contributionItem,
  resourceItem,
  getModerationQueue,
  groupVerificationIssues,
  questionReviewItem,
  reportItem,
  requestItem,
  solutionItem,
};
