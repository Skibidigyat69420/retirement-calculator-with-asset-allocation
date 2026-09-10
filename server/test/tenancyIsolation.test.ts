import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { setupMigratedDb, testDbUrl } from './migratedDb.js';

/**
 * Tenant isolation (spec §148).
 *
 * NOTE on layers: every business query in src/repositories filters
 * organization_id explicitly (the API connects as the table owner, which
 * BYPASSES RLS — see the in-file note in rlsDirect.test.ts). This suite
 * exercises the API defense stack: org-scoped repository filters + guards.
 * RLS itself (default-deny, WITH CHECK, GUC handling) is enforced at the DB
 * layer and covered directly in rlsDirect.test.ts.
 *
 * Database: full platform schema in `stw_test` (see migratedDb.ts), NOT the
 * minimal-bootstrap `postgres` DB the core suite uses.
 */

// config.ts reads process.env at import time → point DATABASE_URL at the
// migrated test DB BEFORE helpers/src modules are evaluated, and skip the
// minimal bootstrap (stw_test already has the full schema).
process.env['DATABASE_URL'] = testDbUrl();
process.env['TEST_BOOTSTRAP'] = '0';

const { bootTestApp, makeJwt, dbQuery } = await import('./helpers.js');
const {
  insertUser,
  insertOrg,
  insertMembership,
  insertClient,
  insertAssignment,
  insertPlan,
  insertNotification,
  insertReport,
  purgeTestOrg,
} = await import('./seedUtils.js');

const API = '/api/v1';

let app: Awaited<ReturnType<typeof bootTestApp>>['app'];
let close: () => Promise<void>;

let orgA: string;
let orgB: string;
let userA: string;
let authUserIdA: string;
let userB: string;
let clientA: string;
let clientB: string;
let planB: string;
let reportB: string;
let tokenA: string;

const orgIds: string[] = [];
const userIds: string[] = [];
const clientIds: string[] = [];

function headers(token: string, orgId: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, 'x-organization-id': orgId };
}

beforeAll(async () => {
  await setupMigratedDb();
  ({ app, close } = await bootTestApp());

  // Org A: user A (wealth_practitioner), client A, plan A; user A is the
  // primary assignment on client A.
  const orgARow = await insertOrg('Tenant Org A');
  orgA = orgARow.id;
  orgIds.push(orgA);
  const userARow = await insertUser();
  userA = userARow.id;
  authUserIdA = userARow.authUserId;
  userIds.push(userA);
  await insertMembership(orgA, userA, 'wealth_practitioner');
  clientA = (await insertClient(orgA, { firstName: 'Alpha', lastName: 'One' })).id;
  clientIds.push(clientA);
  await insertAssignment(clientA, userA, 'primary');
  await insertPlan(orgA, clientA);

  // Org B: user B (wealth_practitioner), client B, plan B, report B,
  // notification B — none of which user A has any legitimate access to.
  const orgBRow = await insertOrg('Tenant Org B');
  orgB = orgBRow.id;
  orgIds.push(orgB);
  const userBRow = await insertUser();
  userB = userBRow.id;
  userIds.push(userB);
  await insertMembership(orgB, userB, 'wealth_practitioner');
  clientB = (await insertClient(orgB, { firstName: 'Beta', lastName: 'Two' })).id;
  clientIds.push(clientB);
  await insertAssignment(clientB, userB, 'primary');
  planB = (await insertPlan(orgB, clientB)).id;
  reportB = (await insertReport(orgB, clientB)).id;

  // One notification per user — cross-user visibility must be zero.
  await insertNotification(orgA, userA, 'notification-for-A');
  await insertNotification(orgB, userB, 'notification-for-B');

  tokenA = await makeJwt({ sub: authUserIdA, aud: 'dev' });
});

afterAll(async () => {
  await purgeTestOrg(orgIds, userIds, clientIds);
  await close?.();
});

describe('cross-tenant access is invisible (spec §148)', () => {
  it('user A reads own client → 200', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `${API}/clients/${clientA}`,
      headers: headers(tokenA, orgA),
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(clientA);
  });

  it("user A GETs user B's client → 404 CLIENT_NOT_FOUND (no oracle)", async () => {
    const res = await app.inject({
      method: 'GET',
      url: `${API}/clients/${clientB}`,
      headers: headers(tokenA, orgA),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('CLIENT_NOT_FOUND');
  });

  it("user A GETs user B's plan → 404", async () => {
    const res = await app.inject({
      method: 'GET',
      url: `${API}/plans/${planB}`,
      headers: headers(tokenA, orgA),
    });
    expect(res.statusCode).toBe(404);
  });

  it("user A GETs user B's report → 404", async () => {
    const res = await app.inject({
      method: 'GET',
      url: `${API}/reports/${reportB}`,
      headers: headers(tokenA, orgA),
    });
    expect(res.statusCode).toBe(404);
  });

  it('GET /clients list contains only org A clients', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `${API}/clients`,
      headers: headers(tokenA, orgA),
    });
    expect(res.statusCode).toBe(200);
    const ids = res.json().data.map((c: { id: string }) => c.id);
    expect(ids).toContain(clientA);
    expect(ids).not.toContain(clientB);
  });

  it.each(['decisions', 'assets', 'documents', 'export'])(
    "user A reads client B's %s → 404",
    async (path) => {
      const res = await app.inject({
        method: 'GET',
        url: `${API}/clients/${clientB}/${path}`,
        headers: headers(tokenA, orgA),
      });
      expect(res.statusCode).toBe(404);
    },
  );

  it('direct ID guessing: random UUID → 404 (no existence oracle)', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `${API}/clients/${randomUUID()}`,
      headers: headers(tokenA, orgA),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('CLIENT_NOT_FOUND');
  });
});

describe('defense-in-depth: repository filters, not just route guards', () => {
  it("PATCH client B with org A header → 404 and org B's row is unchanged", async () => {
    const before = await dbQuery()`
      SELECT first_name, last_name FROM clients WHERE id = ${clientB}
    `;
    const res = await app.inject({
      method: 'PATCH',
      url: `${API}/clients/${clientB}`,
      headers: headers(tokenA, orgA),
      payload: { firstName: 'Hacked', lastName: 'Hacked' },
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('CLIENT_NOT_FOUND');

    const after = await dbQuery()`
      SELECT first_name, last_name FROM clients WHERE id = ${clientB}
    `;
    expect(after).toEqual(before);
  });
});

describe('notifications are strictly per-user', () => {
  it("user A's notification list never shows user B's notifications", async () => {
    const res = await app.inject({
      method: 'GET',
      url: `${API}/notifications`,
      headers: headers(tokenA, orgA),
    });
    expect(res.statusCode).toBe(200);
    const rows = res.json().data as { userId: string; title: string }[];
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.userId).toBe(userA);
    }
    const titles = rows.map((r) => r.title);
    expect(titles).toContain('notification-for-A');
    expect(titles).not.toContain('notification-for-B');
  });
});
