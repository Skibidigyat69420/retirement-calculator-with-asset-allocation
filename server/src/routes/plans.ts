import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { inTenant, guards, loadClientAccess, auditFields } from '../services/context.js';
import {
  findPlan,
  findVersion,
  listPlans,
  listVersions,
  updatePlan,
} from '../repositories/planRepository.js';
import { planService } from '../services/planService.js';
import { auditService, redact } from '../audit/service.js';
import { findAssignmentRole } from '../repositories/clientRepository.js';

/**
 * Plans & versions (spec §20/§21/§140/§141/§49).
 */

const createPlanSchema = z.object({ name: z.string().min(1).max(200) });
const patchPlanSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    status: z.enum(['draft', 'in_review', 'approved', 'active', 'archived']).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update.' });
const createVersionSchema = z.object({
  inputSnapshot: z.record(z.string(), z.unknown()),
  assumptionsSnapshot: z.record(z.string(), z.unknown()).optional(),
  changeSummary: z.string().max(1000).optional(),
});
const calculateSchema = z
  .object({
    versionId: z.string().uuid().optional(),
    simulationCount: z.number().int().min(100).max(10000).optional(),
  })
  .optional();

function planSummary(p: { id: string; organizationId: string; clientId: string; name: string; status: string; createdBy: string | null; currentVersionId: string | null; archivedAt: string | null; createdAt: string; updatedAt: string }) {
  return p;
}

export default async function planRoutes(app: FastifyInstance): Promise<void> {
  // ------------------------------------------------------------ client plans
  app.get('/clients/:clientId/plans', async (request) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    const { status } = z.object({ status: z.string().optional() }).parse(request.query ?? {});
    return inTenant(request, async (tx, ctx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.view(ctx, assignmentRole);
      const rows = await listPlans(tx, ctx.organizationId, clientId, status);
      return { data: rows.map(planSummary) };
    });
  });

  app.post('/clients/:clientId/plans', async (request, reply) => {
    const { clientId } = z.object({ clientId: z.string().uuid() }).parse(request.params);
    const body = createPlanSchema.parse(request.body ?? {});
    const ctx = {
      organizationId: request.membership.organizationId,
      userId: request.actor.userId,
      role: request.membership.role,
    };
    // Authorization needs the actor's assignment → check inside a tenant tx.
    await inTenant(request, async (tx) => {
      const { assignmentRole } = await loadClientAccess(tx, ctx, clientId);
      guards.createPlan(ctx, assignmentRole);
    });
    const { plan, version } = await planService.createPlan({
      ctx,
      clientId,
      name: body.name,
      ...auditFields(request),
    });
    return reply.status(201).send({ ...planSummary(plan), currentVersionId: version.id });
  });

  // --------------------------------------------------------------- plan item
  app.get('/plans/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const plan = await findPlan(tx, ctx.organizationId, id);
      const assignmentRole = await findAssignmentRole(tx, plan.clientId, ctx.userId);
      guards.view(ctx, assignmentRole);
      const currentVersion = plan.currentVersionId
        ? await findVersion(tx, ctx.organizationId, id, plan.currentVersionId).catch(() => null)
        : null;
      return {
        ...planSummary(plan),
        currentVersion: currentVersion
          ? {
              id: currentVersion.id,
              versionNumber: currentVersion.versionNumber,
              engineVersion: currentVersion.engineVersion,
              changeSummary: currentVersion.changeSummary,
              inputSnapshot: currentVersion.inputSnapshot,
              assumptionsSnapshot: currentVersion.assumptionsSnapshot,
              hasResult: Object.keys(currentVersion.resultSnapshot as object).length > 0,
              createdAt: currentVersion.createdAt,
            }
          : null,
      };
    });
  });

  app.patch('/plans/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = patchPlanSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const before = await findPlan(tx, ctx.organizationId, id);
      const assignmentRole = await findAssignmentRole(tx, before.clientId, ctx.userId);
      guards.edit(ctx, assignmentRole);
      const plan = await updatePlan(tx, ctx.organizationId, id, {
        ...body,
        archivedAt: body.status === 'archived' ? new Date().toISOString() : before.archivedAt,
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'PLAN_UPDATED',
        resourceType: 'plan',
        resourceId: id,
        metadata: redact({ before: { name: before.name, status: before.status }, after: body }),
        ...auditFields(request),
      });
      return planSummary(plan);
    });
  });

  // ---------------------------------------------------------------- versions
  app.get('/plans/:id/versions', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const plan = await findPlan(tx, ctx.organizationId, id);
      const assignmentRole = await findAssignmentRole(tx, plan.clientId, ctx.userId);
      guards.view(ctx, assignmentRole);
      const rows = await listVersions(tx, ctx.organizationId, id);
      return {
        data: rows.map((v) => ({
          id: v.id,
          versionNumber: v.versionNumber,
          engineVersion: v.engineVersion,
          changeSummary: v.changeSummary,
          hasResult: Object.keys(v.resultSnapshot as object).length > 0,
          createdBy: v.createdBy,
          createdAt: v.createdAt,
        })),
      };
    });
  });

  app.get('/plans/:id/versions/:versionId', async (request) => {
    const { id, versionId } = z
      .object({ id: z.string().uuid(), versionId: z.string().uuid() })
      .parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const plan = await findPlan(tx, ctx.organizationId, id);
      const assignmentRole = await findAssignmentRole(tx, plan.clientId, ctx.userId);
      guards.view(ctx, assignmentRole);
      const version = await findVersion(tx, ctx.organizationId, id, versionId);
      return version;
    });
  });

  app.post('/plans/:id/versions', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = createVersionSchema.parse(request.body ?? {});
    const ctx = {
      organizationId: request.membership.organizationId,
      userId: request.actor.userId,
      role: request.membership.role,
    };
    await inTenant(request, async (tx) => {
      const plan = await findPlan(tx, ctx.organizationId, id);
      const assignmentRole = await findAssignmentRole(tx, plan.clientId, ctx.userId);
      guards.edit(ctx, assignmentRole);
    });
    const { version } = await planService.createVersion({
      ctx,
      planId: id,
      inputSnapshot: body.inputSnapshot,
      assumptionsSnapshot: body.assumptionsSnapshot,
      changeSummary: body.changeSummary,
      ...auditFields(request),
    });
    return reply.status(201).send(version);
  });

  app.post('/plans/:id/versions/:versionId/restore', async (request, reply) => {
    const { id, versionId } = z
      .object({ id: z.string().uuid(), versionId: z.string().uuid() })
      .parse(request.params);
    const ctx = {
      organizationId: request.membership.organizationId,
      userId: request.actor.userId,
      role: request.membership.role,
    };
    await inTenant(request, async (tx) => {
      const plan = await findPlan(tx, ctx.organizationId, id);
      const assignmentRole = await findAssignmentRole(tx, plan.clientId, ctx.userId);
      guards.edit(ctx, assignmentRole);
    });
    const { version } = await planService.restoreVersion({
      ctx,
      planId: id,
      versionId,
      ...auditFields(request),
    });
    return reply.status(201).send(version);
  });

  // -------------------------------------------------------------- calculate
  app.post('/plans/:id/calculate', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = calculateSchema.parse(request.body ?? undefined) ?? {};
    const ctx = {
      organizationId: request.membership.organizationId,
      userId: request.actor.userId,
      role: request.membership.role,
    };
    await inTenant(request, async (tx) => {
      const plan = await findPlan(tx, ctx.organizationId, id);
      const assignmentRole = await findAssignmentRole(tx, plan.clientId, ctx.userId);
      guards.createPlan(ctx, assignmentRole);
    });
    const outcome = await planService.calculatePlanVersion({
      ctx,
      planId: id,
      versionId: body.versionId,
      simulationCount: body.simulationCount,
      ...auditFields(request),
    });
    return reply.send(outcome);
  });
}
