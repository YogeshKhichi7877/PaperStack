const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildQuestionPaperResource,
  buildSolutionResource,
} = require('./resourceMapper');

const samplePaper = {
  _id: '507f1f77bcf86cd799439011',
  title: 'Computer Graphics Mid Sem 2026',
  subject: 'Computer Graphics',
  subjectCode: 'CS502',
  branch: 'CSE',
  semester: 5,
  examType: 'Mid-Sem',
  year: 2026,
  filePath: 'https://example.com/paper.pdf',
  solutionPath: 'https://example.com/solution.pdf',
  views: 10,
  downloads: 4,
};

test('maps legacy paper into canonical question-paper resource', () => {
  const resource = buildQuestionPaperResource(samplePaper);
  assert.equal(resource.kind, 'question_paper');
  assert.equal(resource.subjectKey, 'CS502');
  assert.deepEqual(resource.branches, ['CSE']);
  assert.deepEqual(resource.semesters, [5]);
  assert.equal(resource.legacySourceKey, 'paper:507f1f77bcf86cd799439011:question_paper');
  assert.equal(resource.views, 10);
});

test('maps a paper with a hyphenated catalog code to the same subject as approved notes', () => {
  const resource = buildQuestionPaperResource({
    ...samplePaper,
    subject: 'Innovation and entrepreneurship',
    subjectCode: 'HM-505',
    branch: 'ECE',
  });
  assert.equal(resource.subjectKey, 'HM505');
  assert.equal(resource.subjectCode, 'HM505');
});

test('maps a linked solution when solution exists', () => {
  const solution = buildSolutionResource(samplePaper, 'parent-id');
  assert.equal(solution.kind, 'solution');
  assert.equal(solution.parentResourceId, 'parent-id');
  assert.equal(solution.fileUrl, 'https://example.com/solution.pdf');
});

test('does not create solution resource when paper has no solution', () => {
  const solution = buildSolutionResource({ ...samplePaper, solutionPath: '' });
  assert.equal(solution, null);
});
test('an imported paper awaiting review is never an active public resource', () => {
  for (const reviewStatus of ['processing', 'needs_review', 'failed']) {
    assert.equal(buildQuestionPaperResource({ ...samplePaper, reviewStatus }).status, 'pending');
    assert.equal(buildSolutionResource({ ...samplePaper, reviewStatus }).status, 'pending');
  }
  assert.equal(buildQuestionPaperResource({ ...samplePaper, reviewStatus: 'approved' }).status, 'active');
});
