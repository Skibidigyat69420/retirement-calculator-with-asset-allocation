/**
 * Password hashing via bcryptjs (spec §38: "password hashing",
 * "do not write cryptography" — bcrypt is the mature primitive here).
 */
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

/**
 * Minimal strength gate for passwords. bcrypt truncates beyond 72 bytes,
 * so reject passphrases that would silently lose entropy.
 */
export function validatePasswordStrength(plain: string): { ok: true } | { ok: false; reason: string } {
  if (plain.length < 10) return { ok: false, reason: 'Password must be at least 10 characters.' };
  if (Buffer.byteLength(plain, 'utf8') > 72) return { ok: false, reason: 'Password must be at most 72 bytes.' };
  return { ok: true };
}
