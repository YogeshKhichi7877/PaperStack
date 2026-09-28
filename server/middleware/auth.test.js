const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { createAuthMiddleware } = require('./auth');

function run(middleware, token) {
  const req = { header: () => token ? `Bearer ${token}` : '' };
  const response = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  let passed = false;
  middleware(req, response, () => { passed = true; });
  return { passed, response };
}

test('admin access requires a signed, typed admin token', () => {
  const secret = 'test-only-secret';
  const { authenticateAdmin } = createAuthMiddleware(secret);
  const student = jwt.sign({ _id: 'student-1', role: 'student', tokenType: 'student' }, secret);
  const legacyAdmin = jwt.sign({ role: 'admin' }, secret);
  const admin = jwt.sign({ role: 'admin', tokenType: 'admin' }, secret);
  assert.equal(run(authenticateAdmin, '').response.statusCode, 401);
  assert.equal(run(authenticateAdmin, student).response.statusCode, 403);
  assert.equal(run(authenticateAdmin, legacyAdmin).response.statusCode, 403);
  assert.equal(run(authenticateAdmin, admin).passed, true);
  assert.equal(run(authenticateAdmin, 'localStorage=true').response.statusCode, 401);
});

test('admin tokens cannot be used as student tokens', () => {
  const secret = 'test-only-secret';
  const { authenticate } = createAuthMiddleware(secret);
  const admin = jwt.sign({ role: 'admin', tokenType: 'admin' }, secret);
  const student = jwt.sign({ _id: 'student-1', role: 'student', tokenType: 'student' }, secret);
  assert.equal(run(authenticate, admin).response.statusCode, 403);
  assert.equal(run(authenticate, student).passed, true);
});
