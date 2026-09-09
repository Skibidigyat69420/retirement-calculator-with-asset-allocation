import { jwtVerify, createRemoteJWKSet } from 'jose';
import { eq, and, or } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import { env } from '../config.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Resolved actor (users row) for the authenticated principal. */
    actor: {
      userId: string;
      email: string;
      fullName: string | null;
      authUserId: string | null;
    };
  }
  interface FastifyContextConfig {
    /** Public routes skip authentication and tenancy checks. */
    public?: boolean;
  }
}

export interface VerifiedToken {
  sub: string;
  aud: string;
}

/**
 * URL paths that skip authentication. Route config `{ config: { public: true }}`
 * is also honored wherever route options are populated, but `onRequest` runs
 * before routing so URL matching is the authoritative mechanism here.
 * Later public routes (e.g. /auth/invite/accept) must be added to this list.
 */
export const PUBLIC_PATHS: readonly string[] = [
  '/health',
  // Public auth surface. The dev-login path is additionally gated to
  // AUTH_MODE==='dev' inside its handler (404 otherwise); invitation accept
  // is public by design (spec §131).
  '/api/v1/auth/dev-login',
  '/api/v1/auth/invitations/accept',
];

export function isPublicPath(url: string): boolean {
  const path = url.split('?')[0] ?? url;
  return PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

async function verifyDevToken(token: string): Promise<VerifiedToken> {
  const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
  });
  if (!payload.sub) throw new Error('missing sub');
  const aud = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
  if (aud !== 'authenticated' && aud !== 'dev') {
    throw new Error(`unexpected aud: ${String(aud)}`);
  }
  return { sub: payload.sub, aud: String(aud) };
}

async function verifySupabaseToken(token: string): Promise<VerifiedToken> {
  const jwksUrl =
    env.SUPABASE_JWKS_URL ??
    (env.SUPABASE_URL
      ? `${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`
      : undefined);
  const iss = env.SUPABASE_URL ? `${env.SUPABASE_URL}/auth/v1` : undefined;

  if (jwksUrl) {
    try {
      const JWKS = createRemoteJWKSet(new URL(jwksUrl));
      const { payload } = await jwtVerify(token, JWKS, { issuer: iss });
      if (!payload.sub) throw new Error('missing sub');
      return { sub: payload.sub, aud: String(payload.aud ?? '') };
    } catch (jwksErr) {
      // Fall through to HS256 legacy verification.
      if (!env.SUPABASE_JWT_SECRET) throw jwksErr;
    }
  }

  const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
  });
  if (!payload.sub) throw new Error('missing sub');
  return { sub: payload.sub, aud: String(payload.aud ?? '') };
}

/**
 * Authentication plugin. onRequest hook:
 *  1. Skips public paths (see PUBLIC_PATHS) and `{ config: { public: true }}`.
 *  2. Reads `Authorization: Bearer <jwt>` and verifies it:
 *       dev mode     → HS256 with SUPABASE_JWT_SECRET; payload.sub required;
 *                      aud must be 'authenticated' or 'dev'.
 *       supabase mode→ JWKS (RS256) at SUPABASE_JWKS_URL or
 *                      `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` with
 *                      iss `${SUPABASE_URL}/auth/v1`, falling back to HS256
 *                      SUPABASE_JWT_SECRET for legacy Supabase JWTs.
 *  3. Loads the actor from `users` by `auth_user_id = sub`. This lookup runs
 *     on the shared no-GUC drizzle instance — it happens BEFORE any org
 *     context exists and must NOT set tenant GUCs.
 *  4. Decorates `request.actor`. Failures → 401 UNAUTHORIZED envelope.
 */
export const authPlugin = fp(async (app: FastifyInstance) => {
  app.decorateRequest('actor', null as never);

  app.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (isPublicPath(request.url)) return;
      if (request.routeOptions.config?.public) return;

      const header = request.headers.authorization;
      const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
      if (!token) {
        return reply
          .status(401)
          .send(errorBody(request, 'UNAUTHORIZED', 'Authentication required.'));
      }

      let verified: VerifiedToken;
      try {
        verified =
          env.AUTH_MODE === 'dev'
            ? await verifyDevToken(token)
            : await verifySupabaseToken(token);
      } catch (err) {
        request.log.warn({ err }, 'token verification failed');
        return reply
          .status(401)
          .send(errorBody(request, 'UNAUTHORIZED', 'Invalid or expired token.'));
      }

      // Actor lookup — no tenant GUC on this connection path (pre-org-context).
      // In dev mode users created by invitation acceptance have auth_user_id
      // NULL and dev tokens carry the users.id as sub, so also match on id.
      const [actor] = await db
        .select({
          userId: users.id,
          email: users.email,
          fullName: users.fullName,
          authUserId: users.authUserId,
        })
        .from(users)
        .where(
          and(
            env.AUTH_MODE === 'dev'
              ? or(eq(users.authUserId, verified.sub), eq(users.id, verified.sub))
              : eq(users.authUserId, verified.sub),
            eq(users.status, 'active'),
          ),
        )
        .limit(1);

      if (!actor) {
        return reply
          .status(401)
          .send(
            errorBody(
              request,
              'UNAUTHORIZED',
              'No platform user matches this token.',
            ),
          );
      }

      request.actor = actor;
    },
  );
});

function errorBody(
  request: FastifyRequest,
  code: string,
  message: string,
): { error: { code: string; message: string; requestId: string } } {
  return {
    error: { code, message, requestId: request.requestId ?? 'req_unknown' },
  };
}
