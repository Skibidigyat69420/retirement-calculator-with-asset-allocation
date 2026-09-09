import postgres from 'postgres';
import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { env } from '../config.js';
import * as schema from './schema.js';

export type Db = PostgresJsDatabase<typeof schema>;
/** Transaction handle passed to withTenant / withSystem callbacks. */
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0];

/**
 * Raw postgres.js pool. Exported for health checks and direct queries only —
 * application code should use `db`, `withTenant`, or `withSystem`.
 */
export const pool = postgres(env.DATABASE_URL, {
  max: 10,
  onnotice: () => {}, // keep NOTICEs (e.g. from RLS debug) out of logs
});

/**
 * Drizzle instance on the pool WITHOUT any tenant GUC set. Safe for:
 *  - the auth plugin's actor lookup (runs before org context exists),
 *  - `withSystem` service-role operations that bypass tenant RLS.
 * NEVER use this for tenant-scoped business queries — those must go through
 * `withTenant` so row-level security sees the app.* GUCs.
 */
export const db: Db = drizzle(pool, { schema });

export interface TenantContext {
  organizationId: string;
  userId: string;
  role: string;
}

/**
 * Run `fn` inside a transaction with the tenant GUCs set via `SET LOCAL`.
 *
 * `SET LOCAL` (transaction-scoped) is MANDATORY here, not `SET`: the pool
 * multiplexes many requests over a small number of physical connections, and
 * a plain `SET` would leak one tenant's context into the next request that
 * reuses the same connection — a cross-tenant data breach. `SET LOCAL`
 * automatically reverts at COMMIT/ROLLBACK, so the connection returns to the
 * pool clean even if `fn` throws.
 */
export async function withTenant<T>(
  organizationId: string,
  userId: string,
  role: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT set_config('app.current_organization_id', ${organizationId}, true)`,
    );
    await tx.execute(
      sql`SELECT set_config('app.current_user_id', ${userId}, true)`,
    );
    await tx.execute(sql`SELECT set_config('app.current_role', ${role}, true)`);
    return fn(tx);
  });
}

/**
 * Run `fn` inside a transaction WITHOUT any tenant GUC. Use for
 * service-role/system operations (e.g. platform admin, background jobs) that
 * intentionally bypass tenant row-level security.
 */
export async function withSystem<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => fn(tx));
}

export { schema };
