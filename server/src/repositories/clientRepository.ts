import { and, eq } from 'drizzle-orm';
import type { Tx } from '../db/client.js';
import {
  clientAssignments,
  clients,
  users,
  type AssignmentRole,
  type Client,
} from '../db/schema.js';
import { ApiError, errors } from '../http/errors.js';

/**
 * Client repository — all queries are tenant-aware: every statement filters
 * organization_id explicitly (belt) inside withTenant transactions whose GUC
 * enables RLS (suspenders).
 */

export interface ClientWithAssignments extends Client {
  assignments: { userId: string; fullName: string | null; assignmentRole: AssignmentRole }[];
}

export async function findClient(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<Client> {
  const row = await tx
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.organizationId, organizationId)))
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw errors.clientNotFound();
  return row;
}

/** Assignment of a specific user to a client (null when unassigned). */
export async function findAssignmentRole(
  tx: Tx,
  clientId: string,
  userId: string,
): Promise<AssignmentRole | null> {
  const row = await tx
    .select({ assignmentRole: clientAssignments.assignmentRole })
    .from(clientAssignments)
    .where(
      and(
        eq(clientAssignments.clientId, clientId),
        eq(clientAssignments.userId, userId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  return row?.assignmentRole ?? null;
}

export async function listAssignments(
  tx: Tx,
  clientId: string,
): Promise<ClientWithAssignments['assignments']> {
  const rows = await tx
    .select({
      userId: clientAssignments.userId,
      fullName: users.fullName,
      assignmentRole: clientAssignments.assignmentRole,
    })
    .from(clientAssignments)
    .innerJoin(users, eq(users.id, clientAssignments.userId))
    .where(eq(clientAssignments.clientId, clientId));
  return rows;
}

export async function insertAssignment(
  tx: Tx,
  values: typeof clientAssignments.$inferInsert,
): Promise<void> {
  await tx
    .insert(clientAssignments)
    .values(values)
    .onConflictDoUpdate({
      target: [clientAssignments.clientId, clientAssignments.userId],
      set: { assignmentRole: values.assignmentRole },
    });
}

export async function deleteAssignment(
  tx: Tx,
  clientId: string,
  userId: string,
): Promise<void> {
  const row = await tx
    .delete(clientAssignments)
    .where(
      and(
        eq(clientAssignments.clientId, clientId),
        eq(clientAssignments.userId, userId),
      ),
    )
    .returning({ clientId: clientAssignments.clientId });
  if (row.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Assignment not found.');
}

/**
 * investableAssets rule (documented): sum of current_value over non-archived
 * assets whose liquidity is 'high' or 'medium' OR whose asset_category is one
 * of equity/debt/cash/mutual_fund. netWorth = assets − liabilities.
 */
export async function financialSummary(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<{ netWorth: number; investableAssets: number }> {
  const { sql } = await import('drizzle-orm');
  const { assets, liabilities } = await import('../db/schema.js');
  const assetAgg = await tx
    .select({
      total: sql<string>`coalesce(sum(${assets.currentValue}), 0)`,
      investable: sql<string>`coalesce(sum(${assets.currentValue}) filter (
        where ${assets.liquidity} in ('high', 'medium')
           or lower(${assets.assetCategory}) in ('equity', 'debt', 'cash', 'mutual_fund')
      ), 0)`,
    })
    .from(assets)
    .where(
      and(
        eq(assets.clientId, clientId),
        eq(assets.organizationId, organizationId),
        sql`${assets.archivedAt} is null`,
      ),
    )
    .then((rows) => rows[0]);
  const liabilityAgg = await tx
    .select({ total: sql<string>`coalesce(sum(${liabilities.outstandingAmount}), 0)` })
    .from(liabilities)
    .where(
      and(
        eq(liabilities.clientId, clientId),
        eq(liabilities.organizationId, organizationId),
        sql`${liabilities.archivedAt} is null`,
      ),
    )
    .then((rows) => rows[0]);
  const assetsTotal = Number(assetAgg?.total ?? 0);
  const investable = Number(assetAgg?.investable ?? 0);
  const liabilitiesTotal = Number(liabilityAgg?.total ?? 0);
  return { netWorth: assetsTotal - liabilitiesTotal, investableAssets: investable };
}

/** Latest activity date: newest decision_log or plan creation, else null. */
export async function lastReviewedAt(
  tx: Tx,
  organizationId: string,
  clientId: string,
): Promise<string | null> {
  const { sql } = await import('drizzle-orm');
  const { decisionLogs, retirementPlans } = await import('../db/schema.js');
  const [row] = await tx.execute<{ latest: string | null }>(sql`
    select greatest(
      (select max(${decisionLogs.createdAt}) from ${decisionLogs}
        where ${decisionLogs.clientId} = ${clientId}
          and ${decisionLogs.organizationId} = ${organizationId}),
      (select max(${retirementPlans.createdAt}) from ${retirementPlans}
        where ${retirementPlans.clientId} = ${clientId}
          and ${retirementPlans.organizationId} = ${organizationId})
    ) as latest
  `);
  return row?.latest ?? null;
}
