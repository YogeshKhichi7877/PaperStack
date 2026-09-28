const test = require('node:test');
const assert = require('node:assert/strict');
const { connectDatabase, requireDatabase, resolveStandardUriWithHttps } = require('./databaseConnection');

test('uses standard URI when SRV DNS lookup fails', async () => {
  const calls = [];
  const client = { connect: async (uri) => {
    calls.push(uri);
    if (uri.startsWith('mongodb+srv://')) throw new Error('querySrv ETIMEOUT');
  } };
  const source = await connectDatabase(client, 'mongodb+srv://primary', 'mongodb://standard', {});
  assert.equal(source, 'standard');
  assert.deepEqual(calls, ['mongodb+srv://primary', 'mongodb://standard']);
});

test('does not hide authentication failures behind DNS fallback', async () => {
  const client = { connect: async () => { throw new Error('Authentication failed'); } };
  await assert.rejects(connectDatabase(client, 'mongodb+srv://primary', 'mongodb://standard', {}),
    /Authentication failed/);
});

test('HTTPS DNS fallback creates a TLS seed-list URI without exposing credentials', async () => {
  const calls = [];
  const client = { connect: async (uri) => {
    calls.push(uri);
    if (uri.startsWith('mongodb+srv://')) throw new Error('querySrv ETIMEOUT');
  } };
  const request = async () => ({ ok: true, json: async () => ({ Status: 0,
    Answer: [{ type: 33, data: '0 0 27017 shard-00-00.cluster.mongodb.net.' }] }) });
  const source = await connectDatabase(client,
    'mongodb+srv://student:secret@cluster.mongodb.net/PaperStack?retryWrites=true', '', {}, request);
  assert.equal(source, 'https-dns-fallback');
  assert.equal(calls.length, 2);
  assert.match(calls[1], /^mongodb:\/\/student:secret@shard-00-00\.cluster\.mongodb\.net:27017\/PaperStack\?/);
  assert.match(calls[1], /tls=true/);
  assert.match(calls[1], /authSource=admin/);
});

test('HTTPS DNS fallback rejects targets outside the cluster domain', async () => {
  const request = async () => ({ ok: true, json: async () => ({ Status: 0,
    Answer: [{ type: 33, data: '0 0 27017 attacker.example.com.' }] }) });
  await assert.rejects(resolveStandardUriWithHttps(
    'mongodb+srv://student:secret@cluster.mongodb.net/PaperStack', request), /invalid SRV target/);
});

test('database routes fail fast while health and preflight remain available', () => {
  const middleware = requireDatabase({ readyState: 0 });
  const response = { headers: {}, set(key, value) { this.headers[key] = value; return this; },
    status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  middleware({ method: 'GET', path: '/questions' }, response, () => assert.fail('not ready'));
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, 'DATABASE_UNAVAILABLE');
  assert.equal(response.headers['Retry-After'], '5');
  let passed = 0;
  middleware({ method: 'GET', path: '/health' }, response, () => { passed += 1; });
  middleware({ method: 'OPTIONS', path: '/questions' }, response, () => { passed += 1; });
  assert.equal(passed, 2);
});
