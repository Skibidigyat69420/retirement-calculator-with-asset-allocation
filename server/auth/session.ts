/**
 * Session lifecycle (spec §§38, 40).
 *
 * Cookie contract: name `soundthesis_session`, httpOnly, sameSite=lax,
 * path=/, secure in production. The cookie holds an opaque random token;
 * only its SHA-256 hash is stored in the sessions table.
 */
import type { PoolClient } from 'pg';
import { generateToken, hashToken } from './tokens.js';
import type { SessionRow } from './types.js';

export const SESSION_COOKIE_NAME = 'soundthesis_session';
export const SESSION_TTL_DAYS = 30;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

export interface CreateSessionInput {
  userId: string;
  organizationId: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface CreatedSession {
  token: string;
  session: SessionRow;
}

export async function createSession(
  client: PoolClient,
  input: CreateSessionInput,
): Promise<CreatedSession> {
  const token = generateToken(32);
  const { rows } = await client.query<SessionRow>(
    `INSERT INTO sessions (user_id, organization_id, token_hash, expires_at, ip, user_agent)
     VALUES ($1, $2, $3, now() + interval '30 days', $4, $5)
     RETURNING *`,
    [input.userId, input.organizationId, hashToken(token), input.ip ?? null, input.userAgent ?? null],
  );
  return { token, session: rows[0] };
}

export type SessionLookup =
  | { ok: true; session: SessionRow }
  | { ok: false; reason: 'not_found' | 'revoked' | 'expired' };

/** Look a session up by its presented (plaintext) token.
 *  Uses the SECURITY DEFINER auth_lookup_session() — this is a
 *  pre-context call (the cookie is how context gets established). */
export async function findSessionByToken(
  client: PoolClient,
  token: string,
): Promise<SessionLookup> {
  const { rows } = await client.query<SessionRow>(
    `SELECT * FROM auth_lookup_session($1)`,
    [hashToken(token)],
  );
  const session = rows[0];
  if (!session) return { ok: false, reason: 'not_found' };
  if (session.revoked_at) return { ok: false, reason: 'revoked' };
  if (session.expires_at.getTime() <= Date.now()) return { ok: false, reason: 'expired' };
  return { ok: true, session };
}

export async function revokeSessionById(client: PoolClient, sessionId: string): Promise<boolean> {
  const { rowCount } = await client.query(
    `UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL`,
    [sessionId],
  );
  return (rowCount ?? 0) > 0;
}

export async function revokeAllUserSessions(client: PoolClient, userId: string): Promise<number> {
  const { rowCount } = await client.query(
    `UPDATE sessions SET revoked_at = now()
     WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId],
  );
  return rowCount ?? 0;
}

/** Invalidate every session except the current one (spec §40). */
export async function revokeOtherUserSessions(
  client: PoolClient,
  userId: string,
  keepSessionId: string,
): Promise<number> {
  const { rowCount } = await client.query(
    `UPDATE sessions SET revoked_at = now()
     WHERE user_id = $1 AND id <> $2 AND revoked_at IS NULL`,
    [userId, keepSessionId],
  );
  return rowCount ?? 0;
}

export async function rebindSessionOrganization(
  client: PoolClient,
  sessionId: string,
  organizationId: string | null,
): Promise<SessionRow | null> {
  const { rows } = await client.query<SessionRow>(
    `UPDATE sessions SET organization_id = $2 WHERE id = $1 RETURNING *`,
    [sessionId, organizationId],
  );
  return rows[0] ?? null;
}

export async function listUserSessions(
  client: PoolClient,
  userId: string,
  currentSessionId: string,
): Promise<Array<SessionRow & { current: boolean }>> {
  const { rows } = await client.query<SessionRow>(
    `SELECT * FROM sessions
     WHERE user_id = $1 AND revoked_at IS NULL AND expires_at > now()
     ORDER BY created_at DESC`,
    [userId],
  );
  return rows.map((s) => ({ ...s, current: s.id === currentSessionId }));
}

/** Invalidate expired sessions physically (housekeeping job). */
export async function deleteExpiredSessions(client: PoolClient): Promise<number> {
  const { rows } = await client.query<{ auth_delete_expired_sessions: number }>(
    `SELECT auth_delete_expired_sessions()`,
  );
  return rows[0]?.auth_delete_expired_sessions ?? 0;
}

// ---------------------------------------------------------------------------
// Cookie serialization
// ---------------------------------------------------------------------------

export function buildSessionCookie(token: string, opts: { secure: boolean }): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];
  if (opts.secure) parts.push('Secure');
  return parts.join('; ');
}

export function buildClearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

export function sessionCookieMaxAgeMs(): number {
  return SESSION_TTL_MS;
}
