import { eq, and } from 'drizzle-orm';
import type {
  FastifyInstance,
  FastifyReply,
  FastifyRequest,
  preHandlerAsyncHookHandler,
} from 'fastify';
import fp from 'fastify-plugin';
import { db } from '../db/client.js';
import { organizationMemberships } from '../db/schema.js';
import { isPublicPath } from '../auth/plugin.js';
import { errors, ApiError } from '../http/errors.js';

declare module 'fastify' {
  interface FastifyRequest {
    /** Caller membership in the org from `x-organization-id`. */
    membership: {
      organizationId: string;
      role: string;
    };
  }
}

/**
 * Tenancy plugin. Runs after auth. For every non-public route:
 *  1. Requires the `x-organization-id` header → 400 ORG_CONTEXT_REQUIRED.
 *  2. Loads an ACTIVE membership for (organization_id, actor.userId)
 *     → 403 ORG_ACCESS_DENIED when absent.
 *  3. Decorates `request.membership = { organizationId, role }`.
 *
 * Platform admin note: a `platform_admin` membership in ANY org passes all
 * can* checks in permissions/policies.ts; this plugin still requires an
 * explicit org context header.
 */
export const tenancyPlugin = fp(
  async (app: FastifyInstance) => {
    app.decorateRequest('membership', null as never);

    app.addHook(
      'onRequest',
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (isPublicPath(request.url)) return;
        if (request.routeOptions.config?.public) return;

        const orgHeader = request.headers['x-organization-id'];
        if (typeof orgHeader !== 'string' || orgHeader.length === 0) {
          return sendError(reply, request, errors.orgContextRequired());
        }

        // Membership lookup uses the no-GUC drizzle instance — org context
        // is exactly what we are establishing here.
        const [membership] = await db
          .select({
            organizationId: organizationMemberships.organizationId,
            role: organizationMemberships.role,
          })
          .from(organizationMemberships)
          .where(
            and(
              eq(organizationMemberships.organizationId, orgHeader),
              eq(organizationMemberships.userId, request.actor.userId),
              eq(organizationMemberships.status, 'active'),
            ),
          )
          .limit(1);

        if (!membership) {
          return sendError(reply, request, errors.orgAccessDenied());
        }

        request.membership = membership;
      },
    );
  },
);

function sendError(
  reply: FastifyReply,
  request: FastifyRequest,
  err: ApiError,
): FastifyReply {
  return reply.status(err.statusCode).send({
    error: {
      code: err.code,
      message: err.message,
      requestId: request.requestId ?? 'req_unknown',
    },
  });
}

/**
 * preHandler factory: require at least one of the given org roles.
 * Usage: `app.get('/x', { preHandler: requireRole('practice_owner') }, handler)`
 *
 * platform_admin bypass: a platform_admin membership passes every requireRole
 * check (platform_admin > all).
 */
export function requireRole(
  ...roles: string[]
): preHandlerAsyncHookHandler {
  return async (request: FastifyRequest) => {
    const membership = request.membership;
    if (!membership) {
      throw new ApiError(
        403,
        'ORG_ACCESS_DENIED',
        'No organization context available.',
      );
    }
    if (membership.role === 'platform_admin') return;
    if (!roles.includes(membership.role)) {
      throw new ApiError(
        403,
        'ORG_ACCESS_DENIED',
        `Requires role: ${roles.join(' | ')}.`,
      );
    }
  };
}
