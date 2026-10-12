function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSemesterPackQuery({ branch, semester, examType }) {
  const branchValue = String(branch || '').trim();
  const aliases = branchQueryValues(branchValue);
  const branchRegex = new RegExp(`^(?:${(aliases.length ? aliases : [branchValue]).map(escapeRegex).join('|')})$`, 'i');
  const titleRegex = new RegExp(`(?:^|\\s|_)${escapeRegex(branchValue)}(?:\\s|_|$)`, 'i');

  return {
    semester: Number(semester),
    examType: String(examType || '').trim(),
    filePath: { $exists: true, $ne: '' },
    $or: [
      { branch: branchRegex },
      // Legacy records sometimes stored branch information only in title.
      { $and: [{ $or: [{ branch: { $exists: false } }, { branch: '' }, { branch: null }] }, { title: titleRegex }] },
    ],
  };
}

module.exports = {
  escapeRegex,
  buildSemesterPackQuery,
};
const { branchQueryValues } = require('./branches');
