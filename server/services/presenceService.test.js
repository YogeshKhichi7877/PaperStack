const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const jwt = require('jsonwebtoken');
const { createAuthMiddleware } = require('../middleware/auth');
const { createPresenceRouter } = require('../routes/presenceRoutes');
const { createPresenceService, routeCategory, indiaDayStart, WRITE } = require('./presenceService');

// Models the Redis contract; a deployed Redis smoke test is still required.
function fakeRedis() {
  const sessions = new Map(), locks = new Set();
  return {
    sessions,
    async eval(script, n, seenKey, sessionKey, cutoff, now, id, record) {
      for (const [key, item] of sessions) if (item.time <= cutoff) sessions.delete(key);
      if (script === WRITE) { if (record) sessions.set(id, { time: now, record }); else sessions.delete(id); return 1; }
      return [...sessions.values()].map((item) => item.record);
    },
    async set(key) { if (locks.has(key)) return null; locks.add(key); return 'OK'; },
    async del(key) { locks.delete(key); },
  };
}
const body = (sessionId = 'tab-1234567890123456', anonymousId = 'browser-1234567890123456') => ({ sessionId, anonymousId, route: '/learn/topic/sensitive-title?secret=notes', subjectCode: 'CS302' });
test('presence deduplicates tabs and logged-in users, merges guest-to-login, normalizes and expires', async () => {
  let now = 100000;
  const redis = fakeRedis();
  const service = createPresenceService({ redisProvider: () => redis, secret: 'test', now: () => now });
  await service.heartbeat(body()); await service.heartbeat(body());
  await service.heartbeat(body('second-tab-1234567890'));
  assert.equal((await service.live()).activeUsers, 1);
  assert.equal((await service.live()).activeSessions, 2);
  await service.heartbeat(body(), { userId: 'student1' });
  let result = await service.live();
  assert.equal(result.authenticatedUsers, 1); assert.equal(result.guests, 0);
  await service.heartbeat(body('third-tab-1234567890', 'other-browser-1234567890'), { userId: 'student1' });
  assert.equal((await service.live()).activeUsers, 1);
  assert.deepEqual(result.pages, { LEARN: 1 }); assert.deepEqual(result.subjects, { CS302: 1 });
  assert.ok(!JSON.stringify([...redis.sessions]).includes('student1'));
  assert.ok(!JSON.stringify([...redis.sessions]).includes('sensitive-title'));
  now += 90000;
  assert.equal((await service.live()).activeUsers, 0);
});
test('admin visits and admin routes are excluded; unknown subjects are not guessed', async () => {
  const service = createPresenceService({ redisProvider: () => redis, secret: 'test' });
  const redis = fakeRedis();
  await service.heartbeat(body(), { admin: true });
  await service.heartbeat({ ...body(), route: '/admin/product-analytics' });
  assert.equal((await service.live()).activeSessions, 0);
  await service.heartbeat({ ...body(), subjectCode: 'unknown' });
  assert.deepEqual((await service.live()).subjects, {});
  assert.equal(routeCategory('/mock-exams/123?answer=secret'), 'MOCK');
  assert.equal(routeCategory('/practice?sessionId=123'), 'PRACTICE');
  assert.equal(routeCategory('/unexpected/123'), 'OTHER');
});
test('snapshot is aggregate-only, once per bucket across instances, and IST peak comes from recorded samples', async () => {
  const now = new Date('2026-10-12T00:00:00Z').getTime();
  const redis = fakeRedis(); const saved = [];
  const Snapshot = {
    async updateOne(filter, update) { saved.push(update.$setOnInsert); },
    find() { return { sort() { return this; }, select() { return this; }, lean: async () => saved }; },
  };
  const deps = { redisProvider: () => redis, secret: 'test', now: () => now, Snapshot };
  const a = createPresenceService(deps), b = createPresenceService(deps);
  await a.heartbeat(body()); assert.equal(saved.length, 0, 'no Mongo heartbeat writes');
  assert.deepEqual(await Promise.all([a.snapshot(), b.snapshot()]), [true, false]);
  assert.equal(saved.length, 1); assert.ok(!JSON.stringify(saved).includes('browser'));
  const history = await b.history();
  assert.equal(history.peakToday, 1); assert.equal(history.timezone, 'Asia/Kolkata');
  assert.equal(indiaDayStart(new Date(now)).toISOString(), '2026-10-11T18:30:00.000Z');
});
test('presence reports unavailable instead of inventing zeros when Redis fails', async () => {
  const missing = createPresenceService({ redisProvider: () => null });
  await assert.rejects(missing.live(), /unavailable/);
  const failed = createPresenceService({ redisProvider: () => ({ eval: async () => { throw new Error('offline'); } }) });
  await assert.rejects(failed.live(), /offline/);
});
test('both analytics endpoints enforce 401/403/200; heartbeat reveals no analytics or client-selected user identity', async (t) => {
  const secret = 'test-only-secret';
  let received;
  const service = { heartbeat: async (...args) => { received = args; }, live: async () => ({ activeUsers: 3 }), history: async () => ({ samples: [] }) };
  const app = express(); app.use(express.json()); app.use('/api', createPresenceRouter({ ...createAuthMiddleware(secret), service }));
  const server = app.listen(0, '127.0.0.1'); await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => { server.closeAllConnections(); server.close(); });
  const url = `http://127.0.0.1:${server.address().port}/api`;
  const student = jwt.sign({ _id: 'verified-student' }, secret);
  const admin = jwt.sign({ role: 'admin', tokenType: 'admin' }, secret);
  for (const path of ['/admin/analytics/live', '/admin/analytics/presence/history']) {
    assert.equal((await fetch(url + path)).status, 401);
    assert.equal((await fetch(url + path, { headers: { Authorization: `Bearer ${student}` } })).status, 403);
    const allowed = await fetch(url + path, { headers: { Authorization: `Bearer ${admin}` } });
    assert.equal(allowed.status, 200); assert.equal(allowed.headers.get('cache-control'), 'no-store');
  }
  const post = (payload, token) => fetch(url + '/presence/heartbeat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
  const response = await post({ ...body(), userId: 'forged-user' }, student);
  assert.equal(response.status, 204); assert.equal(await response.text(), '');
  assert.equal(received[1].userId, 'verified-student');
  assert.equal((await post(body())).status, 204);
  assert.equal((await post({ sessionId: 'bad' })).status, 400);
  service.heartbeat = async () => { throw new Error('Redis down'); };
  assert.equal((await post(body())).status, 204);
});
