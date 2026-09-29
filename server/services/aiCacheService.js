const crypto = require('node:crypto');

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

function getRedis(env = process.env) {
  if (!enabled(env) || redisUnavailable || !String(env.REDIS_URL || '').trim()) return null;
  if (redisClient) return redisClient;
  try {
    // Redis is optional. Requiring it lazily keeps local and existing Render deployments working.
    const Redis = require('ioredis');
    redisClient = new Redis(env.REDIS_URL, {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 1500,
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
  if (local) return local.value;

  const redis = getRedis(env);
  if (!redis) return null;
  try {
    if (redis.status === 'wait') await redis.connect();
    const value = await redis.get(key);
    if (!value) return null;
    return JSON.parse(value);
  } catch {
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
  buildAiCacheKey,
  clearMemory,
  enabled,
  get,
  hashContent,
  set,
};
