const Paper = require('../models/Paper');
const Question = require('../models/Question');
const PaperEngagementDaily = require('../models/PaperEngagementDaily');
const { branchQueryValues } = require('../utils/branches');

const {
  aggregateSubjectTrends,
  aggregateTopicTrends,
  paperTrendScore,
  startDayKey,
} = require('./trendingMetrics');

function utcDayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function recordPaperEngagement(
  paperId,
  eventType
) {
  if (!['view', 'download'].includes(eventType)) {
    return false;
  }

  try {
    const increment =
      eventType === 'view'
        ? { views: 1 }
        : { downloads: 1 };

    const dayKey = utcDayKey();

    await PaperEngagementDaily.findOneAndUpdate(
      {
        paperId,
        dayKey,
      },
      {
        $setOnInsert: {
          paperId,
          dayKey,
        },
        $inc: increment,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: false,
      }
    );

    return true;
  } catch (error) {
    console.warn(
      'Trending engagement record skipped:',
      error.message
    );

    return false;
  }
}

function paperFilter({
  branch,
  semester,
} = {}) {
  const filter = {};

  if (branch) {
    const normalized = String(branch)
      .trim()
      .toUpperCase();

    filter.branch = { $in: branchQueryValues(normalized) };
  }

  if (semester) {
    const numeric = Number(semester);

    if (Number.isInteger(numeric)) {
      filter.semester = numeric;
    }
  }

  return filter;
}

function publicPaper(
  paper,
  {
    recentViews = 0,
    recentDownloads = 0,
    trendScore = 0,
  } = {}
) {
  return {
    _id: String(paper._id),
    title: paper.title || '',
    subject: paper.subject || '',
    subjectCode: paper.subjectCode || '',
    branch: paper.branch || '',
    semester: paper.semester ?? null,
    year: paper.year ?? null,
    examType: paper.examType || '',
    filePath: paper.filePath || '',
    solutionPath: paper.solutionPath || '',
    totalViews: Number(paper.views || 0),
    totalDownloads: Number(paper.downloads || 0),
    recentViews: Number(recentViews || 0),
    recentDownloads: Number(recentDownloads || 0),
    trendScore: Number(trendScore || 0),
  };
}

async function recentPaperTrends({
  period,
  branch,
  semester,
} = {}) {
  const startKey = startDayKey(period);

  const papers = await Paper.find(
    paperFilter({
      branch,
      semester,
    })
  )
    .select(
      'title subject subjectCode branch semester year examType filePath solutionPath views downloads'
    )
    .lean();

  if (!papers.length) {
    return {
      papers: [],
      hasRecentData: false,
      startKey,
      trackingSince: null,
    };
  }

  const paperIds = papers.map((paper) => paper._id);

  const [
    rows,
    firstRow,
  ] = await Promise.all([
    PaperEngagementDaily.aggregate([
      {
        $match: {
          paperId: {
            $in: paperIds,
          },
          dayKey: {
            $gte: startKey,
          },
        },
      },
      {
        $group: {
          _id: '$paperId',
          views: {
            $sum: '$views',
          },
          downloads: {
            $sum: '$downloads',
          },
        },
      },
    ]),

    PaperEngagementDaily.findOne({
      paperId: {
        $in: paperIds,
      },
    })
      .sort({
        dayKey: 1,
      })
      .select('dayKey')
      .lean(),
  ]);

  const byId = new Map(
    rows.map((row) => [
      String(row._id),
      row,
    ])
  );

  const recent = papers
    .map((paper) => {
      const row = byId.get(String(paper._id));

      const recentViews = Number(row?.views || 0);
      const recentDownloads = Number(row?.downloads || 0);

      return publicPaper(
        paper,
        {
          recentViews,
          recentDownloads,
          trendScore: paperTrendScore({
            views: recentViews,
            downloads: recentDownloads,
          }),
        }
      );
    })
    .filter((paper) => paper.trendScore > 0)
    .sort(
      (a, b) =>
        b.trendScore - a.trendScore ||
        b.recentDownloads - a.recentDownloads ||
        b.recentViews - a.recentViews
    );

  return {
    papers: recent,
    hasRecentData: recent.length > 0,
    startKey,
    trackingSince: firstRow?.dayKey || null,
  };
}

async function baselinePapers({
  branch,
  semester,
} = {}) {
  const rows = await Paper.find(
    paperFilter({
      branch,
      semester,
    })
  )
    .sort({
      downloads: -1,
      views: -1,
      year: -1,
    })
    .limit(20)
    .select(
      'title subject subjectCode branch semester year examType filePath solutionPath views downloads'
    )
    .lean();

  return rows.map((paper) =>
    publicPaper(
      paper,
      {
        trendScore: paperTrendScore({
          views: paper.views,
          downloads: paper.downloads,
        }),
      }
    )
  );
}

async function getTrending({
  period = '7d',
  branch = '',
  semester = '',
} = {}) {
  const safePeriod =
    period === '30d'
      ? '30d'
      : '7d';

  const recent = await recentPaperTrends({
    period: safePeriod,
    branch,
    semester,
  });

  const papers = recent.hasRecentData
    ? recent.papers
    : await baselinePapers({
        branch,
        semester,
      });

  const topPapers = papers.slice(0, 12);
  const paperIds = topPapers.map((paper) => paper._id);

  const questions = paperIds.length
    ? await Question.find({
        paperId: {
          $in: paperIds,
        },
        status: {
          $ne: 'rejected',
        },
      })
        .select(
          'paperId primaryTopic topics'
        )
        .lean()
    : [];

  return {
    period: safePeriod,
    filters: {
      branch: branch || '',
      semester: Number(semester) || null,
    },
    dataMode: recent.hasRecentData
      ? 'recent-engagement'
      : 'all-time-baseline',
    trackingSince: recent.trackingSince,
    startDay: recent.startKey,
    papers: topPapers,
    subjects: aggregateSubjectTrends(papers).slice(0, 10),
    topics: aggregateTopicTrends({
      papers,
      questions,
    }).slice(0, 12),
    methodology: {
      recentScore:
        'Trending score = recent views + 3 × recent downloads.',
      baseline:
        'If no recent engagement has been tracked yet, PaperStack shows an all-time popularity baseline using existing totals. Historical totals are not presented as recent activity.',
      privacy:
        'Trending tracking stores daily aggregate counts per paper only. It does not store user identity, IP address, or search text.',
    },
  };
}

module.exports = {
  baselinePapers,
  getTrending,
  paperFilter,
  publicPaper,
  recentPaperTrends,
  recordPaperEngagement,
  utcDayKey,
};
