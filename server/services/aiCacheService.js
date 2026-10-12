const crypto = require('node:crypto');
const { recordAiMetric } = require('./aiMetricsService');

const memory = new Map();
let redisClient;
let redisUnavailable = false;

function enabled(env = process.env) {
  return env.AI_CACHE_ENABLED !== 'false';
}

function memoryLimit(env = process.env) {
  const value = Number(env.AI_CACHE_MEMORY_MAX || 500);
  return Math.max(20, Math.min(5000, Number.isFinite(value) ? value : 500));
}

function redisConnectionUrl(value) {
  try {
    const url = new URL(String(value || '').trim());
    if (!['redis:', 'rediss:'].includes(url.protocol) || !url.hostname) return null;
    // Upstash Redis requires TLS. Its CLI examples may still contain redis://
    // because redis-cli receives --tls separately; ioredis needs rediss://.
    if (url.protocol === 'redis:' && (url.hostname.endsWith('.upstash.io') || url.hostname.endsWith('.upstash.com'))) {
      url.protocol = 'rediss:';
    }
    return url.toString();
  } catch {
    return null;
  }
}

function getRedis(env = process.env) {
  if (redisUnavailable || !String(env.REDIS_URL || '').trim()) return null;
  if (redisClient?.status === 'end') redisClient = null;
  if (redisClient) return redisClient;
  try {
    const connectionUrl = redisConnectionUrl(env.REDIS_URL);
    if (!connectionUrl) return null;
    // Redis is optional. Requiring it lazily keeps local and existing Render deployments working.
    const Redis = require('ioredis');
    redisClient = new Redis(connectionUrl, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 5000,
      retryStrategy: () => null,
    });
    redisClient.on('error', () => {});
    return redisClient;
  } catch {
    redisUnavailable = true;
    return null;
  }
}

function hashContent(value) {
  const content = Buffer.isBuffer(value)
    ? value
    : typeof value === 'string' ? value : JSON.stringify(value);
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 24);
}

function safeSegment(value) {
  return String(value || 'global').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 80);
}

function buildAiCacheKey(task, entityId, source, version = 'v2') {
  return `ai:${safeSegment(task)}:${safeSegment(entityId)}:${hashContent(source)}:${safeSegment(version)}`;
}

function pruneMemory(env = process.env) {
  const now = Date.now();
  for (const [key, item] of memory) {
    if (item.expiresAt <= now) memory.delete(key);
  }
  const limit = memoryLimit(env);
  while (memory.size > limit) memory.delete(memory.keys().next().value);
}

async function get(key, env = process.env) {
  if (!enabled(env)) return null;
  pruneMemory(env);
  const local = memory.get(key);
  if (local) {
    recordAiMetric('AI_CACHE_HIT', { backend: 'memory' });
    return local.value;
  }

  const redis = getRedis(env);
  if (!redis) {
    recordAiMetric('AI_CACHE_MISS');
    return null;
  }
  try {
    if (redis.status === 'wait') await redis.connect();
    const value = await redis.get(key);
    if (!value) {
      recordAiMetric('AI_CACHE_MISS');
      return null;
    }
    recordAiMetric('AI_CACHE_HIT', { backend: 'redis' });
    return JSON.parse(value);
  } catch {
    recordAiMetric('AI_CACHE_MISS');
    return null;
  }
}

async function set(key, value, ttlSeconds = 900, env = process.env) {
  if (!enabled(env)) return value;
  const ttl = Math.max(30, Math.min(86400, Number(ttlSeconds) || 900));
  memory.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
  pruneMemory(env);

  const redis = getRedis(env);
  if (redis) {
    try {
      if (redis.status === 'wait') await redis.connect();
      await redis.set(key, JSON.stringify(value), 'EX', ttl);
    } catch {
      // Cache failure must never fail the feature.
    }
  }
  return value;
}

function clearMemory() {
  memory.clear();
}

module.exports = {
  getRedis,
  redisConnectionUrl,
  buildAiCacheKey,
  clearMemory,
  enabled,
  get,
  hashContent,
  set,
};
