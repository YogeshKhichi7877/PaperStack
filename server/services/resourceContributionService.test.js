const test = require('node:test');
const assert = require('node:assert/strict');
const { subjectPayload } = require('./resourceContributionService');
const { resolveResourceSubjectKey } = require('./subjectPageService');

test('uploaded notes and the hyphenated paper link share the same subject key', () => {
  const uploaded = subjectPayload({
    subjectName: 'Innovation and Entrepreneurship',
    subjectCode: 'HM-505',
    branch: 'ECE',
    semester: '5',
  });

  assert.equal(uploaded.subjectKey, 'HM505');
  assert.equal(uploaded.subjectCode, 'HM505');
  assert.equal(uploaded.subjectKey, resolveResourceSubjectKey('HM-505'));
});
