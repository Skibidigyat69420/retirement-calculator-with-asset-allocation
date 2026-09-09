import { eq, desc, and, isNull } from 'drizzle-orm';
import { withTenant, type Tx } from '../db/client.js';
import {
  assumptionSets,
  clientAssignments,
  clients,
  decisionLogs,
  planVersions,
  retirementPlans,
} from '../db/schema.js';
import { insertAssignment } from '../repositories/clientRepository.js';
import { auditService, redact } from '../audit/service.js';
import { env } from '../config.js';
import { ApiError } from '../http/errors.js';
import type { MembershipCtx } from './context.js';

/**
 * ClientService — multi-write operations that must be atomic.
 */

async function newestGlobalAssumptionSnapshot(
  tx: Tx,
): Promise<Record<string, unknown>> {
  const global = await tx
    .select({ data: assumptionSets.data })
    .from(assumptionSets)
    .where(isNull(assumptionSets.organizationId))
    .orderBy(desc(assumptionSets.createdAt))
    .limit(1)
    .then((rows) => rows[0]);
  const data = global?.data;
  return data && typeof data === 'object' && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

export class ClientService {
  /**
   * Spec §140/§141 — create client + default assignment + starter 'Master
   * Plan' (plan_versions v1, empty input_snapshot, assumptions from the
   * newest global assumption set) + current_version_id + decision_log +
   * audits. ONE transaction.
   */
  async createClientWithPlan(params: {
    ctx: MembershipCtx;
    values: Omit<typeof clients.$inferInsert, 'organizationId'>;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ client: typeof clients.$inferSelect; plan: typeof retirementPlans.$inferSelect }> {
    const { ctx } = params;
    return withTenant(ctx.organizationId, ctx.userId, ctx.role, async (tx) => {
      const client = await tx
        .insert(clients)
        .values({ ...params.values, organizationId: ctx.organizationId })
        .returning()
        .then((r) => r[0]);
      if (!client) throw new ApiError(500, 'INTERNAL_ERROR', 'Client insert failed.');

      await insertAssignment(tx, {
        clientId: client.id,
        userId: ctx.userId,
        assignmentRole: 'primary',
      });

      const assumptionsSnapshot = await newestGlobalAssumptionSnapshot(tx);

      const plan = await tx
        .insert(retirementPlans)
        .values({
          organizationId: ctx.organizationId,
          clientId: client.id,
          name: 'Master Plan',
          status: 'draft',
          createdBy: ctx.userId,
        })
        .returning()
        .then((r) => r[0]);
      if (!plan) throw new ApiError(500, 'INTERNAL_ERROR', 'Plan insert failed.');

      const version = await tx
        .insert(planVersions)
        .values({
          organizationId: ctx.organizationId,
          planId: plan.id,
          versionNumber: 1,
          inputSnapshot: {},
          assumptionsSnapshot,
          resultSnapshot: {},
          engineVersion: env.ENGINE_VERSION,
          createdBy: ctx.userId,
        })
        .returning()
        .then((r) => r[0]);
      if (!version) throw new ApiError(500, 'INTERNAL_ERROR', 'Version insert failed.');

      await tx
        .update(retirementPlans)
        .set({ currentVersionId: version.id, updatedAt: new Date().toISOString() })
        .where(eq(retirementPlans.id, plan.id));

      await tx.insert(decisionLogs).values({
        organizationId: ctx.organizationId,
        clientId: client.id,
        planId: plan.id,
        actorUserId: ctx.userId,
        action: 'plan_created',
        summary: `Client created with starter plan '${plan.name}' (v1).`,
        metadata: { clientName: `${client.firstName} ${client.lastName}`, planId: plan.id },
      });

      // Audit uses the non-GUC db internally; safe to call inside the tx.
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'CLIENT_CREATED',
        resourceType: 'client',
        resourceId: client.id,
        metadata: redact({
          clientId: client.id,
          name: `${client.firstName} ${client.lastName}`,
          planId: plan.id,
        }),
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
      });
      return { client, plan };
    });
  }

  /** Permanent delete (spec §134 — canDeleteClient only). Cascades via FK. */
  async deleteClient(params: {
    ctx: MembershipCtx;
    clientId: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    const { ctx } = params;
    await withTenant(ctx.organizationId, ctx.userId, ctx.role, async (tx) => {
      const res = await tx
        .delete(clients)
        .where(
          and(eq(clients.id, params.clientId), eq(clients.organizationId, ctx.organizationId)),
        )
        .returning({ id: clients.id });
      if (res.length === 0) throw new ApiError(404, 'CLIENT_NOT_FOUND', 'Client not found.');
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'CLIENT_DELETED',
        resourceType: 'client',
        resourceId: params.clientId,
        metadata: {},
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
      });
    });
  }
}

export const clientService = new ClientService();
