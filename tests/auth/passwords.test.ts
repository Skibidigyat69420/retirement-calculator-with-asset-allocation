import assert from 'node:assert/strict';
import { test } from 'node:test';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../../server/auth/passwords.js';

test('password hashing round-trips', async () => {
  const hash = await hashPassword('correct horse battery staple');
  assert.match(hash, /^\$2[aby]\$/);
  assert.notEqual(hash, 'correct horse battery staple');
  assert.equal(await verifyPassword('correct horse battery staple', hash), true);
});

test('wrong password is rejected', async () => {
  const hash = await hashPassword('right-password');
  assert.equal(await verifyPassword('wrong-password', hash), false);
});

test('verifyPassword returns false for malformed hashes (no throw)', async () => {
  assert.equal(await verifyPassword('x'.repeat(12), 'not-a-bcrypt-hash'), false);
});

test('password strength gate enforces minimum length', () => {
  assert.equal(validatePasswordStrength('short').ok, false);
  assert.equal(validatePasswordStrength('long-enough-pass').ok, true);
});

test('password strength gate rejects >72 bytes (bcrypt truncation)', () => {
  assert.equal(validatePasswordStrength('a'.repeat(80)).ok, false);
});
