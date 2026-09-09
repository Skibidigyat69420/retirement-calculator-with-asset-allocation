import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { desc, eq, isNull } from 'drizzle-orm';
import { inTenant, auditFields } from '../services/context.js';
import { assumptionSets } from '../db/schema.js';
import { requireRole } from '../tenancy/plugin.js';
import { auditService, redact } from '../audit/service.js';

/**
 * Assumption sets (spec §24). Globals have organization_id NULL; POST creates
 * an org-scoped override (practice_owner / practice_admin only).
 */

const createSchema = z.object({
  name: z.string().min(1).max(200),
  data: z.record(z.string(), z.unknown()),
  source: z.string().max(100).optional(),
  version: z.string().min(1).max(50), // NOT NULL in migration — client supplies it
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  validTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export default async function assumptionRoutes(app: FastifyInstance): Promise<void> {
  app.get('/assumptions', async (request) => {
    return inTenant(request, async (tx, ctx) => {
      const globals = await tx
        .select()
        .from(assumptionSets)
        .where(isNull(assumptionSets.organizationId))
        .orderBy(desc(assumptionSets.createdAt));
      const orgOverrides = await tx
        .select()
        .from(assumptionSets)
        .where(eq(assumptionSets.organizationId, ctx.organizationId))
        .orderBy(desc(assumptionSets.createdAt));
      return { globals, orgOverrides };
    });
  });

  app.post(
    '/assumptions',
    { preHandler: requireRole('practice_owner', 'practice_admin') },
    async (request, reply) => {
      const body = createSchema.parse(request.body ?? {});
      return inTenant(request, async (tx, ctx) => {
        const row = await tx
          .insert(assumptionSets)
          .values({
            organizationId: ctx.organizationId,
            name: body.name,
            data: body.data,
            source: body.source ?? 'org_override',
            version: body.version,
            validFrom: body.validFrom ?? null,
            validTo: body.validTo ?? null,
          })
          .returning()
          .then((r) => r[0]!);
        await auditService.log({
          organizationId: ctx.organizationId,
          actorUserId: ctx.userId,
          action: 'ASSUMPTION_SET_CREATED',
          resourceType: 'assumption_set',
          resourceId: row.id,
          metadata: redact({ name: body.name, version: body.version ?? null }),
          ...auditFields(request),
        });
        return reply.status(201).send(row);
      });
    },
  );
}
