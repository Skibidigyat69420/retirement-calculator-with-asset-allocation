/**
 * Password reset token flow (spec §38).
 * Single-use, 30-minute expiry, hashed at rest; using a token revokes
 * every session for that user (spec §40: sign out all sessions after
 * password reset).
 *
 * Both the issue and the pre-context consume-lookup run through SECURITY
 * DEFINER functions (see 0100_auth.sql); post-context steps (mark used,
 * password update, session revocation) go through plain RLS.
 */
import type { PoolClient } from 'pg';
import { generateToken, hashToken } from './tokens.js';

export const PASSWORD_RESET_TTL_MINUTES = 30;

interface ResetTokenRow {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
}

/** Issue (rotates any outstanding token). Caller must have already
 *  confirmed the account exists — this never reveals account presence. */
export async function createPasswordResetToken(
  client: PoolClient,
  userId: string,
): Promise<string> {
  const token = generateToken(24);
  await client.query(`SELECT auth_create_password_reset_token($1, $2, $3)`, [
    userId,
    hashToken(token),
    PASSWORD_RESET_TTL_MINUTES,
  ]);
  return token;
}

export type ResetTokenLookup =
  | { ok: true; token: ResetTokenRow }
  | { ok: false; reason: 'not_found' | 'used' | 'expired' };

/** Pre-context lookup by presented token (SECURITY DEFINER). */
export async function findPasswordResetToken(
  client: PoolClient,
  token: string,
): Promise<ResetTokenLookup> {
  const { rows } = await client.query<ResetTokenRow>(
    `SELECT * FROM auth_lookup_password_reset_token($1)`,
    [hashToken(token)],
  );
  const row = rows[0];
  if (!row) return { ok: false, reason: 'not_found' };
  if (row.used_at) return { ok: false, reason: 'used' };
  if (row.expires_at.getTime() <= Date.now()) return { ok: false, reason: 'expired' };
  return { ok: true, token: row };
}

/** Mark a reset token consumed — call inside the same transaction as the
 *  password update so a failure cannot leave a live token (spec §140). */
export async function markResetTokenUsed(client: PoolClient, tokenId: string): Promise<void> {
  await client.query(`UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`, [tokenId]);
}
