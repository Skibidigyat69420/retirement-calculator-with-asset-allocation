import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { inTenant, guards, auditFields } from '../services/context.js';
import {
  findHousehold,
  insertHousehold,
  listHouseholds,
  updateHousehold,
} from '../repositories/collabRepository.js';
import { auditService, redact } from '../audit/service.js';

/** Households (spec §66). */
export default async function householdRoutes(app: FastifyInstance): Promise<void> {
  const createSchema = z.object({
    name: z.string().min(1).max(200),
    status: z.enum(['active', 'archived']).default('active'),
  });
  const patchSchema = z
    .object({ name: z.string().min(1).max(200).optional(), status: z.enum(['active', 'archived']).optional() })
    .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update.' });

  app.get('/households', async (request) => {
    return inTenant(request, async (tx, ctx) => {
      const data = await listHouseholds(tx, ctx.organizationId);
      return { data };
    });
  });

  app.post('/households', async (request, reply) => {
    const body = createSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      guards.edit(ctx, null); // household creation = client-management work
      const household = await insertHousehold(tx, {
        organizationId: ctx.organizationId,
        name: body.name,
        status: body.status,
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'HOUSEHOLD_CREATED',
        resourceType: 'household',
        resourceId: household.id,
        metadata: redact({ name: household.name }),
        ...auditFields(request),
      });
      return reply.status(201).send(household);
    });
  });

  app.patch('/households/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = patchSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      guards.edit(ctx, null);
      const before = await findHousehold(tx, ctx.organizationId, id);
      const household = await updateHousehold(tx, ctx.organizationId, id, body);
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'HOUSEHOLD_UPDATED',
        resourceType: 'household',
        resourceId: id,
        metadata: redact({ before: { name: before.name, status: before.status }, after: body }),
        ...auditFields(request),
      });
      return household;
    });
  });
}
