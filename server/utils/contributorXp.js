const XP_RULES = Object.freeze({
  APPROVED_PAPER: 100,
  APPROVED_SOLUTION: 150,
  FULFILLED_REQUEST: 200,
});

function safeNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
}

function calculateContributorXp(stats = {}) {
  return (
    safeNumber(stats.approvedPapers) * XP_RULES.APPROVED_PAPER +
    safeNumber(stats.approvedSolutions) * XP_RULES.APPROVED_SOLUTION +
    safeNumber(stats.fulfilledRequests) * XP_RULES.FULFILLED_REQUEST
  );
}

function getContributorBadges(profile = {}) {
  const badges = [];
  const rank = safeNumber(profile.rank);
  const papers = safeNumber(profile.approvedPapers);
  const solutions = safeNumber(profile.approvedSolutions);
  const requests = safeNumber(profile.fulfilledRequests);
  const impact = safeNumber(profile.impactViews) + safeNumber(profile.impactDownloads);

  if (rank === 1) badges.push('Archive Champion');
  else if (rank > 1 && rank <= 3) badges.push('Top Contributor');

  if (papers >= 1) badges.push('Verified Uploader');
  if (papers >= 3) badges.push('Archive Builder');
  if (papers >= 5) badges.push('Paper Hunter');
  if (solutions >= 1) badges.push('Solution Contributor');
  if (requests >= 1) badges.push('Bounty Hunter');
  if (impact >= 1000) badges.push('Community Hero');

  return badges;
}

function compareContributorProfiles(a = {}, b = {}) {
  const xpDiff = safeNumber(b.xp) - safeNumber(a.xp);
  if (xpDiff) return xpDiff;

  const impactA = safeNumber(a.impactViews) + safeNumber(a.impactDownloads);
  const impactB = safeNumber(b.impactViews) + safeNumber(b.impactDownloads);
  if (impactB !== impactA) return impactB - impactA;

  const paperDiff = safeNumber(b.approvedPapers) - safeNumber(a.approvedPapers);
  if (paperDiff) return paperDiff;

  return String(a.name || '').localeCompare(String(b.name || ''));
}

function getNextXpMilestone(xp) {
  const current = safeNumber(xp);
  const milestones = [100, 300, 500, 1000, 2000, 5000, 10000];
  return milestones.find((milestone) => milestone > current) || null;
}

module.exports = {
  XP_RULES,
  calculateContributorXp,
  getContributorBadges,
  compareContributorProfiles,
  getNextXpMilestone,
};
