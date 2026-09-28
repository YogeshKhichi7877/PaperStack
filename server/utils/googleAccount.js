function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function applyVerifiedGoogleIdentity(user, payload) {
  if (!payload?.sub || payload.email_verified !== true || normalizeEmail(payload.email) !== normalizeEmail(user.email)) {
    return { status: 403, message: 'Google email must match your PaperStack account.' };
  }
  if (user.googleId && user.googleId !== payload.sub) {
    return { status: 409, message: 'This account is linked to another Google identity.' };
  }

  let changed = false;
  if (!user.googleId) {
    user.googleId = payload.sub;
    changed = true;
  }
  const provider = user.password ? 'linked' : 'google';
  if (user.authProvider !== provider) {
    user.authProvider = provider;
    changed = true;
  }
  if (!user.avatar && payload.picture) {
    user.avatar = payload.picture;
    changed = true;
  }
  if (!user.emailVerified) {
    user.emailVerified = true;
    changed = true;
  }
  return { changed };
}

module.exports = { applyVerifiedGoogleIdentity };
