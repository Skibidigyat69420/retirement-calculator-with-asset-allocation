/**
 * Opaque token generation + hashing.
 *
 * Tokens are generated with crypto.randomBytes and stored ONLY as a
 * SHA-256 hash (spec §39: "single use, short expiry, hashed at rest").
 * The plaintext token is returned exactly once to the caller (to put in a
 * cookie / email link) and is never persisted.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

/** Generate a URL-safe opaque token (192 bits of entropy). */
export function generateToken(bytes = 24): string {
  return randomBytes(bytes).toString('base64url');
}

/** One-way hash for at-rest storage of session/reset/invite tokens. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

/** Constant-time comparison of a presented token against a stored hash. */
export function tokenMatchesHash(token: string, storedHash: string): boolean {
  if (!/^[0-9a-f]{64}$/.test(storedHash)) return false;
  const candidate = Buffer.from(hashToken(token), 'hex');
  const expected = Buffer.from(storedHash, 'hex');
  return timingSafeEqual(candidate, expected);
}
