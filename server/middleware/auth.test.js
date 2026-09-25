const test = require('node:test');
const assert = require('node:assert/strict');
const { getBearerToken } = require('./auth');

function requestWithAuth(value) {
  return {
    header(name) {
      return name === 'Authorization' ? value : '';
    },
  };
}

test('getBearerToken parses Bearer tokens', () => {
  assert.equal(getBearerToken(requestWithAuth('Bearer abc123')), 'abc123');
});

test('getBearerToken preserves legacy raw-token behavior', () => {
  assert.equal(getBearerToken(requestWithAuth('abc123')), 'abc123');
});
