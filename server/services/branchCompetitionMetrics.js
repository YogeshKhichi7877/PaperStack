const { OFFICIAL_BRANCHES: BRANCHES, normalizeBranchList } = require('../utils/branches');

const POINTS = {
  APPROVED_PAPER: 100,
  APPROVED_SOLUTION: 35,
  ARCHIVE_VERIFICATION: 10,
};

function normalizeBranchWeights(value) {
  const branches = normalizeBranchList(value);
  return Object.fromEntries(branches.map((branch) => [branch, 1 / branches.length]));
}

function periodStart(period, now = new Date()) {
  const date = new Date(now);

  if (period === '7d') {
    date.setUTCDate(date.getUTCDate() - 7);
    return date;
  }

  if (period === '30d') {
    date.setUTCDate(date.getUTCDate() - 30);
    return date;
  }

  return null;
}

function inPeriod(value, start) {
  if (!start) return true;

  const date = new Date(value || 0);

  return !Number.isNaN(date.getTime()) && date >= start;
}

function emptyBranch(branch) {
  return {
    branch,
    points: 0,
    approvedPapers: 0,
    approvedSolutions: 0,
    verifications: 0,
    activeContributors: new Set(),
    contributorPoints: new Map(),
  };
}

function addContributorPoints(branchState, contributorId, contributorName, points) {
  const id = String(contributorId || contributorName || '').trim();
  if (!id) return;

  branchState.activeContributors.add(id);

  const current = branchState.contributorPoints.get(id) || {
    id,
    name: String(contributorName || 'Contributor'),
    points: 0,
    approvedPapers: 0,
    approvedSolutions: 0,
    verifications: 0,
  };

  current.points += points;
  branchState.contributorPoints.set(id, current);
}

function addWeightedMetric(
  states,
  branchValue,
  metric,
  basePoints,
  {
    contributorId = '',
    contributorName = '',
    contributorMetric = '',
  } = {}
) {
  const weights = normalizeBranchWeights(branchValue);

  Object.entries(weights).forEach(([branch, weight]) => {
    const state = states[branch];
    if (!state) return;

    const weightedPoints = Math.round(basePoints * weight * 10) / 10;

    state.points += weightedPoints;
    state[metric] += weight;

    if (contributorId || contributorName) {
      addContributorPoints(
        state,
        contributorId,
        contributorName,
        weightedPoints
      );

      const id = String(contributorId || contributorName).trim();
      const contributor = state.contributorPoints.get(id);

      if (contributor && contributorMetric) {
        contributor[contributorMetric] += weight;
      }
    }
  });
}

function finalizeBranch(state) {
  const contributors = [...state.contributorPoints.values()]
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.name.localeCompare(b.name)
    )
    .slice(0, 6)
    .map((contributor, index) => ({
      ...contributor,
      rank: index + 1,
      points: Math.round(contributor.points * 10) / 10,
    }));

  return {
    branch: state.branch,
    points: Math.round(state.points * 10) / 10,
    approvedPapers: Math.round(state.approvedPapers * 10) / 10,
    approvedSolutions: Math.round(state.approvedSolutions * 10) / 10,
    verifications: Math.round(state.verifications * 10) / 10,
    activeContributors: state.activeContributors.size,
    topContributors: contributors,
  };
}

function buildBranchCompetition({
  contributions = [],
  solutions = [],
  verifications = [],
  period = '30d',
  now = new Date(),
} = {}) {
  const safePeriod = ['7d', '30d', 'all'].includes(period)
    ? period
    : '30d';

  const start = periodStart(safePeriod, now);

  const states = Object.fromEntries(
    BRANCHES.map((branch) => [branch, emptyBranch(branch)])
  );

  contributions
    .filter(
      (item) =>
        item.status === 'approved' &&
        inPeriod(item.approvedAt || item.updatedAt || item.createdAt, start)
    )
    .forEach((item) =>
      addWeightedMetric(
        states,
        item.branch,
        'approvedPapers',
        POINTS.APPROVED_PAPER,
        {
          contributorId: item.contributorUserId,
          contributorName: item.contributorName,
          contributorMetric: 'approvedPapers',
        }
      )
    );

  solutions
    .filter(
      (item) =>
        item.status === 'approved' &&
        inPeriod(item.approvedAt || item.updatedAt || item.createdAt, start)
    )
    .forEach((item) =>
      addWeightedMetric(
        states,
        item.branch,
        'approvedSolutions',
        POINTS.APPROVED_SOLUTION,
        {
          contributorId: item.authorUserId,
          contributorName: item.authorName,
          contributorMetric: 'approvedSolutions',
        }
      )
    );

  verifications
    .filter((item) => inPeriod(item.createdAt, start))
    .forEach((item) =>
      addWeightedMetric(
        states,
        item.branch,
        'verifications',
        POINTS.ARCHIVE_VERIFICATION,
        {
          contributorId: item.userId,
          contributorName: item.userName,
          contributorMetric: 'verifications',
        }
      )
    );

  const leaderboard = BRANCHES
    .map((branch) => finalizeBranch(states[branch]))
    .sort(
      (a, b) =>
        b.points - a.points ||
        a.branch.localeCompare(b.branch)
    )
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  const totalPoints = leaderboard.reduce(
    (sum, item) => sum + item.points,
    0
  );

  return {
    period: safePeriod,
    startAt: start ? start.toISOString() : null,
    generatedAt: new Date(now).toISOString(),
    points: POINTS,
    leaderboard,
    summary: {
      totalPoints: Math.round(totalPoints * 10) / 10,
      approvedPapers: leaderboard.reduce(
        (sum, item) => sum + item.approvedPapers,
        0
      ),
      approvedSolutions: leaderboard.reduce(
        (sum, item) => sum + item.approvedSolutions,
        0
      ),
      verifications: leaderboard.reduce(
        (sum, item) => sum + item.verifications,
        0
      ),
    },
    methodology: {
      approvedPaper: POINTS.APPROVED_PAPER,
      approvedSolution: POINTS.APPROVED_SOLUTION,
      archiveVerification: POINTS.ARCHIVE_VERIFICATION,
      sharedBranch:
        'Resources marked CSE & ECE contribute half of their points to each branch.',
      disclaimer:
        'This is a community archive participation score. It does not measure academic performance or branch quality.',
    },
  };
}

module.exports = {
  BRANCHES,
  POINTS,
  addWeightedMetric,
  buildBranchCompetition,
  finalizeBranch,
  inPeriod,
  normalizeBranchWeights,
  periodStart,
};
