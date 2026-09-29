const test = require('node:test');
const assert = require('node:assert/strict');
const { aiAvailable, generateForTask, generateResultForTask, generateText, modelForProvider, providerOrder, taskStatus } = require('./aiService');

const env = { AI_ENABLED: 'true', GEMINI_API_KEY: 'test-gemini-key', GROQ_API_KEY: 'test-groq-key',
  GEMINI_MODEL: 'test-gemini', GROQ_MODEL: 'test-groq', AI_MAX_RETRIES: '0' };
const groqReply = (content = 'Answer') => ({ ok: true,
  json: async () => ({ choices: [{ message: { content } }] }) });
const geminiReply = (content = 'Answer') => ({ ok: true,
  json: async () => ({ candidates: [{ content: { parts: [{ text: content }] } }] }) });

test('routing is task based and reports provider availability', () => {
  assert.deepEqual(providerOrder(env, 'QUESTION_TUTOR'), ['groq', 'gemini']);
  assert.deepEqual(providerOrder(env, 'QUESTION_EXTRACTION_VISUAL'), ['gemini', 'groq']);
  assert.deepEqual(providerOrder({ ...env, GROQ_API_KEY: '' }, 'QUESTION_TUTOR'), ['gemini']);
  assert.equal(aiAvailable({ ...env, AI_ENABLED: 'false' }, 'QUESTION_TUTOR'), false);
  assert.deepEqual(taskStatus('QUESTION_TUTOR', env),
    { task: 'QUESTION_TUTOR', available: true, providersAvailable: 2, degraded: false });
});

test('a Prompt Guard classifier configured as the Groq generation model uses the text model', () => {
  assert.equal(modelForProvider('groq', {
    GROQ_MODEL: 'meta-llama/llama-prompt-guard-2-86m',
  }), 'openai/gpt-oss-120b');
});

test('text tutoring sends Groq first with separate trusted instructions', async () => {
  const requests = [];
  const answer = await generateForTask('QUESTION_TUTOR', 'Explain x', {}, { env,
    fetch: async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return groqReply(); } });
  assert.equal(answer, 'Answer');
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /api.groq.com/);
  assert.match(requests[0].body.messages[0].content, /untrusted academic data/);
  assert.equal(requests[0].body.messages[1].content, 'Explain x');
});

test('visual extraction sends PDF only to Gemini', async () => {
  const requests = [];
  const attachment = { buffer: Buffer.from('pdf'), mimeType: 'application/pdf' };
  await generateForTask('QUESTION_EXTRACTION_VISUAL', 'Extract questions', { attachment }, { env,
    fetch: async (url, options) => { requests.push({ url, body: JSON.parse(options.body) }); return geminiReply(); } });
  assert.match(requests[0].url, /generativelanguage/);
  assert.equal(requests[0].body.contents[0].parts[1].inline_data.mime_type, 'application/pdf');
  assert.equal(requests.length, 1);
  assert.deepEqual(providerOrder(env, 'QUESTION_EXTRACTION_VISUAL', { attachment }), ['gemini']);
});

for (const status of [429, 503]) {
  test(`provider fallback follows HTTP ${status} without delaying the other provider`, async () => {
    const urls = [];
    const answer = await generateForTask('QUESTION_TUTOR', 'Explain x', {}, { env: { ...env, AI_MAX_RETRIES: '2' },
      fetch: async (url) => { urls.push(url); return urls.length === 1
        ? { ok: false, status } : geminiReply('Fallback answer'); } });
    assert.equal(answer, 'Fallback answer');
    assert.match(urls[0], /api.groq.com/);
    assert.match(urls[1], /generativelanguage/);
    assert.equal(urls.length, 2);
  });
}

test('invalid key stops retries and exposes a sanitized error', async () => {
  let requests = 0;
  await assert.rejects(generateForTask('QUESTION_TUTOR', 'Private input', {}, {
    env: { ...env, GEMINI_API_KEY: '', AI_MAX_RETRIES: '2' },
    fetch: async () => { requests += 1; return { ok: false, status: 401 }; },
  }), (error) => {
    assert.equal(error.code, 'AI_UNAVAILABLE');
    assert.equal(error.message, 'PaperStack AI is temporarily unavailable.');
    assert.doesNotMatch(error.message, /test-groq-key|Private input|groq/i);
    return true;
  });
  assert.equal(requests, 1);
});

test('invalid structured output falls back to the next provider', async () => {
  const urls = [];
  const answer = await generateForTask('NOVEL_QUESTION_GENERATION', 'Generate', {
    validateResponse: (text) => {
      if (text !== '{"questions":[]}') throw new TypeError('AI response invalid');
    },
  }, { env, fetch: async (url) => {
    urls.push(url);
    return urls.length === 1 ? groqReply('not JSON') : geminiReply('{"questions":[]}');
  } });
  assert.equal(answer, '{"questions":[]}');
  assert.match(urls[0], /api.groq.com/);
  assert.match(urls[1], /generativelanguage/);
});

test('truncated generation falls back before returning partial JSON', async () => {
  const urls = [];
  const answer = await generateForTask('NOVEL_QUESTION_GENERATION', 'Generate', {
    json: true, reasoningEffort: 'low',
  }, { env: { ...env, GROQ_MODEL: 'openai/gpt-oss-120b' }, fetch: async (url, options) => {
    urls.push(url);
    if (urls.length === 1) {
      assert.equal(JSON.parse(options.body).reasoning_effort, 'low');
      return { ok: true, json: async () => ({ choices: [{
        finish_reason: 'length', message: { content: '{"questions":[' },
      }] }) };
    }
    return geminiReply('{"questions":[]}');
  } });
  assert.equal(answer, '{"questions":[]}');
  assert.equal(urls.length, 2);
});

test('visual fallback uses extracted text and never sends raw PDF to Groq', async () => {
  const requests = [];
  const answer = await generateForTask('QUESTION_EXTRACTION_VISUAL', 'Extract', {
    attachment: { buffer: Buffer.from('pdf'), mimeType: 'application/pdf' },
    fallbackText: 'Q1 Explain circuits', json: true,
  }, { env, fetch: async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return requests.length === 1 ? { ok: false, status: 503 } : groqReply('{"questions":[]}');
  } });
  assert.equal(answer, '{"questions":[]}');
  assert.match(requests[1].url, /api.groq.com/);
  assert.match(requests[1].body.messages[1].content, /Q1 Explain circuits/);
  assert.doesNotMatch(JSON.stringify(requests[1].body), /cGRm/);
});

test('generic compatibility route is text first', async () => {
  const urls = [];
  await generateText('Explain x', {}, { env,
    fetch: async (url) => { urls.push(url); return groqReply(); } });
  assert.match(urls[0], /api.groq.com/);
});

test('provider-neutral result envelope records fallback only as internal diagnostics', async () => {
  const result = await generateResultForTask('QUESTION_TUTOR', 'Explain x', {}, {
    env,
    fetch: async () => groqReply('Explanation'),
  });
  assert.equal(result.text, 'Explanation');
  assert.equal(result.status, 'high_confidence');
  assert.equal(result.degraded, false);
  assert.equal(result.internal.provider, 'groq');
  assert.equal('provider' in result, false);
});
