const { createHmac } = require('node:crypto');
const { getRedis } = require('./aiCacheService');
const { FLAT_SUBJECT_CATALOG, normalizeSubjectCode } = require('./subjectService');
const WINDOW_MS = 90000;
const SNAPSHOT_MS = 300000;
const KEYS = ['ps:presence:v1:seen', 'ps:presence:v1:sessions'];
// Both keys share a hash tag if Redis Cluster is used in future.
KEYS[0] = 'ps:{presence}:seen'; KEYS[1] = 'ps:{presence}:sessions';
const CLEAN = `local expired = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
for _, id in ipairs(expired) do redis.call('HDEL', KEYS[2], id) end
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
`;
const WRITE = CLEAN + `if ARGV[4] == '' then
redis.call('ZREM', KEYS[1], ARGV[3]); redis.call('HDEL', KEYS[2], ARGV[3])
else
local last = redis.call('ZSCORE', KEYS[1], ARGV[3])
if last and tonumber(ARGV[2]) - tonumber(last) < 5000 and redis.call('HGET', KEYS[2], ARGV[3]) == ARGV[4] then return 0 end
redis.call('ZADD', KEYS[1], ARGV[2], ARGV[3]); redis.call('HSET', KEYS[2], ARGV[3], ARGV[4])
end
redis.call('EXPIRE', KEYS[1], 180); redis.call('EXPIRE', KEYS[2], 180)
return 1`;
const READ = CLEAN + "return redis.call('HVALS', KEYS[2])";

function routeCategory(path) {
  const route = String(path || '').split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (/^\/admin(?:\/|$)/.test(route)) return 'ADMIN';
  if (route === '/') return 'HOME';
  const groups = [
    ['QUESTIONS', ['questions']], ['LEARN', ['learn']], ['PRACTICE', ['practice']],
    ['SUBJECT', ['subject']], ['EXAM_WAR_ROOM', ['exam-war-room']], ['EXAMS', ['exam-mode', 'important-topics', 'pyq-intelligence']],
    ['MOCK', ['mock-exams', 'mock-evaluation']], ['DASHBOARD', ['dashboard', 'learning-dashboard', 'streaks']],
    ['PROFILE', ['profile']], ['RESOURCES', ['archive', 'revision-sheets', 'semester-survival']],
  ];
  return groups.find(([, paths]) => paths.some((prefix) => route === '/' + prefix || route.startsWith('/' + prefix + '/')))?.[0] || 'OTHER';
}
function aggregatePresence(records) {
  // Merge a guest tab with its now-authenticated browser, including login in another tab.
  const signedInBrowsers = new Map(records.filter((item) => item.user).map((item) => [item.browser, item.user]));
  const users = new Set(), authenticated = new Set(), guests = new Set();
  const pages = {}, subjects = {};
  for (const item of records) {
    const user = item.user || signedInBrowsers.get(item.browser);
    const identity = user ? 'u:' + user : 'g:' + item.browser;
    users.add(identity); (user ? authenticated : guests).add(identity);
    (pages[item.page] ||= new Set()).add(identity);
    if (item.subject) (subjects[item.subject] ||= new Set()).add(identity);
  }
  const counts = (groups) => Object.fromEntries(Object.entries(groups).map(([key, values]) => [key, values.size]));
  return { activeUsers: users.size, authenticatedUsers: authenticated.size, guests: guests.size, activeSessions: records.length, pages: counts(pages), subjects: counts(subjects) };
}
function indiaDayStart(now) {
  const key = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return new Date(`${key}T00:00:00+05:30`);
}
function createPresenceService({ redisProvider = getRedis, secret = process.env.JWT_SECRET, now = () => Date.now(), Snapshot, databaseReady = () => true } = {}) {
  const hash = (value) => createHmac('sha256', secret).update(value).digest('hex');
  async function redis() {
    const client = redisProvider();
    if (!client) throw new Error('Presence unavailable');
    if (client.status === 'wait') await client.connect();
    return client;
  }
  async function heartbeat(body, principal = {}) {
    const client = await redis();
    const timestamp = now();
    const page = routeCategory(body.route);
    const code = normalizeSubjectCode(body.subjectCode);
    const subject = FLAT_SUBJECT_CATALOG.some((item) => item.code === code) ? code : '';
    const record = principal.admin || page === 'ADMIN' ? '' : JSON.stringify({ browser: hash('browser:' + body.anonymousId), user: principal.userId ? hash('user:' + principal.userId) : '', page, subject });
    await client.eval(WRITE, 2, ...KEYS, timestamp - WINDOW_MS, timestamp, hash('session:' + body.sessionId), record);
  }
  async function live() {
    const client = await redis();
    const rows = await client.eval(READ, 2, ...KEYS, now() - WINDOW_MS);
    return { ...aggregatePresence(rows.map((row) => JSON.parse(row))), sampledAt: new Date(now()).toISOString(), activeWindowSeconds: 90 };
  }
  async function history() {
    if (!Snapshot || !databaseReady()) throw new Error('History unavailable');
    const timestamp = now();
    const samples = await Snapshot.find({ bucket: { $gte: new Date(timestamp - 86400000) } }).sort({ bucket: 1 }).select('-_id').lean();
    const start = indiaDayStart(new Date(timestamp));
    const peak = samples.filter((sample) => new Date(sample.sampledAt) >= start).reduce((best, item) => !best || item.activeUsers > best.activeUsers ? item : best, null);
    return { samples, peakToday: peak?.activeUsers ?? null, peakTime: peak?.sampledAt ?? null, timezone: 'Asia/Kolkata', peakBasis: 'Five-minute samples', retentionDays: 60 };
  }
  async function snapshot() {
    if (!Snapshot || !databaseReady()) return false;
    const client = await redis();
    const bucket = new Date(Math.floor(now() / SNAPSHOT_MS) * SNAPSHOT_MS);
    const key = 'ps:presence:snapshot:' + bucket.getTime();
    if (!await client.set(key, '1', 'EX', 300, 'NX')) return false;
    try {
      const sample = await live();
      await Snapshot.updateOne({ bucket }, { $setOnInsert: { bucket, ...sample } }, { upsert: true });
      return true;
    } catch (error) { await client.del(key).catch(() => {}); throw error; }
  }
  function startSnapshots() {
    const timer = setInterval(() => snapshot().catch(() => {}), SNAPSHOT_MS);
    timer.unref();
    return () => clearInterval(timer);
  }
  return { heartbeat, live, history, snapshot, startSnapshots };
}
module.exports = { createPresenceService, aggregatePresence, routeCategory, indiaDayStart, WINDOW_MS, WRITE, READ };
