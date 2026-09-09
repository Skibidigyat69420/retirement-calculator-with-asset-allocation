import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { setupMigratedDb, testDbUrl } from './migratedDb.js';

/**
 * Idempotency + rate-limit regression.
 *
 * Idempotency: POST /clients/:id/reports with an Idempotency-Key header must
 * replay the EXISTING report (200, same id, no duplicate row) and mint a new
 * report only for a new key (spec §98/§126).
 *
 * Rate limit: the global limiter is 300 req/min/IP in production —
 * exercising it for real needs 301 requests, so the app accepts a test-only
 * override (AppOptions.rateLimitMax in src/app.ts). /health stays public.
 */

process.env['DATABASE_URL'] = testDbUrl();
process.env['TEST_BOOTSTRAP'] = '0';

const { bootTestApp, makeJwt, dbQuery } = await import('./helpers.js');
const {
  insertUser,
  insertOrg,
  insertMembership,
  insertClient,
  purgeTestOrg,
} = await import('./seedUtils.js');

const API = '/api/v1';

let app: Awaited<ReturnType<typeof bootTestApp>>['app'];
let close: () => Promise<void>;
let orgId: string;
let clientId: string;
let token: string;

const orgIds: string[] = [];
const userIds: string[] = [];
const clientIds: string[] = [];

beforeAll(async () => {
  await setupMigratedDb();
  ({ app, close } = await bootTestApp());

  orgId = (await insertOrg('Idempotency Org')).id;
  orgIds.push(orgId);
  const user = await insertUser();
  userIds.push(user.id);
  await insertMembership(orgId, user.id, 'practice_owner');
  clientId = (await insertClient(orgId)).id;
  clientIds.push(clientId);
  token = await makeJwt({ sub: user.authUserId, aud: 'dev' });
});

afterAll(async () => {
  await purgeTestOrg(orgIds, userIds, clientIds);
  await close();
});

function reportCount(): Promise<{ count: string }[]> {
  return dbQuery()`SELECT count(*)::text AS count FROM reports WHERE client_id = ${clientId}`;
}

/**
 * The routes call reply.send() inside the tenant-transaction callback, so
 * the HTTP response can be observed a hair before COMMIT lands. Poll (exact
 * match, bounded) instead of asserting on a possibly-stale snapshot.
 */
async function waitForReportCount(expected: number, timeoutMs = 5000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const actual = Number((await reportCount())[0]!.count);
    if (actual === expected) return;
    if (Date.now() > deadline) {
      throw new Error(`reports count for client: expected ${expected}, got ${actual}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

describe('report creation idempotency', () => {
  it('same Idempotency-Key replays the existing report — one row total', async () => {
    const key = `idem-${randomUUID()}`;
    const headers = {
      authorization: `Bearer ${token}`,
      'x-organization-id': orgId,
      'idempotency-key': key,
    };
    const body = { reportType: 'full_plan' };

    const first = await app.inject({
      method: 'POST',
      url: `${API}/clients/${clientId}/reports`,
      headers,
      payload: body,
    });
    expect(first.statusCode).toBe(201);
    const firstId = first.json().id;
    await waitForReportCount(1); // ensure COMMIT before the replay lookup

    const second = await app.inject({
      method: 'POST',
      url: `${API}/clients/${clientId}/reports`,
      headers,
      payload: body,
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().id).toBe(firstId);
    expect(second.json().idempotentReplay).toBe(true);

    await waitForReportCount(1);
  });

  it('a different key mints a new report', async () => {
    await waitForReportCount(1); // settle test 1's COMMIT first
    const headersFor = (key: string) => ({
      authorization: `Bearer ${token}`,
      'x-organization-id': orgId,
      'idempotency-key': key,
    });

    const res = await app.inject({
      method: 'POST',
      url: `${API}/clients/${clientId}/reports`,
      headers: headersFor(`idem-${randomUUID()}`),
      payload: { reportType: 'full_plan' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().idempotentReplay).toBeUndefined();

    await waitForReportCount(2);
  });
});

describe('global rate limiter (low test-only limit)', () => {
  it(`4 rapid requests with limit 3 → 4th is 429 RATE_LIMITED`, async () => {
    const { buildApp } = await import('../src/app.js');
    const rlApp = await buildApp({ logger: false, rateLimitMax: 3 });
    try {
      const statuses: number[] = [];
      let lastBody: { error?: { code?: string } } = {};
      for (let i = 0; i < 4; i++) {
        const res = await rlApp.inject({ method: 'GET', url: '/health' });
        statuses.push(res.statusCode);
        lastBody = res.json();
      }
      expect(statuses.slice(0, 3)).toEqual([200, 200, 200]);
      expect(statuses[3]).toBe(429);
      expect(lastBody.error?.code).toBe('RATE_LIMITED');
    } finally {
      await rlApp.close();
    }
  });
});
