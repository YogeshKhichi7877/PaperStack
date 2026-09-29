const test = require('node:test');
const assert = require('node:assert/strict');
const { rankResources, resourceQuality } = require('./resourceQualityService');

test('verified complete resources outrank incomplete reported resources', () => {
  const good = { _id: 'a', title: 'Notes', subjectName: 'CG', subjectCode: 'CS502', fileUrl: 'https://x', sourceType: 'admin', downloads: 20, metadata: {}, updatedAt: new Date() };
  const bad = { _id: 'b', title: 'Notes', sourceType: 'contribution', metadata: { reportCount: 3 }, updatedAt: new Date() };
  assert.ok(resourceQuality(good).qualityScore > resourceQuality(bad).qualityScore);
  assert.equal(rankResources([bad, good])[0]._id, 'a');
});
