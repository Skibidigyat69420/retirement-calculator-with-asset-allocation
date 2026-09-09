import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import postgres from 'postgres';
import { SignJWT } from 'jose';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

/**
 * Test utilities.
 *
 * ASSUMPTIONS:
 *  - DATABASE_URL points at a PostgreSQL instance the test DB user can write
 *    to (tests insert users/memberships directly — this is the table owner /
 *    a non-RLS role; full RLS behavior is covered by CI migration tests).
 *  - Migrations are applied by CI scripts, NOT by these tests. The only
 *    exception: when TEST_BOOTSTRAP=1, helpers applies
 *    test/migrations/0000_test_minimal.sql (users, organizations,
 *    organization_memberships only, no RLS) so the core suite can run
 *    independently of the parallel supabase/ migration work.
 */

export const TEST_DATABASE_URL =
  process.env['DATABASE_URL'] ?? 'postgres://postgres:postgres@localhost:54330/postgres';

export const TEST_JWT_SECRET =
  process.env['SUPABASE_JWT_SECRET'] ?? 'test-secret';

let sqlClient: postgres.Sql | undefined;

/** Raw postgres.js client for direct test queries/inserts. */
export function dbQuery(): postgres.Sql {
  if (!sqlClient) {
    sqlClient = postgres(TEST_DATABASE_URL, { max: 5 });
  }
  return sqlClient;
}

export async function closeDbQuery(): Promise<void> {
  if (sqlClient) {
    await sqlClient.end();
    sqlClient = undefined;
  }
}

/** Apply the minimal core-test bootstrap schema (idempotent). */
export async function applyTestBootstrap(): Promise<void> {
  if (process.env['TEST_BOOTSTRAP'] !== '1') return;
  const here = dirname(fileURLToPath(import.meta.url));
  const ddl = readFileSync(join(here, 'migrations', '0000_test_minimal.sql'), 'utf8');
  await dbQuery().unsafe(ddl);
}

export interface BootedApp {
  app: FastifyInstance;
  close: () => Promise<void>;
}

/**
 * Boot buildApp() with test config. DATABASE_URL / SUPABASE_JWT_SECRET are
 * injected into process.env BEFORE importing config-sensitive modules, so
 * call this before importing src modules (or rely on vitest env isolation).
 */
export async function bootTestApp(): Promise<BootedApp> {
  process.env['DATABASE_URL'] = TEST_DATABASE_URL;
  process.env['AUTH_MODE'] = process.env['AUTH_MODE'] ?? 'dev';
  process.env['SUPABASE_JWT_SECRET'] = TEST_JWT_SECRET;
  process.env['NODE_ENV'] = 'test';
  process.env['LOG_LEVEL'] = 'silent';

  await applyTestBootstrap();

  const app = await buildApp({ logger: false });
  return {
    app,
    close: async () => {
      await app.close();
      await closeDbQuery();
    },
  };
}

/** Mint an HS256 dev-mode JWT (aud 'dev'). */
export async function makeJwt(payload: Record<string, unknown>): Promise<string> {
  const secret = new TextEncoder().encode(TEST_JWT_SECRET);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(payload['sub'] ?? randomUUID()))
    .setAudience(String(payload['aud'] ?? 'dev'))
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

/** Insert a user + org + membership directly, returning identifiers. */
export async function seedActor(options: {
  email?: string;
  role?: string;
  orgSlug?: string;
}): Promise<{ userId: string; authUserId: string; organizationId: string }> {
  const sql = dbQuery();
  const authUserId = randomUUID();
  const email = options.email ?? `${randomUUID()}@example.com`;

  const [user] = await sql`
    INSERT INTO users (auth_user_id, email, full_name, status)
    VALUES (${authUserId}, ${email}, 'Test User', 'active')
    RETURNING id
  `;
  const [org] = await sql`
    INSERT INTO organizations (name, slug, status)
    VALUES (${'Test Org ' + randomUUID()}, ${options.orgSlug ?? randomUUID()}, 'active')
    RETURNING id
  `;
  if (!user || !org) throw new Error('seedActor insert failed');
  await sql`
    INSERT INTO organization_memberships (organization_id, user_id, role, status)
    VALUES (${org.id}, ${user.id}, ${options.role ?? 'practice_owner'}, 'active')
  `;
  return {
    userId: user.id as string,
    authUserId,
    organizationId: org.id as string,
  };
}

export async function cleanupTestData(ids: {
  userIds?: string[];
  orgIds?: string[];
}): Promise<void> {
  const sql = dbQuery();
  for (const userId of ids.userIds ?? []) {
    await sql`DELETE FROM organization_memberships WHERE user_id = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;
  }
  for (const orgId of ids.orgIds ?? []) {
    await sql`DELETE FROM organization_memberships WHERE organization_id = ${orgId}`;
    await sql`DELETE FROM organizations WHERE id = ${orgId}`;
  }
}
