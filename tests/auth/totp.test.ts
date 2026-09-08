import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  generateTotpSecret,
  generateTotpTokenForTest,
  verifyTotpToken,
} from '../../server/auth/totp.js';

test('TOTP secret generation produces base32 + otpauth URI', () => {
  const bundle = generateTotpSecret('practitioner@example.com');
  assert.match(bundle.secret, /^[A-Z2-7]+$/);
  assert.ok(bundle.otpauthUrl.startsWith('otpauth://totp/'));
  assert.ok(bundle.otpauthUrl.includes('Sound%20Thesis%20Wealth'));
  assert.ok(bundle.otpauthUrl.includes(encodeURIComponent('practitioner@example.com')));
});

test('generated code verifies against its secret (round-trip)', () => {
  const { secret } = generateTotpSecret('a@b.com');
  const code = generateTotpTokenForTest(secret);
  assert.equal(verifyTotpToken(secret, code), true);
});

test('wrong code is rejected', () => {
  const { secret } = generateTotpSecret('a@b.com');
  const code = generateTotpTokenForTest(secret);
  const wrong = code === '000000' ? '000001' : '000000';
  assert.equal(verifyTotpToken(secret, wrong), false);
});

test('code from a different secret is rejected', () => {
  const one = generateTotpSecret('a@b.com');
  const two = generateTotpSecret('c@d.com');
  const code = generateTotpTokenForTest(two.secret);
  assert.equal(verifyTotpToken(one.secret, code), false);
});

test('non-6-digit input is rejected without throwing', () => {
  const { secret } = generateTotpSecret('a@b.com');
  assert.equal(verifyTotpToken(secret, '12345'), false);
  assert.equal(verifyTotpToken(secret, 'abcdef'), false);
  assert.equal(verifyTotpToken(secret, ''), false);
});
