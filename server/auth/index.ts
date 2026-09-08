/**
 * Auth service facade — the typed API the REST layer (Agent 5) calls.
 *
 *   const auth = createAuthService(pool);
 *   await auth.login(email, password, totp, meta)
 *
 * POOL CONTRACT: the pool handed here connects as the restricted app_user
 * role. RLS is FORCE'd on every table (00xx + 0100 migrations), so ALL
 * queries — including these — are subject to row policies. Pre-context
 * elevations (session-by-cookie, credentials-by-email, token-by-hash)
 * run through SECURITY DEFINER functions defined in 0100_auth.sql; the
 * rest rely on the SET LOCAL tenant context installed by
 * withTenantTransaction / middleware/requestContext.ts.
 */
import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { z } from 'zod';
import { httpErrors } from '../middleware/errors.js';
import { q, withTenantTransaction, writeAuditEvent } from './db.js';
import { canInviteRole } from './permissions.js';
import { hashPassword, validatePasswordStrength, verifyPassword } from './passwords.js';
import {
  createPasswordResetToken,
  findPasswordResetToken,
  markResetTokenUsed,
} from './passwordReset.js';
import {
  createInvitation,
  findInvitationByToken,
  revokeInvitation as revokeInvitationRow,
  type CreatedInvitation,
} from './invitations.js';
import {
  createSession,
  listUserSessions,
  rebindSessionOrganization,
  revokeOtherUserSessions,
  revokeSessionById,
  SESSION_COOKIE_NAME,
  buildSessionCookie,
  buildClearSessionCookie,
} from './session.js';
import { hashToken } from './tokens.js';
import { generateTotpSecret, verifyTotpToken } from './totp.js';
import {
  AUTH_ERROR_CODES as C,
  isInvitableRole,
  type CredentialsRow,
  type InvitationRow,
  type MePayload,
  type MembershipWithOrg,
  type Role,
  type SessionRow,
  type SessionInfo,
  type UserRow,
} from './types.js';

export * from './types.js';
export * from './permissions.js';
export * from './tokens.js';
export * from './totp.js';
export * from './session.js';
export * from './invitations.js';
export * from './passwordReset.js';
export * from './passwords.js';
export { AppError } from '../middleware/errors.js';

// ---------------------------------------------------------------------------
// Input contracts (zod — validated at the boundary, enforced here too)
// ---------------------------------------------------------------------------

export const loginInputSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(128),
  totp: z.string().regex(/^\d{6}$/).optional(),
});

export const acceptInvitationInputSchema = z.object({
  fullName: z.string().min(1).max(200),
  password: z.string().min(1).max(128),
});

export const resetPasswordInputSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(1).max(128),
});

export const inviteInputSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().email().max(320),
  role: z.string(),
});

export interface RequestMeta {
  ip?: string | null;
  userAgent?: string | null;
  requestId?: string;
}

export interface AuthServiceOptions {
  /** Set Secure on session cookies. Default: NODE_ENV === 'production'. */
  secureCookies?: boolean;
}

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MINUTES = 15;
// Precomputed bcrypt hash used to equalize timing for unknown accounts.
const DUMMY_HASH =
  '$2a$12$8HjJH6Tyo9g8T8u3q0cGBeG6m0y0k5e5u9m0o3m6m7m0y0k5e5u9m0o3m6';

interface UserWithCredentials {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  status: string;
  last_login_at: Date | null;
  password_hash: string;
  mfa_enabled: boolean;
  failed_login_attempts: number;
  locked_until: Date | null;
}

interface MembershipOrgRow {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  role: Role;
  status: string;
}

export interface LoginSuccess {
  status: 'ok';
  sessionToken: string;
  me: MePayload;
}

export function createAuthService(pool: Pool, options: AuthServiceOptions = {}) {
  const secure = options.secureCookies ?? process.env.NODE_ENV === 'production';

  /** Pre-context elevation: resolve email → user + credentials. */
  async function findUserByEmail(client: PoolClient, email: string): Promise<UserWithCredentials | null> {
    const { rows } = await client.query<UserWithCredentials>(
      `SELECT * FROM auth_lookup_user_credentials($1)`,
      [email.trim().toLowerCase()],
    );
    return rows[0] ?? null;
  }

  /** Pre-context elevation: resolve session cookie → session row. */
  async function findSessionRow(client: PoolClient, token: string): Promise<SessionRow | null> {
    const { rows } = await client.query<SessionRow>(
      `SELECT * FROM auth_lookup_session($1)`,
      [hashToken(token)],
    );
    const session = rows[0];
    if (!session) return null;
    if (session.revoked_at) return null;
    if (session.expires_at.getTime() <= Date.now()) return null;
    return session;
  }

  async function recordFailedLogin(client: PoolClient, userId: string): Promise<Date | null> {
    const { rows } = await client.query<{ locked_until: Date | null }>(
      `UPDATE user_auth_credentials
       SET failed_login_attempts = failed_login_attempts + 1,
           locked_until = CASE
             WHEN failed_login_attempts + 1 >= $2
             THEN now() + ($3 || ' minutes')::interval
             ELSE locked_until END
       WHERE user_id = $1
       RETURNING locked_until`,
      [userId, MAX_FAILED_LOGINS, String(LOCKOUT_MINUTES)],
    );
    return rows[0]?.locked_until ?? null;
  }

  /** Runs fn on a short-lived pool client (single-statement reads/writes
   *  that supply their own context). */
  async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      return await fn(client);
    } finally {
      client.release();
    }
  }

  /** Read a user's active memberships with org names. Requires the
   *  caller to have installed app.user_id context (RLS: own rows). */
  async function loadMemberships(client: PoolClient, userId: string): Promise<MembershipOrgRow[]> {
    const { rows } = await client.query<MembershipOrgRow>(
      `SELECT m.organization_id, o.name AS organization_name, o.slug AS organization_slug,
              m.role, m.status
       FROM organization_memberships m
       JOIN organizations o ON o.id = m.organization_id
       WHERE m.user_id = $1 AND m.status = 'active'
       ORDER BY m.created_at ASC`,
      [userId],
    );
    return rows;
  }

  async function buildMe(
    client: PoolClient,
    session: SessionRow,
  ): Promise<MePayload> {
    const { rows: users } = await client.query<UserRow & { mfa_enabled: boolean }>(
      `SELECT u.*, c.mfa_enabled FROM users u
       JOIN user_auth_credentials c ON c.user_id = u.id WHERE u.id = $1`,
      [session.user_id],
    );
    const user = users[0];
    if (!user || user.status !== 'active') {
      throw httpErrors.unauthorized(C.SESSION_REVOKED, 'Your account is no longer active.');
    }
    const memberships = await loadMemberships(client, session.user_id);
    const activeId = session.organization_id;
    const active = activeId
      ? memberships.find((m) => m.organization_id === activeId) ?? null
      : null;
    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        avatarUrl: user.avatar_url,
        status: user.status,
        mfaEnabled: user.mfa_enabled,
        lastLoginAt: user.last_login_at ? user.last_login_at.toISOString() : null,
      },
      memberships: memberships.map((m) => ({
        organizationId: m.organization_id,
        organizationName: m.organization_name,
        organizationSlug: m.organization_slug,
        role: m.role,
        status: m.status as MePayload['memberships'][number]['status'],
      })),
      activeOrganization: active
        ? { id: active.organization_id, name: active.organization_name }
        : null,
      session: {
        id: session.id,
        createdAt: session.created_at.toISOString(),
        expiresAt: session.expires_at.toISOString(),
      },
    };
  }

  /** Validate the session token and return { session, me } under context. */
  async function loadMe(sessionToken: string): Promise<{ session: SessionRow; me: MePayload }> {
    const session = await withClient((client) => findSessionRow(client, sessionToken));
    if (!session) {
      throw httpErrors.unauthorized(C.SESSION_EXPIRED, 'Your session is no longer valid. Please sign in again.');
    }
    const me = await withTenantTransaction(
      pool,
      { userId: session.user_id, organizationId: session.organization_id },
      (client) => buildMe(client, session),
    );
    return { session, me };
  }

  async function audit(
    client: PoolClient,
    event: Parameters<typeof writeAuditEvent>[1],
  ): Promise<void> {
    await writeAuditEvent(client, event);
  }

  return {
    /** Cookie helpers for the REST layer. */
    cookies: {
      name: SESSION_COOKIE_NAME,
      build: (token: string) => buildSessionCookie(token, { secure }),
      clear: () => buildClearSessionCookie(),
    },

    // ------------------------------------------------------------------
    // Authentication
    // ------------------------------------------------------------------

    /** Verify email + password (+ TOTP when MFA enabled), create a session. */
    async login(
      rawEmail: string,
      rawPassword: string,
      totp?: string,
      meta: RequestMeta = {},
    ): Promise<LoginSuccess> {
      const parsed = loginInputSchema.safeParse({ email: rawEmail, password: rawPassword, totp });
      if (!parsed.success) {
        throw httpErrors.badRequest(C.VALIDATION_ERROR, 'Invalid login request.', parsed.error.issues);
      }
      const email = parsed.data.email;

      const user = await withClient((client) => findUserByEmail(client, email));
      const ok = await verifyPassword(parsed.data.password, user?.password_hash ?? DUMMY_HASH);
      if (!user || !ok) {
        if (user) {
          await withTenantTransaction(pool, { userId: user.id, organizationId: null }, async (client) => {
            await recordFailedLogin(client, user.id);
          });
        }
        throw httpErrors.unauthorized(C.INVALID_CREDENTIALS, 'Invalid email or password.');
      }

      if (user.locked_until && user.locked_until.getTime() > Date.now()) {
        const retryAfterSeconds = Math.ceil((user.locked_until.getTime() - Date.now()) / 1000);
        throw httpErrors.tooMany(C.ACCOUNT_LOCKED, 'Account temporarily locked.', { retryAfterSeconds });
      }

      if (user.mfa_enabled) {
        if (!totp) {
          throw httpErrors.unauthorized(C.MFA_REQUIRED, 'A verification code is required.');
        }
        const creds = await withTenantTransaction(
          pool,
          { userId: user.id, organizationId: null },
          async (client) => {
            const { rows } = await client.query<Pick<CredentialsRow, 'mfa_secret'>>(
              `SELECT mfa_secret FROM user_auth_credentials WHERE user_id = $1`,
              [user.id],
            );
            return rows[0] ?? null;
          },
        );
        if (!creds?.mfa_secret || !verifyTotpToken(creds.mfa_secret, totp)) {
          await withTenantTransaction(pool, { userId: user.id, organizationId: null }, async (client) => {
            await recordFailedLogin(client, user.id);
          });
          throw httpErrors.unauthorized(C.MFA_INVALID, 'Invalid verification code.');
        }
      }

      // Success: establish the session inside a tenant transaction.
      // Default organization = first active membership.
      const { token: sessionToken } = await withTenantTransaction(
        pool,
        { userId: user.id, organizationId: null },
        async (client) => {
          const memberships = await loadMemberships(client, user.id);
          const defaultOrg = memberships[0]?.organization_id ?? null;
          if (defaultOrg) {
            // Upgrade the org context before org-scoped writes (audit).
            await q(client, `SELECT set_config('app.organization_id', $1, true)`, [defaultOrg]);
          }
          await q(
            client,
            `UPDATE user_auth_credentials
             SET failed_login_attempts = 0, locked_until = NULL WHERE user_id = $1`,
            [user.id],
          );
          await q(client, `UPDATE users SET last_login_at = now() WHERE id = $1`, [user.id]);
          const created = await createSession(client, {
            userId: user.id,
            organizationId: defaultOrg,
            ip: meta.ip ?? null,
            userAgent: meta.userAgent ?? null,
          });
          await audit(client, {
            organizationId: defaultOrg,
            userId: user.id,
            action: 'LOGIN',
            resourceType: 'session',
            ipAddress: meta.ip ?? null,
            userAgent: meta.userAgent ?? null,
            requestId: meta.requestId,
          });
          return created;
        },
      );

      const { me } = await loadMe(sessionToken);
      return { status: 'ok', sessionToken, me };
    },

    /** Revoke the presented session (logout, spec §40 replay = denied). */
    async logout(sessionToken: string, meta: RequestMeta = {}): Promise<void> {
      const session = await withClient((client) => findSessionRow(client, sessionToken));
      if (!session) return; // Idempotent logout.
      await withTenantTransaction(
        pool,
        { userId: session.user_id, organizationId: session.organization_id },
        async (client) => {
          await revokeSessionById(client, session.id);
          await audit(client, {
            organizationId: session.organization_id,
            userId: session.user_id,
            action: 'LOGOUT',
            resourceType: 'session',
            resourceId: session.id,
            ipAddress: meta.ip ?? null,
            requestId: meta.requestId,
          });
        },
      );
    },

    /** Current user + memberships + active organization (spec §38). */
    async getMe(sessionToken: string): Promise<MePayload> {
      const { me } = await loadMe(sessionToken);
      return me;
    },

    // ------------------------------------------------------------------
    // Session / device management (spec §40)
    // ------------------------------------------------------------------

    async listSessions(sessionToken: string): Promise<SessionInfo[]> {
      const { session, me } = await loadMe(sessionToken);
      return withTenantTransaction(
        pool,
        { userId: session.user_id, organizationId: session.organization_id },
        async (client) => {
          const rows = await listUserSessions(client, session.user_id, session.id);
          return rows.map((s) => ({
            id: s.id,
            current: s.current,
            ip: s.ip,
            userAgent: s.user_agent,
            createdAt: s.created_at.toISOString(),
            expiresAt: s.expires_at.toISOString(),
            lastSeenAt: s.created_at.toISOString(),
          }));
        },
      ).then((sessions) => {
        void me;
        return sessions;
      });
    },

    async revokeSession(sessionToken: string, targetSessionId: string, meta: RequestMeta = {}): Promise<void> {
      const { session } = await loadMe(sessionToken);
      if (targetSessionId !== session.id) {
        // Users may only revoke their own sessions (IDOR guard, spec §199).
        const sessions = await this.listSessions(sessionToken);
        if (!sessions.some((s) => s.id === targetSessionId)) {
          throw httpErrors.notFound(C.NOT_FOUND, 'Session not found.');
        }
      }
      await withTenantTransaction(
        pool,
        { userId: session.user_id, organizationId: session.organization_id },
        async (client) => {
          await revokeSessionById(client, targetSessionId);
          await audit(client, {
            organizationId: session.organization_id,
            userId: session.user_id,
            action: 'SESSION_REVOKED',
            resourceType: 'session',
            resourceId: targetSessionId,
            ipAddress: meta.ip ?? null,
            requestId: meta.requestId,
          });
        },
      );
    },

    /** Sign out everywhere else (spec §40). */
    async revokeAllSessions(sessionToken: string, meta: RequestMeta = {}): Promise<number> {
      const { session } = await loadMe(sessionToken);
      let revoked = 0;
      await withTenantTransaction(
        pool,
        { userId: session.user_id, organizationId: session.organization_id },
        async (client) => {
          revoked = await revokeOtherUserSessions(client, session.user_id, session.id);
          await audit(client, {
            organizationId: session.organization_id,
            userId: session.user_id,
            action: 'SESSIONS_REVOKED_ALL',
            ipAddress: meta.ip ?? null,
            requestId: meta.requestId,
            metadata: { revoked },
          });
        },
      );
      return revoked;
    },

    /** Admin action: revoke every session of another user (elevation via
     *  SECURITY DEFINER — own-session RLS cannot authorize cross-user
     *  revocation; the API layer must authorize the admin first). */
    async adminRevokeUserSessions(
      adminUserId: string,
      targetUserId: string,
      meta: RequestMeta = {},
    ): Promise<number> {
      let revoked = 0;
      await withTenantTransaction(
        pool,
        { userId: adminUserId, organizationId: null },
        async (client) => {
          const { rows } = await client.query<{ auth_revoke_all_user_sessions: number }>(
            `SELECT auth_revoke_all_user_sessions($1)`,
            [targetUserId],
          );
          revoked = rows[0]?.auth_revoke_all_user_sessions ?? 0;
          await audit(client, {
            userId: adminUserId,
            action: 'ADMIN_SESSIONS_REVOKED',
            resourceType: 'user',
            resourceId: targetUserId,
            ipAddress: meta.ip ?? null,
            requestId: meta.requestId,
            metadata: { revoked },
          });
        },
      );
      return revoked;
    },

    // ------------------------------------------------------------------
    // Organization switching (spec §37)
    // ------------------------------------------------------------------

    async switchOrganization(sessionToken: string, organizationId: string): Promise<MePayload> {
      const { session } = await loadMe(sessionToken);
      const ok = await withTenantTransaction(
        pool,
        { userId: session.user_id, organizationId: null },
        async (client) => {
          const { rows } = await client.query<{ role: Role }>(
            `SELECT role FROM organization_memberships
             WHERE user_id = $1 AND organization_id = $2 AND status = 'active'`,
            [session.user_id, organizationId],
          );
          return rows[0] ?? null;
        },
      );
      if (!ok) {
        // Deny cross-org switching (spec §199 cross-org API).
        throw httpErrors.forbidden(C.MEMBERSHIP_REQUIRED, 'You are not a member of that organization.');
      }
      await withClient(async (client) => {
        await rebindSessionOrganization(client, session.id, organizationId);
      });
      const { me } = await loadMe(sessionToken);
      return me;
    },

    // ------------------------------------------------------------------
    // Invitations (spec §39)
    // ------------------------------------------------------------------

    /** API layer enforces requireRole via middleware; service double-checks. */
    async createInvitation(
      actorUserId: string,
      actorRole: Role,
      input: { organizationId: string; email: string; role: string },
      meta: RequestMeta = {},
    ): Promise<{ invitation: InvitationRow; token: string }> {
      const parsed = inviteInputSchema.safeParse(input);
      if (!parsed.success) {
        throw httpErrors.badRequest(C.VALIDATION_ERROR, 'Invalid invitation.', parsed.error.issues);
      }
      if (!isInvitableRole(parsed.data.role)) {
        throw httpErrors.badRequest(C.VALIDATION_ERROR, `Role '${parsed.data.role}' cannot be invited.`);
      }
      if (!canInviteRole(actorRole, parsed.data.role as Role)) {
        throw httpErrors.forbidden(C.FORBIDDEN, 'Your role cannot grant that role.');
      }
      return withTenantTransaction(
        pool,
        { userId: actorUserId, organizationId: parsed.data.organizationId },
        async (client) => {
          const created: CreatedInvitation = await createInvitation(client, {
            organizationId: parsed.data.organizationId,
            email: parsed.data.email,
            role: parsed.data.role as Role,
            invitedBy: actorUserId,
          });
          await audit(client, {
            organizationId: parsed.data.organizationId,
            userId: actorUserId,
            action: 'INVITATION_SENT',
            resourceType: 'invitation',
            resourceId: created.invitation.id,
            ipAddress: meta.ip ?? null,
            requestId: meta.requestId,
            metadata: { email: parsed.data.email, role: parsed.data.role },
          });
          return created;
        },
      );
    },

    /** Public: what the accept-invitation page may display. */
    async peekInvitation(token: string): Promise<{
      email: string; role: Role; organizationName: string; expiresAt: string; status: string;
    }> {
      const lookup = await withClient((client) => findInvitationByToken(client, token));
      if (!lookup.ok) {
        if (lookup.reason === 'expired') {
          throw httpErrors.badRequest(C.INVITATION_EXPIRED, 'This invitation has expired.');
        }
        throw httpErrors.notFound(C.INVITATION_INVALID, 'This invitation is no longer valid.');
      }
      return {
        email: lookup.invitation.email,
        role: lookup.invitation.role,
        organizationName: lookup.invitation.organization_name,
        expiresAt: lookup.invitation.expires_at.toISOString(),
        status: lookup.invitation.status,
      };
    },

    /**
     * Accept an invitation: create user + credentials + membership +
     * session in one transaction (spec §39, §140). Single use — the
     * token is consumed. The user id is pre-generated so the users-row
     * INSERT satisfies the users RLS WITH CHECK (id = app.user_id).
     */
    async acceptInvitation(
      token: string,
      input: { fullName: string; password: string },
      meta: RequestMeta = {},
    ): Promise<LoginSuccess> {
      const parsed = acceptInvitationInputSchema.safeParse(input);
      if (!parsed.success) {
        throw httpErrors.badRequest(C.VALIDATION_ERROR, 'Invalid invitation acceptance.', parsed.error.issues);
      }
      const strength = validatePasswordStrength(parsed.data.password);
      if (!strength.ok) {
        throw httpErrors.badRequest(C.PASSWORD_TOO_WEAK, strength.reason);
      }

      const invitation = await withClient((client) => findInvitationByToken(client, token));
      if (!invitation.ok) {
        if (invitation.reason === 'expired') {
          throw httpErrors.badRequest(C.INVITATION_EXPIRED, 'This invitation has expired.');
        }
        if (invitation.reason === 'used') {
          throw httpErrors.conflict(C.INVITATION_INVALID, 'This invitation has already been used.');
        }
        throw httpErrors.notFound(C.INVITATION_INVALID, 'This invitation is no longer valid.');
      }
      const inv = invitation.invitation;
      const passwordHash = await hashPassword(parsed.data.password);
      const newUserId = randomUUID();

      const { token: sessionToken } = await withTenantTransaction(
        pool,
        { userId: newUserId, organizationId: inv.organization_id },
        async (txn) => {
          try {
            await q(
              txn,
              `INSERT INTO users (id, email, full_name, status)
               VALUES ($1, $2, $3, 'active')`,
              [newUserId, inv.email, parsed.data.fullName.trim()],
            );
          } catch (err) {
            // Unique violation: this email already has an account.
            if (typeof err === 'object' && err !== null && (err as { code?: string }).code === '23505') {
              throw httpErrors.conflict(C.EMAIL_TAKEN, 'An account with this email already exists.');
            }
            throw err;
          }
          await q(
            txn,
            `INSERT INTO user_auth_credentials (user_id, password_hash)
             VALUES ($1, $2)`,
            [newUserId, passwordHash],
          );
          await q(
            txn,
            `INSERT INTO organization_memberships
               (organization_id, user_id, role, status, invited_by)
             VALUES ($1, $2, $3, 'active', $4)
             ON CONFLICT (organization_id, user_id) DO NOTHING`,
            [inv.organization_id, newUserId, inv.role, inv.invited_by],
          );
          await q(
            txn,
            `UPDATE invitations SET status = 'accepted', accepted_at = now() WHERE id = $1`,
            [inv.id],
          );
          await audit(txn, {
            organizationId: inv.organization_id,
            userId: newUserId,
            action: 'INVITATION_ACCEPTED',
            resourceType: 'invitation',
            resourceId: inv.id,
            ipAddress: meta.ip ?? null,
            userAgent: meta.userAgent ?? null,
            requestId: meta.requestId,
            metadata: { role: inv.role },
          });
          return createSession(txn, {
            userId: newUserId,
            organizationId: inv.organization_id,
            ip: meta.ip ?? null,
            userAgent: meta.userAgent ?? null,
          });
        },
      );

      const { me } = await loadMe(sessionToken);
      return { status: 'ok', sessionToken, me };
    },

    async revokeInvitation(
      actorUserId: string,
      organizationId: string,
      invitationId: string,
      meta: RequestMeta = {},
    ): Promise<void> {
      await withTenantTransaction(
        pool,
        { userId: actorUserId, organizationId },
        async (client) => {
          const ok = await revokeInvitationRow(client, invitationId);
          if (!ok) throw httpErrors.notFound(C.NOT_FOUND, 'Invitation not found.');
          await audit(client, {
            organizationId,
            userId: actorUserId,
            action: 'INVITATION_REVOKED',
            resourceType: 'invitation',
            resourceId: invitationId,
            ipAddress: meta.ip ?? null,
            requestId: meta.requestId,
          });
        },
      );
    },

    // ------------------------------------------------------------------
    // Password reset (spec §38) — sessions invalidated on use (spec §40)
    // ------------------------------------------------------------------

    /** Always resolves; never reveals whether the email exists. */
    async requestPasswordReset(email: string, meta: RequestMeta = {}): Promise<void> {
      const user = await withClient((client) => findUserByEmail(client, email.trim().toLowerCase()));
      if (!user) return;
      await withTenantTransaction(
        pool,
        { userId: user.id, organizationId: null },
        async (client) => {
          await createPasswordResetToken(client, user.id);
          await audit(client, {
            userId: user.id,
            action: 'PASSWORD_RESET_REQUESTED',
            resourceType: 'user',
            resourceId: user.id,
            ipAddress: meta.ip ?? null,
            requestId: meta.requestId,
          });
        },
      );
      // The API layer emails the token; it is never logged (spec §201).
    },

    async resetPassword(token: string, newPassword: string, meta: RequestMeta = {}): Promise<void> {
      const parsed = resetPasswordInputSchema.safeParse({ token, password: newPassword });
      if (!parsed.success) {
        throw httpErrors.badRequest(C.VALIDATION_ERROR, 'Invalid password reset request.', parsed.error.issues);
      }
      const strength = validatePasswordStrength(parsed.data.password);
      if (!strength.ok) {
        throw httpErrors.badRequest(C.PASSWORD_TOO_WEAK, strength.reason);
      }
      const passwordHash = await hashPassword(parsed.data.password);

      const lookup = await withClient((client) => findPasswordResetToken(client, parsed.data.token));
      if (!lookup.ok) {
        if (lookup.reason === 'expired') {
          throw httpErrors.badRequest(C.RESET_TOKEN_EXPIRED, 'This reset link has expired.');
        }
        throw httpErrors.badRequest(C.RESET_TOKEN_INVALID, 'This reset link is no longer valid.');
      }

      await withTenantTransaction(
        pool,
        { userId: lookup.token.user_id, organizationId: null },
        async (client) => {
          await markResetTokenUsed(client, lookup.token.id);
          await q(
            client,
            `UPDATE user_auth_credentials
             SET password_hash = $2, password_changed_at = now(),
                 failed_login_attempts = 0, locked_until = NULL
             WHERE user_id = $1`,
            [lookup.token.user_id, passwordHash],
          );
          await q(
            client,
            `UPDATE sessions SET revoked_at = now()
             WHERE user_id = $1 AND revoked_at IS NULL`,
            [lookup.token.user_id],
          );
          await audit(client, {
            userId: lookup.token.user_id,
            action: 'PASSWORD_RESET_COMPLETED',
            resourceType: 'user',
            resourceId: lookup.token.user_id,
            ipAddress: meta.ip ?? null,
            requestId: meta.requestId,
            metadata: { sessionsRevoked: 'all' },
          });
        },
      );
    },

    /** Authenticated password change; revokes all OTHER sessions (spec §40). */
    async changePassword(
      sessionToken: string,
      oldPassword: string,
      newPassword: string,
      meta: RequestMeta = {},
    ): Promise<void> {
      const strength = validatePasswordStrength(newPassword);
      if (!strength.ok) {
        throw httpErrors.badRequest(C.PASSWORD_TOO_WEAK, strength.reason);
      }
      const { session } = await loadMe(sessionToken);
      const newHash = await hashPassword(newPassword);
      await withTenantTransaction(
        pool,
        { userId: session.user_id, organizationId: session.organization_id },
        async (txn) => {
          const { rows } = await txn.query<CredentialsRow>(
            `SELECT * FROM user_auth_credentials WHERE user_id = $1`,
            [session.user_id],
          );
          const creds = rows[0];
          if (!creds || !(await verifyPassword(oldPassword, creds.password_hash))) {
            throw httpErrors.unauthorized(C.INVALID_CREDENTIALS, 'Current password is incorrect.');
          }
          await q(
            txn,
            `UPDATE user_auth_credentials
             SET password_hash = $2, password_changed_at = now()
             WHERE user_id = $1`,
            [session.user_id, newHash],
          );
          await revokeOtherUserSessions(txn, session.user_id, session.id);
          await audit(txn, {
            organizationId: session.organization_id,
            userId: session.user_id,
            action: 'PASSWORD_CHANGED',
            resourceType: 'user',
            resourceId: session.user_id,
            ipAddress: meta.ip ?? null,
            requestId: meta.requestId,
          });
        },
      );
    },

    // ------------------------------------------------------------------
    // MFA (TOTP) management (spec §38, §201)
    // ------------------------------------------------------------------

    async mfaBeginSetup(sessionToken: string): Promise<{ otpauthUrl: string }> {
      const { session, me } = await loadMe(sessionToken);
      const bundle = generateTotpSecret(me.user.email);
      await withTenantTransaction(
        pool,
        { userId: session.user_id, organizationId: session.organization_id },
        async (client) => {
          await q(
            client,
            `UPDATE user_auth_credentials SET mfa_pending_secret = $2 WHERE user_id = $1`,
            [session.user_id, bundle.secret],
          );
        },
      );
      return { otpauthUrl: bundle.otpauthUrl };
    },

    async mfaConfirmSetup(sessionToken: string, code: string, meta: RequestMeta = {}): Promise<void> {
      const { session } = await loadMe(sessionToken);
      await withTenantTransaction(
        pool,
        { userId: session.user_id, organizationId: session.organization_id },
        async (txn) => {
          const { rows } = await txn.query<{ mfa_pending_secret: string | null }>(
            `SELECT mfa_pending_secret FROM user_auth_credentials WHERE user_id = $1`,
            [session.user_id],
          );
          const pending = rows[0]?.mfa_pending_secret ?? null;
          if (!pending || !verifyTotpToken(pending, code)) {
            throw httpErrors.unauthorized(C.MFA_INVALID, 'Invalid verification code.');
          }
          await q(
            txn,
            `UPDATE user_auth_credentials
             SET mfa_enabled = TRUE, mfa_secret = $2, mfa_pending_secret = NULL
             WHERE user_id = $1`,
            [session.user_id, pending],
          );
          await revokeOtherUserSessions(txn, session.user_id, session.id);
          await audit(txn, {
            organizationId: session.organization_id,
            userId: session.user_id,
            action: 'MFA_ENABLED',
            resourceType: 'user',
            resourceId: session.user_id,
            requestId: meta.requestId,
          });
        },
      );
    },

    async mfaDisable(sessionToken: string, password: string, meta: RequestMeta = {}): Promise<void> {
      const { session } = await loadMe(sessionToken);
      await withTenantTransaction(
        pool,
        { userId: session.user_id, organizationId: session.organization_id },
        async (txn) => {
          const { rows } = await txn.query<CredentialsRow>(
            `SELECT * FROM user_auth_credentials WHERE user_id = $1`,
            [session.user_id],
          );
          const creds = rows[0];
          if (!creds || !(await verifyPassword(password, creds.password_hash))) {
            throw httpErrors.unauthorized(C.INVALID_CREDENTIALS, 'Password is incorrect.');
          }
          await q(
            txn,
            `UPDATE user_auth_credentials
             SET mfa_enabled = FALSE, mfa_secret = NULL, mfa_pending_secret = NULL
             WHERE user_id = $1`,
            [session.user_id],
          );
          await q(
            txn,
            `UPDATE sessions SET revoked_at = now()
             WHERE user_id = $1 AND revoked_at IS NULL`,
            [session.user_id],
          );
          await audit(txn, {
            organizationId: session.organization_id,
            userId: session.user_id,
            action: 'MFA_DISABLED',
            resourceType: 'user',
            resourceId: session.user_id,
            requestId: meta.requestId,
          });
        },
      );
    },

    // ------------------------------------------------------------------
    // Housekeeping
    // ------------------------------------------------------------------

    /** Physically delete sessions expired >7 days (server job). */
    async deleteExpiredSessions(): Promise<number> {
      return withClient(async (client) => {
        const { rows } = await client.query<{ auth_delete_expired_sessions: number }>(
          `SELECT auth_delete_expired_sessions()`,
        );
        return rows[0]?.auth_delete_expired_sessions ?? 0;
      });
    },

    options: { secure },
  };
}

export type AuthService = ReturnType<typeof createAuthService>;
