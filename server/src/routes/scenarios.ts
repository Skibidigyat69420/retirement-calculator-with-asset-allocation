import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { inTenant, guards, auditFields } from '../services/context.js';
import {
  findPlan,
  findScenario,
  insertScenario,
  listScenarios,
  updateScenario,
} from '../repositories/planRepository.js';
import { findAssignmentRole } from '../repositories/clientRepository.js';
import { calculationService } from '../services/calculationService.js';
import { auditService, redact } from '../audit/service.js';

/**
 * Scenarios (spec §22/§23/§144). Staleness is derived from
 * base_version_id != plan.current_version_id and updated on new versions.
 * Scenario results carry metadata.planVersion/assumptionVersion/engineVersion
 * for reproducibility (§144).
 */

const createSchema = z.object({
  name: z.string().min(1).max(200),
  scenarioType: z.enum(['base', 'conservative', 'optimistic', 'custom', 'stress', 'reverse', 'what_if']),
  assumptions: z.record(z.string(), z.unknown()).default({}),
});
const patchSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    assumptions: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update.' });
const calculateSchema = z
  .object({ simulationCount: z.number().int().min(100).max(10000).optional() })
  .optional();

export default async function scenarioRoutes(app: FastifyInstance): Promise<void> {
  app.get('/plans/:id/scenarios', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const plan = await findPlan(tx, ctx.organizationId, id);
      const assignmentRole = await findAssignmentRole(tx, plan.clientId, ctx.userId);
      guards.view(ctx, assignmentRole);
      const rows = await listScenarios(tx, ctx.organizationId, id);
      return {
        data: rows.map((s) => ({
          id: s.id,
          planId: s.planId,
          name: s.name,
          scenarioType: s.scenarioType,
          assumptions: s.assumptions,
          resultStatus: s.resultStatus,
          baseVersionId: s.baseVersionId,
          stale: s.stale,
          createdBy: s.createdBy,
          archivedAt: s.archivedAt,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
        })),
      };
    });
  });

  app.post('/plans/:id/scenarios', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = createSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const plan = await findPlan(tx, ctx.organizationId, id);
      const assignmentRole = await findAssignmentRole(tx, plan.clientId, ctx.userId);
      guards.createScenario(ctx, assignmentRole);
      const scenario = await insertScenario(tx, {
        organizationId: ctx.organizationId,
        planId: id,
        name: body.name,
        scenarioType: body.scenarioType,
        assumptions: body.assumptions,
        result: {},
        resultStatus: 'draft',
        baseVersionId: plan.currentVersionId,
        createdBy: ctx.userId,
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'SCENARIO_CREATED',
        resourceType: 'scenario',
        resourceId: scenario.id,
        metadata: redact({ planId: id, name: body.name, scenarioType: body.scenarioType }),
        ...auditFields(request),
      });
      return reply.status(201).send({ ...scenario, stale: false });
    });
  });

  app.get('/scenarios/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const scenario = await findScenario(tx, ctx.organizationId, id);
      const plan = await findPlan(tx, ctx.organizationId, scenario.planId);
      const assignmentRole = await findAssignmentRole(tx, plan.clientId, ctx.userId);
      guards.view(ctx, assignmentRole);
      return {
        ...scenario,
        stale:
          plan.currentVersionId !== null &&
          scenario.baseVersionId !== null &&
          scenario.baseVersionId !== plan.currentVersionId,
      };
    });
  });

  app.patch('/scenarios/:id', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = patchSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      const scenario = await findScenario(tx, ctx.organizationId, id);
      const plan = await findPlan(tx, ctx.organizationId, scenario.planId);
      const assignmentRole = await findAssignmentRole(tx, plan.clientId, ctx.userId);
      guards.createScenario(ctx, assignmentRole);
      const updated = await updateScenario(tx, ctx.organizationId, id, body);
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'SCENARIO_UPDATED',
        resourceType: 'scenario',
        resourceId: id,
        metadata: redact({ patch: body }),
        ...auditFields(request),
      });
      return updated;
    });
  });

  app.post('/scenarios/:id/archive', async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      const scenario = await findScenario(tx, ctx.organizationId, id);
      const plan = await findPlan(tx, ctx.organizationId, scenario.planId);
      const assignmentRole = await findAssignmentRole(tx, plan.clientId, ctx.userId);
      guards.createScenario(ctx, assignmentRole);
      const updated = await updateScenario(tx, ctx.organizationId, id, {
        archivedAt: new Date().toISOString(),
        resultStatus: 'archived',
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'SCENARIO_ARCHIVED',
        resourceType: 'scenario',
        resourceId: id,
        metadata: {},
        ...auditFields(request),
      });
      return updated;
    });
  });

  app.post('/scenarios/:id/calculate', async (request, reply) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const body = calculateSchema.parse(request.body ?? undefined) ?? {};
    return inTenant(request, async (tx, ctx) => {
      const scenario = await findScenario(tx, ctx.organizationId, id);
      const plan = await findPlan(tx, ctx.organizationId, scenario.planId);
      const assignmentRole = await findAssignmentRole(tx, plan.clientId, ctx.userId);
      guards.createScenario(ctx, assignmentRole);

      const calculated = await calculationService.calculatePlan({
        organizationId: ctx.organizationId,
        userId: ctx.userId,
        role: ctx.role,
        planId: plan.id,
        simulationCount: body.simulationCount,
        scenarioAssumptions: scenario.assumptions,
      });
      const updated = await updateScenario(tx, ctx.organizationId, id, {
        result: {
          ...calculated.result,
          metadata: {
            ...calculated.result.metadata,
            planVersion: calculated.version.versionNumber,
            assumptionVersion: calculated.assumptionVersion,
          },
        },
        resultStatus: 'calculated',
        baseVersionId: plan.currentVersionId,
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'SCENARIO_CALCULATED',
        resourceType: 'scenario',
        resourceId: id,
        metadata: redact({
          planId: plan.id,
          fundingRatio: calculated.result.fundingRatio,
          probabilityOfSuccess: calculated.result.probabilityOfSuccess,
        }),
        ...auditFields(request),
      });
      return reply.send(updated);
    });
  });
}
