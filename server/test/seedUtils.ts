import { randomUUID } from 'node:crypto';
import type postgres from 'postgres';

/**
 * Direct-SQL seeding helpers for the security suites. All rows are inserted
 * into the migrated `stw_test` database (see migratedDb.ts) with explicit
 * column lists so tests control exactly what exists — no hidden defaults.
 * Ids are generated here (crypto.randomUUID) so tests can reference them
 * without a round-trip.
 *
 * helpers.js is imported LAZILY inside every function: config.ts is a
 * module-level singleton that reads process.env.DATABASE_URL at import
 * time, and test files must set it (to testDbUrl()) before helpers — and
 * therefore src/config — is first evaluated.
 */

async function sql(): Promise<postgres.Sql> {
  const { dbQuery } = await import('./helpers.js');
  return dbQuery();
}

export async function insertUser(email?: string): Promise<{ id: string; authUserId: string }> {
  const id = randomUUID();
  const authUserId = randomUUID();
  await (await sql())`
    INSERT INTO users (id, auth_user_id, email, full_name, status)
    VALUES (${id}, ${authUserId}, ${email ?? `${randomUUID()}@example.com`}, 'Sec Test User', 'active')
  `;
  return { id, authUserId };
}

export async function insertOrg(name?: string): Promise<{ id: string }> {
  const id = randomUUID();
  await (await sql())`
    INSERT INTO organizations (id, name, slug, status)
    VALUES (${id}, ${name ?? `Sec Org ${id}`}, ${randomUUID()}, 'active')
  `;
  return { id };
}

export async function insertMembership(
  organizationId: string,
  userId: string,
  role: string,
): Promise<void> {
  await (await sql())`
    INSERT INTO organization_memberships (organization_id, user_id, role, status)
    VALUES (${organizationId}, ${userId}, ${role}, 'active')
  `;
}

export async function insertClient(
  organizationId: string,
  fields?: { firstName?: string; lastName?: string; email?: string; status?: string },
): Promise<{ id: string }> {
  const id = randomUUID();
  await (await sql())`
    INSERT INTO clients (id, organization_id, first_name, last_name, email, status)
    VALUES (
      ${id},
      ${organizationId},
      ${fields?.firstName ?? 'Sec'},
      ${fields?.lastName ?? `Client ${id}`},
      ${fields?.email ?? null},
      ${fields?.status ?? 'active'}
    )
  `;
  return { id };
}

export async function insertAssignment(
  clientId: string,
  userId: string,
  assignmentRole: 'primary' | 'secondary' | 'associate' | 'viewer',
): Promise<void> {
  await (await sql())`
    INSERT INTO client_assignments (client_id, user_id, assignment_role)
    VALUES (${clientId}, ${userId}, ${assignmentRole})
  `;
}

export async function insertPlan(
  organizationId: string,
  clientId: string,
  name = 'Master Plan',
): Promise<{ id: string }> {
  const id = randomUUID();
  await (await sql())`
    INSERT INTO retirement_plans (id, organization_id, client_id, name, status)
    VALUES (${id}, ${organizationId}, ${clientId}, ${name}, 'draft')
  `;
  return { id };
}

export async function insertNotification(
  organizationId: string,
  userId: string,
  title: string,
): Promise<{ id: string }> {
  const id = randomUUID();
  await (await sql())`
    INSERT INTO notifications (id, organization_id, user_id, type, title)
    VALUES (${id}, ${organizationId}, ${userId}, 'test', ${title})
  `;
  return { id };
}

export async function insertAsset(
  organizationId: string,
  clientId: string,
  name = 'Sec Asset',
): Promise<{ id: string }> {
  const id = randomUUID();
  await (await sql())`
    INSERT INTO assets (id, organization_id, client_id, name, asset_type, asset_category, current_value)
    VALUES (${id}, ${organizationId}, ${clientId}, ${name}, 'equity', 'equity', 1000)
  `;
  return { id };
}

export async function insertReport(
  organizationId: string,
  clientId: string,
  fields?: { reportType?: string; idempotencyKey?: string },
): Promise<{ id: string }> {
  const id = randomUUID();
  await (await sql())`
    INSERT INTO reports (id, organization_id, client_id, report_type, status, idempotency_key)
    VALUES (
      ${id},
      ${organizationId},
      ${clientId},
      ${fields?.reportType ?? 'full_plan'},
      'queued',
      ${fields?.idempotencyKey ?? null}
    )
  `;
  return { id };
}

/**
 * Best-effort row removal in FK-safe order. The app writes audit_logs
 * (actor_user_id → users, no cascade), so users/orgs can only be deleted
 * after org-scoped audit/client/invitation/membership rows are gone.
 */
export async function purgeTestOrg(
  orgIds: string[],
  userIds: string[],
  clientIds: string[],
): Promise<void> {
  const s = await sql();
  for (const orgId of orgIds) {
    await s`DELETE FROM audit_logs WHERE organization_id = ${orgId}`;
  }
  for (const id of clientIds) {
    await s`DELETE FROM clients WHERE id = ${id}`;
  }
  for (const orgId of orgIds) {
    await s`DELETE FROM invitations WHERE organization_id = ${orgId}`;
    await s`DELETE FROM organization_memberships WHERE organization_id = ${orgId}`;
  }
  for (const id of userIds) {
    await s`DELETE FROM users WHERE id = ${id}`;
  }
  for (const orgId of orgIds) {
    await s`DELETE FROM organizations WHERE id = ${orgId}`;
  }
}
