const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const { rateLimitConfig } = require('../config/rateLimits');
const { actorKey, createRateLimiters } = require('./aiRateLimiters');

async function withServer(env, run) {
  const app = express();
  app.use((req, res, next) => {
    if (req.header('x-user')) req.user = { _id: req.header('x-user') };
    next();
  });
  const { studentAiBurstLimiter, studentAiQuotaLimiter } = createRateLimiters(env);
  app.get('/similar', (req, res) => res.json({ ok: true }));
  app.post('/ai', studentAiBurstLimiter, studentAiQuotaLimiter,
    (req, res) => res.json({ ok: true }));
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test('authenticated students on the same IP receive separate AI budgets', async () => {
  await withServer({
    STUDENT_AI_BURST_WINDOW_MS: '60000', STUDENT_AI_BURST_MAX: '2',
    STUDENT_AI_RATE_LIMIT_WINDOW_MS: '60000', STUDENT_AI_RATE_LIMIT_MAX: '10',
  }, async (url) => {
    for (const user of ['student-a', 'student-b']) {
      for (let index = 0; index < 2; index += 1) {
        const response = await fetch(`${url}/ai`, { method: 'POST', headers: { 'x-user': user } });
        assert.equal(response.status, 200);
      }
    }
    const limited = await fetch(`${url}/ai`, { method: 'POST', headers: { 'x-user': 'student-a' } });
    assert.equal(limited.status, 429);
    assert.ok(Number(limited.headers.get('retry-after')) >= 1);
    const body = await limited.json();
    assert.equal(body.code, 'AI_RATE_LIMITED');
    assert.ok(body.retryAfterSeconds >= 1);
  });
});

test('anonymous AI requests use shared IP protection and deterministic routes do not spend it', async () => {
  await withServer({
    STUDENT_AI_BURST_WINDOW_MS: '60000', STUDENT_AI_BURST_MAX: '1',
    STUDENT_AI_RATE_LIMIT_WINDOW_MS: '60000', STUDENT_AI_RATE_LIMIT_MAX: '10',
  }, async (url) => {
    for (let index = 0; index < 5; index += 1) {
      assert.equal((await fetch(`${url}/similar`)).status, 200);
    }
    assert.equal((await fetch(`${url}/ai`, { method: 'POST' })).status, 200);
    assert.equal((await fetch(`${url}/ai`, { method: 'POST' })).status, 429);
  });
});

test('normal study bursts fit the default policy and invalid env values are bounded safely', () => {
  const defaults = rateLimitConfig({});
  assert.ok(defaults.studentBurst.max >= 10);
  const fallback = rateLimitConfig({
    STUDENT_AI_BURST_MAX: 'not-a-number',
    QUESTION_EXTRACTION_AI_CONCURRENCY: '999',
  });
  assert.equal(fallback.studentBurst.max, defaults.studentBurst.max);
  assert.equal(fallback.extractionConcurrency, 4);
  assert.notEqual(actorKey({ user: { _id: 'a' }, ip: '127.0.0.1' }),
    actorKey({ user: { _id: 'b' }, ip: '127.0.0.1' }));
});
