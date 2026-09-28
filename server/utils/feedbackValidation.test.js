const test = require('node:test');
const assert = require('node:assert/strict');
const { validateTestimonial, validateSiteReport } = require('./feedbackValidation');

test('student experience accepts text and canonicalizes branch', () => {
  const parsed = validateTestimonial({ message: 'PaperStack helped me find the right past papers.', branch: 'AIML', semester: '5', rating: 4 });
  assert.deepEqual(parsed.value, { message: 'PaperStack helped me find the right past papers.', branch: 'CSE (AI-ML)', semester: 5, rating: 4 });
});

test('student experience removes markup and rejects empty or excessive text', () => {
  assert.equal(validateTestimonial({ message: '<script>alert(1)</script>' }).error, 'Experience must be 15 to 600 characters.');
  assert.ok(validateTestimonial({ message: 'a'.repeat(601) }).error);
  assert.equal(validateTestimonial({ message: '<b>Helpful archive for exam preparation.</b>', rating: 5 }).value.message, 'Helpful archive for exam preparation.');
});

test('new reviews require an integer star rating', () => {
  for (const rating of [undefined, null, '', '5', 0, 6, 2.5, true]) {
    assert.ok(validateTestimonial({ message: 'Helpful archive for exam preparation.', rating }).error);
  }
  for (const rating of [1, 2, 3, 4, 5]) assert.equal(validateTestimonial({ message: 'Helpful archive for exam preparation.', rating }).value.rating, rating);
});

test('site report requires a category, title and useful details', () => {
  assert.ok(validateSiteReport({ category: 'Unknown', title: 'Broken', message: 'This feature does not work at all.' }).error);
  assert.ok(validateSiteReport({ category: 'Broken page', title: 'Hi', message: 'This feature does not work at all.' }).error);
  assert.ok(validateSiteReport({ category: 'Broken page', title: 'Broken archive', message: 'Short' }).error);
  const parsed = validateSiteReport({ category: 'Broken page', title: 'Broken archive', message: 'The archive does not load when I click Search.', url: '/archive' });
  assert.equal(parsed.value.url, '/archive');
});

test('site report strips markup and rejects invalid URLs', () => {
  assert.ok(validateSiteReport({ category: 'UI problem', title: 'Navigation issue', message: 'The menu is difficult to use on my phone.', url: 'javascript:alert(1)' }).error);
  const parsed = validateSiteReport({ category: 'UI problem', title: 'Navigation issue', message: '<b>The menu is difficult to use on my phone.</b>' });
  assert.equal(parsed.value.message, 'The menu is difficult to use on my phone.');
});
