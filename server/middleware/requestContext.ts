/**
 * Per-request context (spec §34):
 *   resolve actor → resolve membership → set tenant context → serve query
 *
 * Tenant safety (spec §§35-36): the context is installed with
 *   BEGIN; SELECT set_config('app.user_id', ..., true);
 *         SELECT set_config('app.organization_id', ..., true);
 * on a DEDICATED pooled client, and released with COMMIT/ROLLBACK on
 * response finish (is_local := true = SET LOCAL semantics). A plain
 * persistent SET is never used, so tenant state cannot leak between
 * requests sharing a connection. Variable names match the 00xx
 * migrations; empty strings stand in for absent context and the hardened
 * accessors NULLIF-guard them to a clean default-deny (0091).
 *
 * Elevation: the session lookup from the cookie runs through SECURITY
 * DEFINER auth_lookup_session() because it happens before any context
 * exists. User/membership reads afterwards go through plain RLS.
 *
 * This middleware must run AFTER cookie-parser and BEFORE any route that
 * touches the database.
 */
import type { NextFunction, Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { SESSION_COOKIE_NAME } from '../auth/session.js';
import type { Role, SessionRow } from '../auth/types.js';

interface UserContextRow {
  email: string;
  full_name: string;
  status: string;
}

interface MembershipContextRow {
  organization_id: string;
  role: Role;
  status: string;
}

async function openContextConnection(pool: Pool): Promise<
  { client: PoolClient } | { error: Error }
> {
  try {
    const client = await pool.connect();
    await client.query('BEGIN');
    return { client };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export function requestContext(pool: Pool) {
  return async function requestContextMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    req.requestId = `req_${randomBytes(9).toString('base64url')}`;

    const opened = await openContextConnection(pool);
    if ('error' in opened) {
      next(opened.error);
      return;
    }
    const client = opened.client;

    let settled = false;
    const settle = async (rollback: boolean) => {
      if (settled) return;
      settled = true;
      try {
        await client.query(rollback ? 'ROLLBACK' : 'COMMIT');
      } catch {
        await client.query('ROLLBACK').catch(() => undefined);
      } finally {
        client.release();
      }
    };
    res.once('finish', () => void settle(false));
    res.once('close', () => void settle(true));

    try {
      const token = req.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
      if (!token) {
        // Anonymous: explicitly empty context (default deny everywhere).
        await client.query('SELECT set_config($1, $2, true)', ['app.user_id', '']);
        await client.query('SELECT set_config($1, $2, true)', ['app.organization_id', '']);
        req.db = client;
        next();
        return;
      }

      // Pre-context elevation: SECURITY DEFINER lookup by token hash.
      const { rows } = await client.query<SessionRow>(
        `SELECT * FROM auth_lookup_session($1)`,
        [token],
      );
      const session = rows[0];
      const sessionValid =
        session &&
        !session.revoked_at &&
        session.expires_at.getTime() > Date.now();

      if (!session || !sessionValid) {
        // Invalid/revoked/expired cookie: anonymous context; requireAuth
        // rejects at the route layer; session replay is denied (§199).
        await client.query('SELECT set_config($1, $2, true)', ['app.user_id', '']);
        await client.query('SELECT set_config($1, $2, true)', ['app.organization_id', '']);
        req.db = client;
        next();
        return;
      }

      await client.query('SELECT set_config($1, $2, true)', ['app.user_id', session.user_id]);
      await client.query('SELECT set_config($1, $2, true)', ['app.organization_id', '']);

      const { rows: users } = await client.query<UserContextRow>(
        `SELECT email, full_name, status FROM users WHERE id = $1`,
        [session.user_id],
      );
      if (!users[0] || users[0].status !== 'active') {
        await client.query('SELECT set_config($1, $2, true)', ['app.user_id', '']);
        req.db = client;
        next();
        return;
      }

      req.session = session;
      req.user = {
        id: session.user_id,
        email: users[0].email,
        fullName: users[0].full_name,
        status: users[0].status,
      };

      if (session.organization_id) {
        const { rows: memberships } = await client.query<MembershipContextRow>(
          `SELECT organization_id, role, status
           FROM organization_memberships
           WHERE user_id = $1 AND organization_id = $2 AND status = 'active'`,
          [session.user_id, session.organization_id],
        );
        if (memberships[0]) {
          await client.query('SELECT set_config($1, $2, true)', [
            'app.organization_id',
            session.organization_id,
          ]);
          req.membership = {
            organizationId: memberships[0].organization_id,
            role: memberships[0].role,
            status: memberships[0].status,
          };
        }
        // else: session points at an org the user no longer belongs to —
        // the tenant context stays EMPTY so queries deny rather than
        // executing under a stale organization.
      }

      req.db = client;
      next();
    } catch (err) {
      await settle(true);
      next(err instanceof Error ? err : undefined);
    }
  };
}
