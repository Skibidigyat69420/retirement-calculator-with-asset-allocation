import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateToken, hashToken, tokenMatchesHash } from '../../server/auth/tokens.js';

test('tokens are URL-safe and unique', () => {
  const a = generateToken();
  const b = generateToken();
  assert.match(a, /^[A-Za-z0-9_-]+$/);
  assert.notEqual(a, b);
});

test('token hashing is deterministic', () => {
  assert.equal(hashToken('abc'), hashToken('abc'));
  assert.notEqual(hashToken('abc'), hashToken('abd'));
});

test('tokenMatchesHash round-trips', () => {
  const token = generateToken();
  assert.equal(tokenMatchesHash(token, hashToken(token)), true);
  assert.equal(tokenMatchesHash(generateToken(), hashToken(token)), false);
});

test('hash is a sha256 hex digest (64 chars)', () => {
  assert.match(hashToken('x'), /^[0-9a-f]{64}$/);
});

test('plaintext token is never derivable from hash alone', () => {
  const token = generateToken();
  assert.ok(!hashToken(token).includes(token));
});
