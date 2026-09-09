import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import postgres from 'postgres';
import { setupMigratedDb, testDbUrl } from './migratedDb.js';

/**
 * Direct RLS verification against the running PostgreSQL on localhost:54330.
 *
 * Connects as a dedicated NOSUPERUSER role `stw_rls_test` (NOT the table
 * owner) so row-level security actually applies — the API connects as the
 * table owner/superuser, and table owners BYPASS RLS by default. That is
 * exactly why the application layer additionally filters organization_id in
 * every repository query (verified in tenancyIsolation.test.ts); this suite
 * proves the DB layer independently enforces tenancy:
 *
 *   1. default-deny: with no app.* GUC set, SELECT returns 0 rows,
 *   2. org GUC (set with set_config(..., true) inside a transaction, as
 *      withTenant does) scopes SELECT to the caller's org,
 *   3. WITH CHECK blocks INSERTs claiming another org (42501),
 *   4. INSERTs for the caller's own org succeed (rolled back after),
 *   5. tenant GUC state never leaks to another connection/pool.
 *
 * GUC notes: current_setting('app.current_organization_id', true) returns
 * NULL when unset, and NULL = uuid comparisons fail → deny. CURRENT_ROLE is
 * a reserved keyword, so `SET "app.current_role"` would need quoting;
 * set_config() avoids the issue entirely.
 */

process.env['DATABASE_URL'] = testDbUrl();
process.env['TEST_BOOTSTRAP'] = '0';

const { dbQuery } = await import('./helpers.js');
const {
  insertUser,
  insertOrg,
  insertMembership,
  insertClient,
  purgeTestOrg,
} = await import('./seedUtils.js');

const RLS_ROLE = 'stw_rls_test';
const RLS_URL = `postgres://${RLS_ROLE}:test@localhost:54330/stw_test`;
const TEST_LAST_NAME = 'RLS Direct Test Client';

let rls: postgres.Sql;
let orgA: string;
let orgB: string;
let clientA: string;
let clientB: string;
let userA: string;

const orgIds: string[] = [];
const userIds: string[] = [];
const clientIds: string[] = [];

async function setTenantGucs(
  tx: postgres.TransactionSql,
  organizationId: string,
  userId: string,
): Promise<void> {
  await tx.unsafe("SELECT set_config('app.current_organization_id', $1, true)", [organizationId]);
  await tx.unsafe("SELECT set_config('app.current_user_id', $1, true)", [userId]);
  await tx.unsafe("SELECT set_config('app.current_role', 'wealth_practitioner', true)");
}

beforeAll(async () => {
  await setupMigratedDb();

  // Idempotent role setup (cluster-wide; left in place after the run).
  const [role] = await dbQuery()`SELECT 1 FROM pg_roles WHERE rolname = ${RLS_ROLE}`;
  if (!role) {
    await dbQuery().unsafe(`CREATE ROLE ${RLS_ROLE} LOGIN NOSUPERUSER PASSWORD 'test'`);
  }
  await dbQuery().unsafe(`GRANT USAGE ON SCHEMA public TO ${RLS_ROLE}`);
  await dbQuery().unsafe(
    `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${RLS_ROLE}`,
  );

  orgA = (await insertOrg('RLS Org A')).id;
  orgIds.push(orgA);
  orgB = (await insertOrg('RLS Org B')).id;
  orgIds.push(orgB);
  const user = await insertUser();
  userA = user.id;
  userIds.push(userA);
  await insertMembership(orgA, userA, 'wealth_practitioner');
  clientA = (await insertClient(orgA, { lastName: 'RLS Alpha' })).id;
  clientIds.push(clientA);
  clientB = (await insertClient(orgB, { lastName: 'RLS Beta' })).id;
  clientIds.push(clientB);

  rls = postgres(RLS_URL, { max: 2 });
});

afterAll(async () => {
  await rls.end();
  // Defensive cleanup of anything the sentinel rollback failed to undo.
  await dbQuery()`DELETE FROM clients WHERE last_name = ${TEST_LAST_NAME}`;
  await purgeTestOrg(orgIds, userIds, clientIds);
  const { closeDbQuery } = await import('./helpers.js');
  await closeDbQuery();
});

describe('RLS default-deny', () => {
  it('SELECT with no GUC returns 0 rows', async () => {
    const rows = await rls`SELECT id FROM clients`;
    expect(rows).toEqual([]);
  });
});

describe('RLS with tenant GUC set (mirrors withTenant)', () => {
  it('SELECT returns only org A rows', async () => {
    await rls.begin(async (tx) => {
      await setTenantGucs(tx, orgA, userA);
      const rows = await tx`SELECT id, organization_id FROM clients`;
      expect(rows.length).toBeGreaterThanOrEqual(1);
      for (const row of rows) {
        expect(row.organization_id).toBe(orgA);
      }
      const ids = rows.map((r) => r.id as string);
      expect(ids).toContain(clientA);
      expect(ids).not.toContain(clientB);
    });
  });

  it('INSERT claiming another org is rejected (42501)', async () => {
    let captured: unknown = null;
    const SENTINEL = '__expected_rls_violation__';
    await rls
      .begin(async (tx) => {
        await setTenantGucs(tx, orgA, userA);
        try {
          // Statement error aborts the tx, so this must be the last
          // statement; the sentinel forces the ROLLBACK of the aborted tx.
          await tx`
            INSERT INTO clients (id, organization_id, first_name, last_name)
            VALUES (${randomUUID()}, ${orgB}, 'Sneaky', 'CrossTenant')
          `;
        } catch (err) {
          captured = err;
          throw new Error(SENTINEL);
        }
      })
      .catch((err: unknown) => {
        if ((err as Error).message !== SENTINEL) throw err;
      });
    expect(captured).not.toBeNull();
    expect(String((captured as { code?: string }).code)).toBe('42501');

    const leaked = await dbQuery()`
      SELECT 1 FROM clients WHERE last_name = 'CrossTenant'
    `;
    expect(leaked).toEqual([]);
  });

  it('INSERT for the caller own org passes WITH CHECK (rolled back after)', async () => {
    let insertedId: string | null = null;
    const SENTINEL = '__intentional_rollback__';
    await rls
      .begin(async (tx) => {
        await setTenantGucs(tx, orgA, userA);
        const [row] = await tx`
          INSERT INTO clients (id, organization_id, first_name, last_name)
          VALUES (${randomUUID()}, ${orgA}, 'RLS', ${TEST_LAST_NAME})
          RETURNING id
        `;
        insertedId = row!.id as string;
        throw new Error(SENTINEL); // force ROLLBACK of the successful insert
      })
      .catch((err: unknown) => {
        if ((err as Error).message !== SENTINEL) throw err;
      });
    expect(insertedId).toBeTruthy();

    // Superuser (table owner, bypasses RLS) confirms the rollback happened.
    const leftover = await dbQuery()`SELECT 1 FROM clients WHERE id = ${insertedId}`;
    expect(leftover).toEqual([]);
  });
});

describe('tenant GUC isolation across connections', () => {
  it('a second pool WITHOUT set_config still sees 0 rows', async () => {
    // Note: withTenant sets the GUC with set_config(..., is_local=true)
    // inside a transaction, so it reverts at COMMIT/ROLLBACK by
    // construction — this proves nothing lingers on the server side.
    const other = postgres(RLS_URL, { max: 1 });
    try {
      const rows = await other`SELECT id FROM clients`;
      expect(rows).toEqual([]);
      const [guc] = await other`
        SELECT current_setting('app.current_organization_id', true) AS org
      `;
      expect(guc!.org).toBeNull();
    } finally {
      await other.end();
    }
  });
});
