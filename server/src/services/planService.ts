import { and, eq } from 'drizzle-orm';
import { withTenant, type Tx } from '../db/client.js';
import { decisionLogs, planVersions, retirementPlans } from '../db/schema.js';
import {
  findPlan,
  insertPlan,
  insertVersion,
  markScenariosStale,
  nextVersionNumber,
  updatePlan,
  updateVersionResult,
  findBaseScenario,
  updateScenario,
} from '../repositories/planRepository.js';
import { auditService } from '../audit/service.js';
import { env } from '../config.js';
import { ApiError } from '../http/errors.js';
import { calculationService, type CalculatedPlan } from './calculationService.js';
import type { MembershipCtx } from './context.js';

/**
 * PlanService — multi-write plan/version operations (spec §20/§21/§140/§141,
 * §23 staleness, §49 calculation orchestration).
 */

export class PlanService {
  /** Create plan + version 1 + current_version_id + decision_log + audit. */
  async createPlan(params: {
    ctx: MembershipCtx;
    clientId: string;
    name: string;
    inputSnapshot?: unknown;
    assumptionsSnapshot?: Record<string, unknown>;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ plan: typeof retirementPlans.$inferSelect; version: typeof planVersions.$inferSelect }> {
    const { ctx } = params;
    return withTenant(ctx.organizationId, ctx.userId, ctx.role, async (tx) => {
      const plan = await insertPlan(tx, {
        organizationId: ctx.organizationId,
        clientId: params.clientId,
        name: params.name,
        status: 'draft',
        createdBy: ctx.userId,
      });
      const version = await insertVersion(tx, {
        organizationId: ctx.organizationId,
        planId: plan.id,
        versionNumber: 1,
        inputSnapshot: params.inputSnapshot ?? {},
        assumptionsSnapshot: params.assumptionsSnapshot ?? {},
        resultSnapshot: {},
        engineVersion: env.ENGINE_VERSION,
        createdBy: ctx.userId,
      });
      await updatePlan(tx, ctx.organizationId, plan.id, { currentVersionId: version.id });
      await tx.insert(decisionLogs).values({
        organizationId: ctx.organizationId,
        clientId: params.clientId,
        planId: plan.id,
        actorUserId: ctx.userId,
        action: 'plan_created',
        summary: `Plan '${plan.name}' created (v1).`,
        metadata: { planId: plan.id, versionId: version.id },
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'PLAN_CREATED',
        resourceType: 'plan',
        resourceId: plan.id,
        metadata: { planId: plan.id, clientId: params.clientId, name: plan.name },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
      });
      return { plan, version };
    });
  }

  /**
   * Create the next plan version. §23: scenarios whose base_version_id !=
   * the new current version are marked stale. History is append-only.
   */
  async createVersion(params: {
    ctx: MembershipCtx;
    planId: string;
    inputSnapshot: unknown;
    assumptionsSnapshot?: Record<string, unknown>;
    changeSummary?: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ plan: typeof retirementPlans.$inferSelect; version: typeof planVersions.$inferSelect }> {
    const { ctx } = params;
    return withTenant(ctx.organizationId, ctx.userId, ctx.role, async (tx) => {
      const plan = await findPlan(tx, ctx.organizationId, params.planId);
      const versionNumber = await nextVersionNumber(tx, ctx.organizationId, params.planId);
      const version = await insertVersion(tx, {
        organizationId: ctx.organizationId,
        planId: params.planId,
        versionNumber,
        inputSnapshot: params.inputSnapshot,
        assumptionsSnapshot: params.assumptionsSnapshot ?? {},
        resultSnapshot: {},
        engineVersion: env.ENGINE_VERSION,
        createdBy: ctx.userId,
        changeSummary: params.changeSummary ?? null,
      });
      await updatePlan(tx, ctx.organizationId, params.planId, {
        currentVersionId: version.id,
      });
      const staleCount = await markScenariosStale(
        tx,
        ctx.organizationId,
        params.planId,
        version.id,
      );
      await tx.insert(decisionLogs).values({
        organizationId: ctx.organizationId,
        clientId: plan.clientId,
        planId: params.planId,
        actorUserId: ctx.userId,
        action: 'PLAN_VERSION_CREATED',
        summary: `Plan '${plan.name}' version ${versionNumber} created.`,
        metadata: {
          planId: params.planId,
          versionId: version.id,
          versionNumber,
          scenariosMarkedStale: staleCount,
          changeSummary: params.changeSummary ?? null,
        },
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'PLAN_VERSION_CREATED',
        resourceType: 'plan_version',
        resourceId: version.id,
        metadata: { planId: params.planId, versionNumber, scenariosMarkedStale: staleCount },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
      });
      return { plan, version };
    });
  }

  /** Restore: creates a NEW version from an old snapshot (never overwrite). */
  async restoreVersion(params: {
    ctx: MembershipCtx;
    planId: string;
    versionId: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ version: typeof planVersions.$inferSelect }> {
    const { ctx } = params;
    const source = await withTenant(ctx.organizationId, ctx.userId, ctx.role, async (tx) => {
      const row = await tx
        .select()
        .from(planVersions)
        .where(
          and(
            eq(planVersions.id, params.versionId),
            eq(planVersions.planId, params.planId),
            eq(planVersions.organizationId, ctx.organizationId),
          ),
        )
        .limit(1)
        .then((rows) => rows[0]);
      if (!row) throw new ApiError(404, 'NOT_FOUND', 'Plan version not found.');
      return row;
    });
    const { version } = await this.createVersion({
      ctx,
      planId: params.planId,
      inputSnapshot: source.inputSnapshot,
      assumptionsSnapshot: source.assumptionsSnapshot as Record<string, unknown>,
      changeSummary: `Restored from v${source.versionNumber}`,
      requestId: params.requestId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
    return { version };
  }

  /**
   * Calculate a plan version (spec §49): runs the engine via
   * CalculationService, stores result_snapshot on the version, recalculates
   * the plan's non-archived 'base' scenario when present, and records
   * decision_log + audit.
   */
  async calculatePlanVersion(params: {
    ctx: MembershipCtx;
    planId: string;
    versionId?: string;
    simulationCount?: number;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ result: CalculatedPlan['result']; baseScenarioRecalculated: boolean }> {
    const { ctx } = params;
    const calculated = await calculationService.calculatePlan({
      organizationId: ctx.organizationId,
      userId: ctx.userId,
      role: ctx.role,
      planId: params.planId,
      versionId: params.versionId,
      simulationCount: params.simulationCount,
    });

    return withTenant(ctx.organizationId, ctx.userId, ctx.role, async (tx) => {
      await updateVersionResult(
        tx,
        ctx.organizationId,
        calculated.version.id,
        calculated.result,
      );

      // Recalculate the plan's base scenario against the current version.
      let baseScenarioRecalculated = false;
      const base = await findBaseScenario(tx, ctx.organizationId, params.planId);
      if (base) {
        const scenarioCalc = await calculationService.calculatePlan({
          organizationId: ctx.organizationId,
          userId: ctx.userId,
          role: ctx.role,
          planId: params.planId,
          versionId: calculated.version.id,
          simulationCount: params.simulationCount,
          scenarioAssumptions: base.assumptions,
        });
        await updateScenario(tx, ctx.organizationId, base.id, {
          result: {
            ...scenarioCalc.result,
            metadata: {
              ...scenarioCalc.result.metadata,
              planVersion: calculated.version.versionNumber,
              assumptionVersion: calculated.assumptionVersion,
            },
          },
          resultStatus: 'calculated',
          baseVersionId: calculated.version.id,
        });
        baseScenarioRecalculated = true;
      }

      const plan = await findPlan(tx, ctx.organizationId, params.planId);
      await tx.insert(decisionLogs).values({
        organizationId: ctx.organizationId,
        clientId: plan.clientId,
        planId: params.planId,
        actorUserId: ctx.userId,
        action: 'PLAN_CALCULATED',
        summary: `Plan '${plan.name}' v${calculated.version.versionNumber} calculated.`,
        metadata: {
          planId: params.planId,
          versionId: calculated.version.id,
          requiredCorpus: calculated.result.requiredCorpus,
          projectedCorpus: calculated.result.projectedCorpus,
          fundingRatio: calculated.result.fundingRatio,
          probabilityOfSuccess: calculated.result.probabilityOfSuccess,
          engineVersion: calculated.result.metadata.engineVersion,
          seed: calculated.result.metadata.seed,
        },
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'PLAN_CALCULATED',
        resourceType: 'plan',
        resourceId: params.planId,
        metadata: {
          versionId: calculated.version.id,
          requiredCorpus: calculated.result.requiredCorpus,
          projectedCorpus: calculated.result.projectedCorpus,
          fundingRatio: calculated.result.fundingRatio,
        },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
      });
      return { result: calculated.result, baseScenarioRecalculated };
    });
  }
}

export const planService = new PlanService();
