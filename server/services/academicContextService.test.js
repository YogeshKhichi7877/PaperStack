const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAcademicContext } = require('./academicContextService');

test('academic context includes only requested verified data groups', async () => {
  const context = await buildAcademicContext({
    questionId: 'q1', includeSolutions: true, includeTopicStats: true,
  }, {
    loadQuestion: async () => ({ _id: 'q1', paperId: 'p1', questionText: 'Compute 2+2',
      subject: 'Mathematics', subjectCode: 'MA101', subjectKey: 'ma101', status: 'verified' }),
    loadSolutions: async () => [{ _id: 's1', questionId: 'q1', answerText: '4', helpfulCount: 2 }],
    loadTopicStats: async () => [{ _id: 'Arithmetic', questionCount: 3, totalMarks: 8, years: [2025] }],
  });
  assert.equal(context.subject.subjectCode, 'MA101');
  assert.equal(context.approvedSolutions[0].answerText, '4');
  assert.equal(context.topicStats[0].questionCount, 3);
  assert.equal('resources' in context, false);
  assert.equal('studentContext' in context, false);
});

test('academic context never invents archive or student statistics', async () => {
  const context = await buildAcademicContext({ questionId: 'q1' }, {
    loadQuestion: async () => ({ _id: 'q1', questionText: 'Explain trees', subjectCode: 'CS201' }),
  });
  assert.equal('archiveStats' in context, false);
  assert.equal('topicStats' in context, false);
  assert.equal('studentContext' in context, false);
});
