const BOUNTY_RULES = Object.freeze({
  APPROVED_PAPER_XP: 100,
  BASE_FULFILLMENT_XP: 200,
  HIGH_PRIORITY_BONUS: 50,
  MEDIUM_PRIORITY_BONUS: 25,
  DEMAND_TIERS: Object.freeze([
    Object.freeze({ minRequests: 30, bonusXp: 200, label: 'Hot bounty', level: 'hot' }),
    Object.freeze({ minRequests: 15, bonusXp: 100, label: 'High demand', level: 'high' }),
    Object.freeze({ minRequests: 5, bonusXp: 50, label: 'Requested', level: 'requested' }),
    Object.freeze({ minRequests: 0, bonusXp: 0, label: 'Open bounty', level: 'open' }),
  ]),
});

function safeNumber(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function getBountyPriority(year, now = new Date()) {
  const currentYear = now.getFullYear();
  const normalizedYear = Number(year);
  if (normalizedYear >= currentYear) return 'High';
  if (normalizedYear === currentYear - 1) return 'Medium';
  return 'Low';
}

function getDemandTier(requestCount) {
  const count = safeNumber(requestCount);
  return BOUNTY_RULES.DEMAND_TIERS.find((tier) => count >= tier.minRequests) || BOUNTY_RULES.DEMAND_TIERS[BOUNTY_RULES.DEMAND_TIERS.length - 1];
}

function getPriorityBonus(priority) {
  if (priority === 'High') return BOUNTY_RULES.HIGH_PRIORITY_BONUS;
  if (priority === 'Medium') return BOUNTY_RULES.MEDIUM_PRIORITY_BONUS;
  return 0;
}

function getPaperBounty({ requestCount = 0, priority = 'Low' } = {}) {
  const normalizedRequestCount = safeNumber(requestCount);
  const demandTier = getDemandTier(normalizedRequestCount);
  const priorityBonusXp = getPriorityBonus(priority);
  const bountyBonusXp = demandTier.bonusXp + priorityBonusXp;
  const rewardXp = BOUNTY_RULES.APPROVED_PAPER_XP + BOUNTY_RULES.BASE_FULFILLMENT_XP + bountyBonusXp;

  return {
    requestCount: normalizedRequestCount,
    rewardXp,
    bountyBonusXp,
    fulfillmentXp: BOUNTY_RULES.BASE_FULFILLMENT_XP,
    approvedPaperXp: BOUNTY_RULES.APPROVED_PAPER_XP,
    demandBonusXp: demandTier.bonusXp,
    priorityBonusXp,
    demandLabel: demandTier.label,
    demandLevel: demandTier.level,
  };
}

module.exports = {
  BOUNTY_RULES,
  getBountyPriority,
  getDemandTier,
  getPaperBounty,
};
