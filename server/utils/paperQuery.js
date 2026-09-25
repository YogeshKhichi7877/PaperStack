function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSemesterPackQuery({ branch, semester, examType }) {
  const branchValue = String(branch || '').trim();
  const branchRegex = new RegExp(escapeRegex(branchValue), 'i');

  return {
    semester: Number(semester),
    examType: String(examType || '').trim(),
    filePath: { $exists: true, $ne: '' },
    $or: [
      { branch: branchRegex },
      // Legacy records sometimes stored branch information only in title.
      { title: branchRegex },
    ],
  };
}

module.exports = {
  escapeRegex,
  buildSemesterPackQuery,
};
