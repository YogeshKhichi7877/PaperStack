const test = require('node:test');
const assert = require('node:assert/strict');
const cache = require('./aiCacheService');

test('Upstash CLI URLs use TLS with ioredis', () => {
  assert.equal(cache.redisConnectionUrl('redis://default:secret@sample.upstash.io:6379'), 'rediss://default:secret@sample.upstash.io:6379');
  assert.equal(cache.redisConnectionUrl('redis://localhost:6379'), 'redis://localhost:6379');
  assert.equal(cache.redisConnectionUrl('redis-cli --tls -u redis://default:secret@sample.upstash.io:6379'), null);
});

test('AI cache keys include task, entity, content hash and version', () => {
  const first = cache.buildAiCacheKey('QUESTION_TUTOR', 'question-1', 'prompt a', 'v2');
  const second = cache.buildAiCacheKey('QUESTION_TUTOR', 'question-1', 'prompt b', 'v2');
  assert.match(first, /^ai:question_tutor:question-1:[a-f0-9]{24}:v2$/);
  assert.notEqual(first, second);
});

test('AI cache works without Redis and respects disabled mode', async () => {
  cache.clearMemory();
  await cache.set('ai:test:item:hash:v2', { answer: 4 }, 60, { AI_CACHE_ENABLED: 'true' });
  assert.deepEqual(await cache.get('ai:test:item:hash:v2', { AI_CACHE_ENABLED: 'true' }), { answer: 4 });
  assert.equal(await cache.get('ai:test:item:hash:v2', { AI_CACHE_ENABLED: 'false' }), null);
});
