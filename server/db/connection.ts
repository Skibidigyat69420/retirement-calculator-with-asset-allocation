import pg from 'pg';

const { Pool } = pg;

const DEFAULT_DATABASE_URL =
    'postgres://postgres:postgres@localhost:5432/wealth_planner';

export function databaseUrl(): string {
    return process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL;
}

/**
 * Shared connection pool for the API server.
 *
 * SECURITY (spec section 36 — the IMPORTANT RLS edge case): tenant context is
 * set with SET LOCAL semantics via set_tenant_context(), which evaporates at
 * COMMIT/ROLLBACK. For request handling, run each request's queries inside a
 * transaction (pool.connect() + BEGIN) so a checked-in connection can never
 * carry a stale app.organization_id into another tenant's request.
 */
export const pool = new Pool({
    connectionString: databaseUrl(),
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
});

export async function closePool(): Promise<void> {
    await pool.end();
}
