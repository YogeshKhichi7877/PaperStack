const test = require('node:test');
const assert = require('node:assert/strict');
const { aiAvailable, generateForTask, generateResultForTask, generateText, modelForProvider,
  providerOrder, resetAiRuntimeState, taskStatus } = require('./aiService');

const env = { AI_ENABLED: 'true', GEMINI_API_KEY: 'test-gemini-key', GROQ_API_KEY: 'test-groq-key',
  GEMINI_MODEL: 'test-gemini', GROQ_MODEL: 'test-groq', AI_MAX_RETRIES: '0',
  QUESTION_EXTRACTION_AI_ENABLED: 'true',
  QUESTION_EXTRACTION_GEMINI_API_KEY: 'test-extraction-key',
  QUESTION_EXTRACTION_GEMINI_MODEL: 'test-extraction-model',
  QUESTION_EXTRACTION_AI_MAX_RETRIES: '0' };
const groqReply = (content = 'Answer') => ({ ok: true,
  json: async () => ({ choices: [{ message: { content } }] }) });
const geminiReply = (content = 'Answer') => ({ ok: true,
  json: async () => ({ candidates: [{ content: { parts: [{ text: content }] } }] }) });

test('routing is task based and reports provider availability', () => {
  assert.deepEqual(providerOrder(env, 'QUESTION_TUTOR'), ['groq', 'gemini']);
  assert.deepEqual(providerOrder(env, 'QUESTION_EXTRACTION_VISUAL'), ['gemini']);
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
    fetch: async (url, options) => {
      requests.push({ url, headers: options.headers, body: JSON.parse(options.body) });
      return geminiReply();
    } });
  assert.match(requests[0].url, /generativelanguage/);
  assert.equal(requests[0].headers['x-goog-api-key'], 'test-extraction-key');
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

test('question extraction never falls back to a general Groq or Gemini credential', async () => {
  const requests = [];
  await assert.rejects(generateForTask('QUESTION_EXTRACTION_VISUAL', 'Extract', {
    attachment: { buffer: Buffer.from('pdf'), mimeType: 'application/pdf' },
    fallbackText: 'Q1 Explain circuits', json: true,
  }, { env, fetch: async (url, options) => {
    requests.push({ url, body: JSON.parse(options.body) });
    return { ok: false, status: 503 };
  } }), /temporarily unavailable/i);
  assert.equal(requests.length, 1);
  assert.match(requests[0].url, /generativelanguage/);
});

test('question extraction uses only its dedicated Gemini key and model', async () => {
  const requests = [];
  await generateForTask('QUESTION_EXTRACTION_TEXT', 'Extract', {}, { env,
    fetch: async (url, options) => {
      requests.push({ url, options });
      return geminiReply('{"questions":[]}');
    } });
  assert.match(requests[0].url, /test-extraction-model/);
  assert.equal(requests[0].options.headers['x-goog-api-key'], 'test-extraction-key');
  assert.notEqual(requests[0].options.headers['x-goog-api-key'], env.GEMINI_API_KEY);
});

test('student AI cannot use the question extraction credential', () => {
  const extractionOnly = {
    AI_ENABLED: 'true',
    QUESTION_EXTRACTION_AI_ENABLED: 'true',
    QUESTION_EXTRACTION_GEMINI_API_KEY: 'private-extraction-key',
  };
  assert.equal(aiAvailable(extractionOnly, 'QUESTION_TUTOR'), false);
  assert.equal(aiAvailable(extractionOnly, 'QUESTION_EXTRACTION_TEXT'), true);
});

test('identical in-flight generation reuses one provider request', async () => {
  resetAiRuntimeState();
  let requests = 0;
  const dependencies = { env, fetch: async () => {
    requests += 1;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return groqReply('Shared answer');
  } };
  const options = { inflightKey: 'public-question:q1:explain' };
  const [first, second] = await Promise.all([
    generateForTask('QUESTION_TUTOR', 'Explain', options, dependencies),
    generateForTask('QUESTION_TUTOR', 'Explain', options, dependencies),
  ]);
  assert.equal(first, 'Shared answer');
  assert.equal(second, 'Shared answer');
  assert.equal(requests, 1);
});

test('repeated transient failures open a short circuit and skip the unhealthy provider', async () => {
  resetAiRuntimeState();
  const urls = [];
  const healthEnv = { ...env, AI_CIRCUIT_FAILURE_THRESHOLD: '3' };
  const request = async (url) => {
    urls.push(url);
    return url.includes('groq.com') ? { ok: false, status: 503 } : geminiReply('Fallback');
  };
  for (let index = 0; index < 4; index += 1) {
    await generateForTask('QUESTION_TUTOR', 'Explain', {}, { env: healthEnv, fetch: request });
  }
  assert.equal(urls.filter((url) => url.includes('groq.com')).length, 3);
  assert.equal(urls.filter((url) => url.includes('generativelanguage')).length, 4);
  resetAiRuntimeState();
});

test('exhausted providers return a provider-neutral final error', async () => {
  resetAiRuntimeState();
  await assert.rejects(generateForTask('QUESTION_TUTOR', 'Explain', {}, {
    env,
    fetch: async () => ({ ok: false, status: 429 }),
  }), (error) => {
    assert.equal(error.code, 'AI_UNAVAILABLE');
    assert.equal(error.message, 'PaperStack AI is temporarily unavailable.');
    assert.doesNotMatch(error.message, /groq|gemini|429/i);
    return true;
  });
  resetAiRuntimeState();
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
