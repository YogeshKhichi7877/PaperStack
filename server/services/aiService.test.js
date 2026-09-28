const test = require('node:test');
const assert = require('node:assert/strict');
const { aiAvailable, generateText, providerOrder } = require('./aiService');

const env = {
  AI_ENABLED: 'true', AI_PRIMARY_PROVIDER: 'gemini', AI_FALLBACK_PROVIDER: 'groq',
  GROQ_API_KEY: 'test-key', GROQ_MODEL: 'test-model', GEMINI_API_KEY: 'test-key', GEMINI_MODEL: 'test-model',
};

test('provider order defaults to Gemini and does not require model overrides', () => {
  assert.deepEqual(providerOrder(env), ['gemini', 'groq']);
  assert.deepEqual(providerOrder({ GEMINI_API_KEY: 'key', GROQ_API_KEY: 'key' }), ['gemini', 'groq']);
  assert.deepEqual(providerOrder({ ...env, GROQ_MODEL: '' }), ['gemini', 'groq']);
  assert.deepEqual(providerOrder({ ...env, GROQ_API_KEY: '' }), ['gemini']);
  assert.equal(aiAvailable({ GEMINI_API_KEY: ' ' }), false);
  assert.equal(aiAvailable({ ...env, AI_ENABLED: 'false' }), false);
});

test('falls back to second provider and keeps document instructions separate', async () => {
  const requests = [];
  const answer = await generateText('Explain x', {}, {
    env,
    fetch: async (url, options) => {
      requests.push({ url, body: JSON.parse(options.body) });
      if (requests.length === 1) return { ok: false, status: 503 };
      return { ok: true, json: async () => ({ choices: [{ message: { content: 'Answer' } }] }) };
    },
  });
  assert.equal(answer, 'Answer');
  assert.equal(requests.length, 2);
  assert.match(requests[0].body.systemInstruction.parts[0].text, /untrusted academic source material/);
  assert.match(requests[0].url, /generativelanguage/);
  assert.match(requests[1].url, /api.groq.com/);
});

test('successful Gemini request does not call Groq', async () => {
  const urls = [];
  assert.equal(await generateText('Explain x', {}, { env, fetch: async (url) => {
    urls.push(url);
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Gemini answer' }] } }] }) };
  } }), 'Gemini answer');
  assert.equal(urls.length, 1);
  assert.match(urls[0], /generativelanguage/);
});

for (const failure of [429, 503, 401, 'network', 'empty']) {
  test(`Gemini ${failure} falls back to Groq before retrying`, async () => {
    const requests = [];
    const answer = await generateText('Return JSON explaining x', { json: true }, {
      env: { ...env, AI_MAX_RETRIES: '2', GROQ_MODEL: '' },
      fetch: async (url, options) => {
        requests.push({ url, body: JSON.parse(options.body) });
        if (requests.length > 1) return { ok: true, json: async () => ({ choices: [{ message: { content: 'Groq answer' } }] }) };
        if (failure === 'network') throw new TypeError('fetch failed');
        if (failure === 'empty') return { ok: true, json: async () => ({}) };
        return { ok: false, status: failure };
      },
    });
    assert.equal(answer, 'Groq answer');
    assert.equal(requests.length, 2);
    assert.match(requests[1].url, /api.groq.com/);
    assert.equal(requests[1].body.model, 'openai/gpt-oss-120b');
    assert.equal(requests[1].body.response_format.type, 'json_object');
  });
}

test('a stalled Gemini request is aborted and Groq gets a fresh signal', async () => {
  const signals = [];
  const answer = await generateText('Explain x', { timeoutMs: 1000 }, { env, fetch: async (url, options) => {
    signals.push(options.signal);
    if (url.includes('groq')) return { ok: true, json: async () => ({ choices: [{ message: { content: 'Groq answer' } }] }) };
    return new Promise((resolve, reject) => options.signal.addEventListener('abort', () => {
      const error = new Error('aborted'); error.name = 'AbortError'; reject(error);
    }));
  } });
  assert.equal(answer, 'Groq answer');
  assert.equal(signals[0].aborted, true);
  assert.equal(signals[1].aborted, false);
});

test('unavailable error identifies missing fallback without exposing keys', async () => {
  await assert.rejects(generateText('Explain x', {}, {
    env: { GEMINI_API_KEY: 'secret-test-value' },
    fetch: async () => ({ ok: false, status: 503 }),
  }), (error) => {
    assert.equal(error.code, 'AI_UNAVAILABLE');
    assert.match(error.message, /gemini: HTTP 503/);
    assert.match(error.message, /groq API key not configured/);
    assert.doesNotMatch(error.message, /secret-test-value/);
    return true;
  });
});
