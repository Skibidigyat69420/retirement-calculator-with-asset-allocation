import { and, eq, isNull } from 'drizzle-orm';
import type { Tx } from '../db/client.js';
import {
  assets,
  cashflowRules,
  goals,
  liabilities,
  type Asset,
  type CashflowRule,
  type Goal,
  type Liability,
} from '../db/schema.js';
import { ApiError } from '../http/errors.js';

/**
 * Financial-profile repository: assets, liabilities, cashflow_rules, goals.
 * All queries carry explicit organization_id filters and run inside
 * withTenant transactions. Numeric (numeric(20,2)) columns come back as
 * strings from Postgres — convert at the API boundary, not here.
 */

const notArchived = isNull(assets.archivedAt);

export async function listAssets(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<Asset[]> {
  return tx
    .select()
    .from(assets)
    .where(
      and(eq(assets.clientId, clientId), eq(assets.organizationId, organizationId)),
    )
    .orderBy(assets.createdAt);
}

export async function findAsset(
  tx: Tx,
  organizationId: string,
  clientId: string,
  assetId: string,
): Promise<Asset> {
  const row = await tx
    .select()
    .from(assets)
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.clientId, clientId),
        eq(assets.organizationId, organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Asset not found.');
  return row;
}

export async function insertAsset(
  tx: Tx,
  values: typeof assets.$inferInsert,
): Promise<Asset> {
  const row = await tx.insert(assets).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Asset insert failed.');
  return row;
}

export async function updateAsset(
  tx: Tx,
  organizationId: string,
  clientId: string,
  assetId: string,
  patch: Partial<typeof assets.$inferInsert>,
): Promise<Asset> {
  await findAsset(tx, organizationId, clientId, assetId);
  const row = await tx
    .update(assets)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(assets.id, assetId),
        eq(assets.clientId, clientId),
        eq(assets.organizationId, organizationId),
      ),
    )
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Asset not found.');
  return row;
}

// ------------------------------------------------------------- liabilities

export async function listLiabilities(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<Liability[]> {
  return tx
    .select()
    .from(liabilities)
    .where(
      and(
        eq(liabilities.clientId, clientId),
        eq(liabilities.organizationId, organizationId),
      ),
    )
    .orderBy(liabilities.createdAt);
}

export async function findLiability(
  tx: Tx,
  organizationId: string,
  clientId: string,
  id: string,
): Promise<Liability> {
  const row = await tx
    .select()
    .from(liabilities)
    .where(
      and(
        eq(liabilities.id, id),
        eq(liabilities.clientId, clientId),
        eq(liabilities.organizationId, organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Liability not found.');
  return row;
}

export async function insertLiability(
  tx: Tx,
  values: typeof liabilities.$inferInsert,
): Promise<Liability> {
  const row = await tx.insert(liabilities).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Liability insert failed.');
  return row;
}

export async function updateLiability(
  tx: Tx,
  organizationId: string,
  clientId: string,
  id: string,
  patch: Partial<typeof liabilities.$inferInsert>,
): Promise<Liability> {
  await findLiability(tx, organizationId, clientId, id);
  const row = await tx
    .update(liabilities)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(liabilities.id, id),
        eq(liabilities.clientId, clientId),
        eq(liabilities.organizationId, organizationId),
      ),
    )
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Liability not found.');
  return row;
}

// ------------------------------------------------------------ cashflow_rules

export async function listCashflows(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<CashflowRule[]> {
  return tx
    .select()
    .from(cashflowRules)
    .where(
      and(
        eq(cashflowRules.clientId, clientId),
        eq(cashflowRules.organizationId, organizationId),
      ),
    )
    .orderBy(cashflowRules.createdAt);
}

export async function findCashflow(
  tx: Tx,
  organizationId: string,
  clientId: string,
  id: string,
): Promise<CashflowRule> {
  const row = await tx
    .select()
    .from(cashflowRules)
    .where(
      and(
        eq(cashflowRules.id, id),
        eq(cashflowRules.clientId, clientId),
        eq(cashflowRules.organizationId, organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Cashflow not found.');
  return row;
}

export async function insertCashflow(
  tx: Tx,
  values: typeof cashflowRules.$inferInsert,
): Promise<CashflowRule> {
  const row = await tx.insert(cashflowRules).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Cashflow insert failed.');
  return row;
}

export async function updateCashflow(
  tx: Tx,
  organizationId: string,
  clientId: string,
  id: string,
  patch: Partial<typeof cashflowRules.$inferInsert>,
): Promise<CashflowRule> {
  await findCashflow(tx, organizationId, clientId, id);
  const row = await tx
    .update(cashflowRules)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(cashflowRules.id, id),
        eq(cashflowRules.clientId, clientId),
        eq(cashflowRules.organizationId, organizationId),
      ),
    )
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Cashflow not found.');
  return row;
}

// -------------------------------------------------------------------- goals

export async function listGoals(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<Goal[]> {
  return tx
    .select()
    .from(goals)
    .where(and(eq(goals.clientId, clientId), eq(goals.organizationId, organizationId)))
    .orderBy(goals.createdAt);
}

export async function findGoal(
  tx: Tx,
  organizationId: string,
  clientId: string,
  id: string,
): Promise<Goal> {
  const row = await tx
    .select()
    .from(goals)
    .where(
      and(
        eq(goals.id, id),
        eq(goals.clientId, clientId),
        eq(goals.organizationId, organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Goal not found.');
  return row;
}

export async function insertGoal(
  tx: Tx,
  values: typeof goals.$inferInsert,
): Promise<Goal> {
  const row = await tx.insert(goals).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Goal insert failed.');
  return row;
}

export async function updateGoal(
  tx: Tx,
  organizationId: string,
  clientId: string,
  id: string,
  patch: Partial<typeof goals.$inferInsert>,
): Promise<Goal> {
  await findGoal(tx, organizationId, clientId, id);
  const row = await tx
    .update(goals)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(goals.id, id),
        eq(goals.clientId, clientId),
        eq(goals.organizationId, organizationId),
      ),
    )
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Goal not found.');
  return row;
}

/** Aggregate totals for GET /clients/:id/profile. */
export async function profileTotals(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<{ netWorth: number; investableAssets: number }> {
  const { financialSummary } = await import('./clientRepository.js');
  return financialSummary(tx, organizationId, clientId);
}
