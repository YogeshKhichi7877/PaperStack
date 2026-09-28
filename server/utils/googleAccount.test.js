const test = require('node:test');
const assert = require('node:assert/strict');
const { applyVerifiedGoogleIdentity } = require('./googleAccount');

test('verified Google sign-in links an existing password account without erasing its password', () => {
  const user = { email: 'Student@iiitsurat.ac.in', password: 'existing-hash', authProvider: 'local' };
  const result = applyVerifiedGoogleIdentity(user, {
    sub: 'google-user-1', email: 'student@iiitsurat.ac.in', email_verified: true, picture: 'https://example.com/avatar',
  });
  assert.deepEqual(result, { changed: true });
  assert.equal(user.googleId, 'google-user-1');
  assert.equal(user.authProvider, 'linked');
  assert.equal(user.emailVerified, true);
  assert.equal(user.password, 'existing-hash');
});

test('Google identity must own the same verified email', () => {
  const user = { email: 'student@iiitsurat.ac.in', authProvider: 'local' };
  assert.equal(applyVerifiedGoogleIdentity(user, { sub: 'other', email: 'other@iiitsurat.ac.in', email_verified: true }).status, 403);
  assert.equal(applyVerifiedGoogleIdentity(user, { sub: 'other', email: user.email, email_verified: false }).status, 403);
  assert.equal(user.googleId, undefined);
});

test('a different Google identity cannot take over an already linked account', () => {
  const user = { email: 'student@iiitsurat.ac.in', googleId: 'original', authProvider: 'google' };
  const result = applyVerifiedGoogleIdentity(user, { sub: 'replacement', email: user.email, email_verified: true });
  assert.equal(result.status, 409);
  assert.equal(user.googleId, 'original');
});
