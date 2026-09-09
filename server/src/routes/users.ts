import type { FastifyInstance } from 'fastify';
import { inTenant } from '../services/context.js';
import { findUserByEmail, listMembershipsForUser } from '../repositories/orgRepository.js';
import { eq } from 'drizzle-orm';
import { users } from '../db/schema.js';
import { db } from '../db/client.js';

/** GET /users/me — actor + memberships across orgs (org switcher, §37). */
export default async function userRoutes(app: FastifyInstance): Promise<void> {
  app.get('/users/me', async (request) => {
    return inTenant(request, async (tx, ctx) => {
      const user =
        (await findUserByEmail(tx, request.actor.email)) ??
        (await db.select().from(users).where(eq(users.id, ctx.userId)).limit(1).then((r) => r[0]));
      const memberships = await listMembershipsForUser(tx, ctx.userId);
      return {
        user: {
          id: ctx.userId,
          email: request.actor.email,
          fullName: request.actor.fullName,
          authUserId: request.actor.authUserId,
          status: user?.status ?? 'active',
        },
        memberships,
      };
    });
  });
}
