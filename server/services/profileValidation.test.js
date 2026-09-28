const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeDisplayName, validDisplayName, validPhoto } = require('./profileValidation');

test('display names are normalized and reject markup or control characters', () => {
  assert.equal(normalizeDisplayName('  Alex   Student  '), 'Alex Student');
  assert.equal(validDisplayName('Alex Student'), true);
  assert.equal(validDisplayName('<script>'), false);
  assert.equal(validDisplayName('A'), false);
});

test('profile photos require matching extension, MIME and image signature', () => {
  const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(validPhoto({ buffer: png, mimetype: 'image/png', originalname: 'avatar.png' }), true);
  assert.equal(validPhoto({ buffer: png, mimetype: 'image/png', originalname: 'avatar.jpg' }), false);
  assert.equal(validPhoto({ buffer: png, mimetype: 'image/jpeg', originalname: 'avatar.jpg' }), false);
});
