function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

function resourceQuality(resource = {}, now = new Date()) {
  const metadata = resource.metadata || {};
  const verified = resource.sourceType === 'admin' || ['legacy_paper', 'legacy_solution'].includes(resource.sourceType) || Boolean(metadata.verifiedAt);
  const completeness = [resource.title, resource.subjectName, resource.subjectCode, resource.fileUrl]
    .filter(Boolean).length / 4;
  const engagement = Math.log10(1 + Number(resource.views || 0) + Number(resource.downloads || 0) * 3);
  const reportCount = clamp(metadata.reportCount || metadata.reports, 0, 20);
  const contributorReliability = clamp(metadata.contributorReliability, 0, 1);
  const updatedAt = new Date(resource.updatedAt || resource.createdAt || 0).getTime();
  const ageDays = updatedAt ? Math.max(0, (now.getTime() - updatedAt) / 86400000) : 3650;
  const freshness = Math.max(0, 1 - ageDays / 1825);
  const score = clamp(
    35 + (verified ? 20 : 0) + completeness * 15 + clamp(engagement, 0, 4) * 5 + contributorReliability * 8 + freshness * 5 - reportCount * 6,
    0,
    100
  );
  const badges = [];
  if (verified) badges.push('Verified source');
  if (Number(resource.downloads || 0) >= 10) badges.push('Popular');
  if (completeness === 1) badges.push('Complete metadata');
  if (reportCount > 0) badges.push('Under review');
  return { qualityScore: Math.round(score * 10) / 10, qualityBadges: badges, reportCount };
}

function rankResources(resources = []) {
  return resources
    .map((resource) => ({ ...resource, ...resourceQuality(resource) }))
    .sort((a, b) => b.qualityScore - a.qualityScore || Number(b.year || 0) - Number(a.year || 0) || String(a._id).localeCompare(String(b._id)));
}

module.exports = { rankResources, resourceQuality };
