const test = require('node:test');
const assert = require('node:assert/strict');
const { notifyAdminUpload } = require('./adminUploadNotification');

test('upload alert uses the review route and a short, sanitized message', async () => {
  const originalFetch = global.fetch;
  const original = Object.fromEntries(['NTFY_TOPIC', 'NTFY_SERVER', 'NTFY_TOKEN', 'FRONTEND_URL', 'NOTIFICATION_PROVIDER'].map((key) => [key, process.env[key]]));
  let request;
  process.env.NTFY_TOPIC = 'paperstack-test-topic';
  process.env.NTFY_SERVER = 'https://notify.example.test';
  process.env.NTFY_TOKEN = 'test-token';
  process.env.FRONTEND_URL = 'https://paperstack.example.test';
  process.env.NOTIFICATION_PROVIDER = 'ntfy';
  global.fetch = async (url, options) => { request = { url, ...options }; return { ok: true }; };
  try {
    assert.equal(await notifyAdminUpload({ kind: 'solution', title: 'A\nB', contributor: 'Student' }), true);
    assert.equal(request.url, 'https://notify.example.test/paperstack-test-topic');
    assert.equal(request.headers.Click, 'https://paperstack.example.test/admin/question-solutions');
    assert.equal(request.headers.Authorization, 'Bearer test-token');
    assert.match(request.body, /Student submitted solution: A B/);
    assert.doesNotMatch(request.body, /@|PDF:/);
  } finally {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
