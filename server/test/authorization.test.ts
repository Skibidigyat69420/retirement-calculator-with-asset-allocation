import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { setupMigratedDb, testDbUrl } from './migratedDb.js';

/**
 * Authorization matrix (spec §149) — the executable spec for
 * src/permissions/policies.ts. Read that file first: every expectation
 * below is derived from the can* functions there (canViewClient,
 * canEditClient, canCreateClient, canArchiveClient, canDeleteClient,
 * canExportReport, canManageTeam) plus the requireRole gates on the
 * team-management routes in src/routes/organizations.ts.
 *
 * Error contract:
 *  - client-scope denials  → 403 CLIENT_ACCESS_DENIED
 *  - org/team-scope denials → 403 ORG_ACCESS_DENIED
 *  - cross/in-org missing rows → 404 (not used here; see tenancyIsolation)
 *
 * Roles under test (one org, membership per user):
 *   owner       practice_owner
 *   admin       practice_admin
 *   wp1         wealth_practitioner, PRIMARY-assigned to clientX
 *   wp2         wealth_practitioner, UNASSIGNED (org-wide read check)
 *   associate   associate, assigned to clientX with assignmentRole 'associate'
 *   readOnly    read_only
 *
 * Expected matrix (clientX = wp1 primary + associate associate-assigned):
 *
 *   operation                    owner  admin  wp1   wp2   assoc readOnly
 *   create client (POST)          201    201   201   201   403    403
 *   read client (GET)             200    200   200   200   200    200
 *   update client (PATCH)         200    200   200   403   200    403
 *   archive client (POST)         200    200   200   403   403    403
 *   export client (GET export)    200    200   200   403   403    403
 *   manage team (GET members)     200    200   403   403   403    403
 *   delete client (DELETE)        204    403   403   403   403    403
 *
 * (practice_admin CANNOT delete a client — only owner/platform_admin per
 * canDeleteClient; verified here against the live implementation.)
 */

process.env['DATABASE_URL'] = testDbUrl();
process.env['TEST_BOOTSTRAP'] = '0';

const { bootTestApp, makeJwt } = await import('./helpers.js');
const {
  insertUser,
  insertOrg,
  insertMembership,
  insertClient,
  insertAssignment,
  purgeTestOrg,
} = await import('./seedUtils.js');

const API = '/api/v1';

let app: Awaited<ReturnType<typeof bootTestApp>>['app'];
let close: () => Promise<void>;

let orgId: string;
let clientX: string;
let clientY: string;
let clientDel: string;
const createdClientIds: string[] = [];

const users: Record<string, { id: string; authUserId: string; token: string }> = {};
const orgIds: string[] = [];
const userIds: string[] = [];
const staticClientIds: string[] = [];

async function req(
  roleKey: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  url: string,
  payload?: Record<string, unknown>,
) {
  return app.inject({
    method,
    url,
    headers: {
      authorization: `Bearer ${users[roleKey]!.token}`,
      'x-organization-id': orgId,
    },
    payload,
  });
}

beforeAll(async () => {
  await setupMigratedDb();
  ({ app, close } = await bootTestApp());

  orgId = (await insertOrg('AuthZ Org')).id;
  orgIds.push(orgId);

  for (const [key, role] of [
    ['owner', 'practice_owner'],
    ['admin', 'practice_admin'],
    ['wp1', 'wealth_practitioner'],
    ['wp2', 'wealth_practitioner'],
    ['associate', 'associate'],
    ['readOnly', 'read_only'],
  ] as const) {
    const u = await insertUser();
    await insertMembership(orgId, u.id, role);
    users[key] = { ...u, token: await makeJwt({ sub: u.authUserId, aud: 'dev' }) };
    userIds.push(u.id);
  }

  // clientX: wp1 primary, associate as 'associate' assignment.
  clientX = (await insertClient(orgId, { firstName: 'Matrix', lastName: 'X' })).id;
  staticClientIds.push(clientX);
  await insertAssignment(clientX, users['wp1']!.id, 'primary');
  await insertAssignment(clientX, users['associate']!.id, 'associate');

  // clientY: wp1 primary, associate NOT assigned (unassigned-edit check).
  clientY = (await insertClient(orgId, { firstName: 'Matrix', lastName: 'Y' })).id;
  staticClientIds.push(clientY);
  await insertAssignment(clientY, users['wp1']!.id, 'primary');

  // clientDel: delete-matrix target (owner deletes it for real at the end).
  clientDel = (await insertClient(orgId, { firstName: 'Matrix', lastName: 'Del' })).id;
  staticClientIds.push(clientDel);
});

afterAll(async () => {
  await purgeTestOrg(orgIds, userIds, [...staticClientIds, ...createdClientIds]);
  await close?.();
});

describe('create client (canCreateClient)', () => {
  // canCreateClient: owner/admin/wps yes; associate/read_only no.
  it.each([
    ['owner', 201],
    ['admin', 201],
    ['wp1', 201],
    ['wp2', 201],
    ['associate', 403],
    ['readOnly', 403],
  ] as const)('%s POST /clients → %i', async (roleKey, expected) => {
    const res = await req(roleKey, 'POST', `${API}/clients`, {
      firstName: 'Created',
      lastName: `By ${roleKey}`,
    });
    expect(res.statusCode).toBe(expected);
    if (expected === 201) {
      expect(res.json().starterPlanId).toBeTruthy();
      createdClientIds.push(res.json().id);
    } else {
      expect(res.json().error.code).toBe('CLIENT_ACCESS_DENIED');
    }
  });
});

describe('read client (canViewClient — org-wide for every role)', () => {
  it.each([
    ['owner', 200],
    ['admin', 200],
    ['wp1', 200],
    ['wp2', 200], // unassigned practitioner: org-wide read
    ['associate', 200],
    ['readOnly', 200],
  ] as const)('%s GET /clients/:id → %i', async (roleKey, expected) => {
    const res = await req(roleKey, 'GET', `${API}/clients/${clientX}`);
    expect(res.statusCode).toBe(expected);
  });
});

describe('update client (canEditClient)', () => {
  // canEditClient: owner/admin always; wp with assignment; associate only
  // with assignmentRole 'associate'/'primary'/'secondary' on THAT client;
  // read_only never; unassigned wp never.
  it.each([
    ['owner', 200],
    ['admin', 200],
    ['wp1', 200],
    ['wp2', 403],
    ['associate', 200],
    ['readOnly', 403],
  ] as const)('%s PATCH /clients/:id → %i', async (roleKey, expected) => {
    const res = await req(roleKey, 'PATCH', `${API}/clients/${clientX}`, {
      notes: `patched by ${roleKey}`,
    });
    expect(res.statusCode).toBe(expected);
    if (expected === 403) expect(res.json().error.code).toBe('CLIENT_ACCESS_DENIED');
  });

  it('associate CANNOT edit a client they are not assigned to', async () => {
    const res = await req('associate', 'PATCH', `${API}/clients/${clientY}`, { notes: 'x' });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('CLIENT_ACCESS_DENIED');
  });
});

describe('associate on an assigned client: edit assets yes, export no', () => {
  it('assigned associate CAN create an asset (financial profile work)', async () => {
    const res = await req('associate', 'POST', `${API}/clients/${clientX}/assets`, {
      name: 'Associate Asset',
      assetType: 'equity',
      assetCategory: 'equity',
    });
    expect(res.statusCode).toBe(201);
  });

  it('assigned associate CANNOT export the client', async () => {
    const res = await req('associate', 'GET', `${API}/clients/${clientX}/export`);
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('CLIENT_ACCESS_DENIED');
  });
});

describe('archive client (canArchiveClient)', () => {
  // canArchiveClient: owner/admin always; wp only with PRIMARY assignment.
  it.each([
    ['owner', 200],
    ['wp1', 200],
  ] as const)('%s (primary) POST /clients/:id/archive → %i', async (roleKey, expected) => {
    const res = await req(roleKey, 'POST', `${API}/clients/${clientX}/archive`);
    expect(res.statusCode).toBe(expected);
  });

  it.each([
    ['admin', 200],
    ['wp2', 403],
    ['associate', 403],
    ['readOnly', 403],
  ] as const)('%s POST /clients/:id/archive → %i', async (roleKey, expected) => {
    // archive is idempotent w.r.t. status; run it against clientY so the
    // 403/200 mix does not depend on prior state, then restore.
    const res = await req(roleKey, 'POST', `${API}/clients/${clientY}/archive`);
    expect(res.statusCode).toBe(expected);
    if (expected === 403) expect(res.json().error.code).toBe('CLIENT_ACCESS_DENIED');
    await req('owner', 'POST', `${API}/clients/${clientY}/unarchive`);
  });
});

describe('export client (canExportReport)', () => {
  // canExportReport: owner/admin always; wp on primary/secondary;
  // associate and read_only never.
  it.each([
    ['owner', 200],
    ['admin', 200],
    ['wp1', 200],
    ['wp2', 403],
    ['associate', 403],
    ['readOnly', 403],
  ] as const)('%s GET /clients/:id/export → %i', async (roleKey, expected) => {
    const res = await req(roleKey, 'GET', `${API}/clients/${clientX}/export`);
    expect(res.statusCode).toBe(expected);
    if (expected === 403) expect(res.json().error.code).toBe('CLIENT_ACCESS_DENIED');
  });
});

describe('manage team (canManageTeam / requireRole)', () => {
  // canManageTeam: platform_admin, practice_owner, practice_admin.
  it.each([
    ['owner', 200],
    ['admin', 200],
    ['wp1', 403],
    ['wp2', 403],
    ['associate', 403],
    ['readOnly', 403],
  ] as const)('%s GET /organizations/current/members → %i', async (roleKey, expected) => {
    const res = await req(roleKey, 'GET', `${API}/organizations/current/members`);
    expect(res.statusCode).toBe(expected);
    if (expected === 403) expect(res.json().error.code).toBe('ORG_ACCESS_DENIED');
  });
});

describe('delete client (canDeleteClient — owner only, NOT admin)', () => {
  // canDeleteClient: platform_admin and practice_owner ONLY. If
  // practice_admin could delete, that would be a policy bug (reported, not
  // encoded here).
  it.each([
    ['admin', 403],
    ['wp1', 403],
    ['wp2', 403],
    ['associate', 403],
    ['readOnly', 403],
  ] as const)('%s DELETE /clients/:id → %i', async (roleKey, expected) => {
    const res = await req(roleKey, 'DELETE', `${API}/clients/${clientDel}`);
    expect(res.statusCode).toBe(expected);
    expect(res.json().error.code).toBe('CLIENT_ACCESS_DENIED');
  });

  it('denied roles left the row intact; owner DELETE → 204', async () => {
    const stillThere = await req('owner', 'GET', `${API}/clients/${clientDel}`);
    expect(stillThere.statusCode).toBe(200);

    const res = await req('owner', 'DELETE', `${API}/clients/${clientDel}`);
    expect(res.statusCode).toBe(204);
  });
});

describe('invitations (canManageTeam gate on invitations route)', () => {
  it('practice_admin can create an invitation → 201', async () => {
    const res = await req('admin', 'POST', `${API}/organizations/current/invitations`, {
      email: `invite-${randomUUID()}@example.com`,
      role: 'read_only',
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().token).toBeTruthy();
  });

  it('associate cannot create an invitation → 403 ORG_ACCESS_DENIED', async () => {
    const res = await req('associate', 'POST', `${API}/organizations/current/invitations`, {
      email: `invite-${randomUUID()}@example.com`,
      role: 'read_only',
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('ORG_ACCESS_DENIED');
  });
});

describe('membership role changes', () => {
  it('practitioner cannot change the practice_owner role → 403 ORG_ACCESS_DENIED', async () => {
    const res = await req('wp1', 'PATCH', `${API}/organizations/current/members/${users['owner']!.id}`, {
      role: 'read_only',
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('ORG_ACCESS_DENIED');
  });

  it('practice_admin also cannot modify a practice_owner → 403 ORG_ACCESS_DENIED', async () => {
    const res = await req('admin', 'PATCH', `${API}/organizations/current/members/${users['owner']!.id}`, {
      role: 'read_only',
    });
    expect(res.statusCode).toBe(403);
    expect(res.json().error.code).toBe('ORG_ACCESS_DENIED');
  });

  it('owner CAN change another member role → 200', async () => {
    const target = users['wp2']!.id;
    const res = await req('owner', 'PATCH', `${API}/organizations/current/members/${target}`, {
      role: 'associate',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().role).toBe('associate');
    // restore
    await req('owner', 'PATCH', `${API}/organizations/current/members/${target}`, {
      role: 'wealth_practitioner',
    });
  });
});
