import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { SignJWT } from 'jose';
import { eq } from 'drizzle-orm';
import { env } from '../config.js';
import { db } from '../db/client.js';
import { users } from '../db/schema.js';
import { ApiError } from '../http/errors.js';
import { auditService } from '../audit/service.js';
import { invitationService } from '../services/invitationService.js';
import { auditFields } from '../services/context.js';

/**
 * Auth routes.
 *  - POST /auth/dev-login        DEV MODE ONLY (404 otherwise)
 *  - POST /auth/invitations/accept  PUBLIC (whitelisted in auth/plugin.ts)
 */

const devLoginSchema = z.object({ email: z.string().email() });
const acceptSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(1).max(200).optional(),
  // Accepted for forward compatibility (Supabase mode); never persisted or
  // logged here.
  password: z.string().min(8).optional(),
});

export default async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/dev-login', async (request, reply) => {
    // DEV MODE ONLY — this endpoint mints tokens and must never exist in
    // production deployments.
    if (env.AUTH_MODE !== 'dev') {
      throw new ApiError(404, 'NOT_FOUND', 'Route not found.');
    }
    const { email } = devLoginSchema.parse(request.body ?? {});
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'No user with that email.');

    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
    const sub = user.authUserId ?? user.id;
    const token = await new SignJWT({ email: user.email })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(sub)
      .setAudience('dev')
      .setIssuedAt()
      .setExpirationTime('12h')
      .sign(secret);

    await db
      .update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.id, user.id));

    return reply.send({
      token,
      tokenType: 'Bearer',
      expiresIn: 12 * 3600,
      user: { id: user.id, email: user.email, fullName: user.fullName },
    });
  });

  app.post('/auth/invitations/accept', async (request, reply) => {
    const body = acceptSchema.parse(request.body ?? {});
    const result = await invitationService.accept({
      token: body.token,
      fullName: body.fullName,
      ...auditFields(request),
    });
    return reply.send(result);
  });
}
