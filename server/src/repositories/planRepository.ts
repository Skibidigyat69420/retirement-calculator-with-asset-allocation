import { and, asc, desc, eq, isNull, ne, sql } from 'drizzle-orm';
import type { Tx } from '../db/client.js';
import {
  planScenarios,
  planVersions,
  retirementPlans,
  type PlanScenario,
  type PlanVersion,
  type RetirementPlan,
} from '../db/schema.js';
import { ApiError } from '../http/errors.js';

/**
 * Plans / versions / scenarios repository. Tenant-aware (explicit
 * organization_id filters inside withTenant transactions).
 */

export async function findPlan(
  tx: Tx,
  organizationId: string,
  planId: string,
): Promise<RetirementPlan> {
  const row = await tx
    .select()
    .from(retirementPlans)
    .where(
      and(
        eq(retirementPlans.id, planId),
        eq(retirementPlans.organizationId, organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Plan not found.');
  return row;
}

export async function listPlans(
  tx: Tx,
  organizationId: string,
  clientId: string,
  status?: string,
): Promise<RetirementPlan[]> {
  const conditions = [
    eq(retirementPlans.clientId, clientId),
    eq(retirementPlans.organizationId, organizationId),
  ];
  if (status) conditions.push(eq(retirementPlans.status, status as typeof retirementPlans.status._.data));
  return tx
    .select()
    .from(retirementPlans)
    .where(and(...conditions))
    .orderBy(desc(retirementPlans.createdAt));
}

export async function insertPlan(
  tx: Tx,
  values: typeof retirementPlans.$inferInsert,
): Promise<RetirementPlan> {
  const row = await tx.insert(retirementPlans).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Plan insert failed.');
  return row;
}

export async function updatePlan(
  tx: Tx,
  organizationId: string,
  planId: string,
  patch: Partial<typeof retirementPlans.$inferInsert>,
): Promise<RetirementPlan> {
  const row = await tx
    .update(retirementPlans)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(retirementPlans.id, planId),
        eq(retirementPlans.organizationId, organizationId),
      ),
    )
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Plan not found.');
  return row;
}

// ------------------------------------------------------------------ versions

export async function listVersions(
  tx: Tx,
  organizationId: string,
  planId: string,
): Promise<PlanVersion[]> {
  return tx
    .select()
    .from(planVersions)
    .where(
      and(eq(planVersions.planId, planId), eq(planVersions.organizationId, organizationId)),
    )
    .orderBy(asc(planVersions.versionNumber));
}

export async function findVersion(
  tx: Tx,
  organizationId: string,
  planId: string,
  versionId: string,
): Promise<PlanVersion> {
  const row = await tx
    .select()
    .from(planVersions)
    .where(
      and(
        eq(planVersions.id, versionId),
        eq(planVersions.planId, planId),
        eq(planVersions.organizationId, organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Plan version not found.');
  return row;
}

export async function nextVersionNumber(
  tx: Tx,
  organizationId: string,
  planId: string,
): Promise<number> {
  const row = await tx
    .select({ max: sql<string>`coalesce(max(${planVersions.versionNumber}), 0)` })
    .from(planVersions)
    .where(
      and(eq(planVersions.planId, planId), eq(planVersions.organizationId, organizationId)),
    )
    .then((rows) => rows[0]);
  return Number(row?.max ?? 0) + 1;
}

export async function insertVersion(
  tx: Tx,
  values: typeof planVersions.$inferInsert,
): Promise<PlanVersion> {
  const row = await tx.insert(planVersions).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Version insert failed.');
  return row;
}

export async function updateVersionResult(
  tx: Tx,
  organizationId: string,
  versionId: string,
  resultSnapshot: unknown,
): Promise<void> {
  await tx
    .update(planVersions)
    .set({ resultSnapshot })
    .where(
      and(eq(planVersions.id, versionId), eq(planVersions.organizationId, organizationId)),
    );
}

// ----------------------------------------------------------------- scenarios

export interface ScenarioWithStaleness extends PlanScenario {
  stale: boolean;
}

export async function listScenarios(
  tx: Tx,
  organizationId: string,
  planId: string,
): Promise<ScenarioWithStaleness[]> {
  const plan = await findPlan(tx, organizationId, planId);
  const rows = await tx
    .select()
    .from(planScenarios)
    .where(
      and(eq(planScenarios.planId, planId), eq(planScenarios.organizationId, organizationId)),
    )
    .orderBy(desc(planScenarios.createdAt));
  return rows.map((s) => ({
    ...s,
    stale:
      plan.currentVersionId !== null &&
      s.baseVersionId !== null &&
      s.baseVersionId !== plan.currentVersionId,
  }));
}

export async function findScenario(
  tx: Tx,
  organizationId: string,
  scenarioId: string,
): Promise<PlanScenario> {
  const row = await tx
    .select()
    .from(planScenarios)
    .where(
      and(
        eq(planScenarios.id, scenarioId),
        eq(planScenarios.organizationId, organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Scenario not found.');
  return row;
}

export async function insertScenario(
  tx: Tx,
  values: typeof planScenarios.$inferInsert,
): Promise<PlanScenario> {
  const row = await tx.insert(planScenarios).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Scenario insert failed.');
  return row;
}

export async function updateScenario(
  tx: Tx,
  organizationId: string,
  scenarioId: string,
  patch: Partial<typeof planScenarios.$inferInsert>,
): Promise<PlanScenario> {
  const row = await tx
    .update(planScenarios)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(planScenarios.id, scenarioId),
        eq(planScenarios.organizationId, organizationId),
      ),
    )
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Scenario not found.');
  return row;
}

/** The plan's non-archived 'base' scenario used for auto-recalculation. */
export async function findBaseScenario(
  tx: Tx,
  organizationId: string,
  planId: string,
): Promise<PlanScenario | null> {
  const row = await tx
    .select()
    .from(planScenarios)
    .where(
      and(
        eq(planScenarios.planId, planId),
        eq(planScenarios.organizationId, organizationId),
        eq(planScenarios.scenarioType, 'base'),
        isNull(planScenarios.archivedAt),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  return row ?? null;
}

/**
 * Spec §23 staleness: after a new plan version is published, every scenario
 * whose base_version_id differs from the new current version is stale.
 * Archived scenarios are never touched.
 */
export async function markScenariosStale(
  tx: Tx,
  organizationId: string,
  planId: string,
  currentVersionId: string,
): Promise<number> {
  const res = await tx
    .update(planScenarios)
    .set({ resultStatus: 'stale' })
    .where(
      and(
        eq(planScenarios.planId, planId),
        eq(planScenarios.organizationId, organizationId),
        isNull(planScenarios.archivedAt),
        ne(planScenarios.baseVersionId, currentVersionId),
      ),
    )
    .returning({ id: planScenarios.id });
  return res.length;
}
