import { and, desc, eq } from 'drizzle-orm';
import type { Tx } from '../db/client.js';
import {
  invitations,
  organizationMemberships,
  organizations,
  users,
  type Invitation,
  type Organization,
  type OrganizationMembership,
  type User,
} from '../db/schema.js';
import { ApiError } from '../http/errors.js';

/**
 * Organization / membership / invitation / user repository.
 * Tenant-aware via explicit organization_id filters in withTenant txns.
 */

export async function findOrganization(
  tx: Tx,
  organizationId: string,
): Promise<Organization> {
  const row = await tx
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Organization not found.');
  return row;
}

export async function updateOrganization(
  tx: Tx,
  organizationId: string,
  patch: Partial<typeof organizations.$inferInsert>,
): Promise<Organization> {
  const row = await tx
    .update(organizations)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(eq(organizations.id, organizationId))
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Organization not found.');
  return row;
}

export interface MemberRow {
  userId: string;
  email: string;
  fullName: string | null;
  role: OrganizationMembership['role'];
  status: string;
  invitedBy: string | null;
  createdAt: string;
}

export async function listMembers(
  tx: Tx,
  organizationId: string,
): Promise<MemberRow[]> {
  return tx
    .select({
      userId: organizationMemberships.userId,
      email: users.email,
      fullName: users.fullName,
      role: organizationMemberships.role,
      status: organizationMemberships.status,
      invitedBy: organizationMemberships.invitedBy,
      createdAt: organizationMemberships.createdAt,
    })
    .from(organizationMemberships)
    .innerJoin(users, eq(users.id, organizationMemberships.userId))
    .where(eq(organizationMemberships.organizationId, organizationId))
    .orderBy(desc(organizationMemberships.createdAt));
}

export async function findMembership(
  tx: Tx,
  organizationId: string,
  userId: string,
): Promise<OrganizationMembership> {
  const row = await tx
    .select()
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, userId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Membership not found.');
  return row;
}

export async function updateMembership(
  tx: Tx,
  organizationId: string,
  userId: string,
  patch: Partial<Pick<typeof organizationMemberships.$inferInsert, 'role' | 'status'>>,
): Promise<OrganizationMembership> {
  const row = await tx
    .update(organizationMemberships)
    .set({ ...patch, updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, userId),
      ),
    )
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Membership not found.');
  return row;
}

export async function deleteMembership(
  tx: Tx,
  organizationId: string,
  userId: string,
): Promise<void> {
  const res = await tx
    .delete(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.userId, userId),
      ),
    )
    .returning({ id: organizationMemberships.id });
  if (res.length === 0) throw new ApiError(404, 'NOT_FOUND', 'Membership not found.');
}

/** Count active members holding a given role (last-owner guard). */
export async function countActiveRole(
  tx: Tx,
  organizationId: string,
  role: string,
): Promise<number> {
  const { sql } = await import('drizzle-orm');
  const row = await tx
    .select({ n: sql<string>`count(*)::text` })
    .from(organizationMemberships)
    .where(
      and(
        eq(organizationMemberships.organizationId, organizationId),
        eq(organizationMemberships.role, role as typeof organizationMemberships.role._.data),
        eq(organizationMemberships.status, 'active'),
      ),
    )
    .then((rows) => rows[0]);
  return Number(row?.n ?? 0);
}

// -------------------------------------------------------------- invitations

export async function findInvitationByHash(
  tx: Tx,
  tokenHash: string,
): Promise<Invitation | null> {
  return tx
    .select()
    .from(invitations)
    .where(eq(invitations.tokenHash, tokenHash))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export async function findInvitation(
  tx: Tx,
  organizationId: string,
  invitationId: string,
): Promise<Invitation> {
  const row = await tx
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.organizationId, organizationId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found.');
  return row;
}

export async function listInvitations(
  tx: Tx,
  organizationId: string,
): Promise<Invitation[]> {
  return tx
    .select()
    .from(invitations)
    .where(eq(invitations.organizationId, organizationId))
    .orderBy(desc(invitations.createdAt));
}

export async function insertInvitation(
  tx: Tx,
  values: typeof invitations.$inferInsert,
): Promise<Invitation> {
  const row = await tx.insert(invitations).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'Invitation insert failed.');
  return row;
}

export async function updateInvitation(
  tx: Tx,
  invitationId: string,
  patch: Partial<typeof invitations.$inferInsert>,
): Promise<Invitation> {
  const row = await tx
    .update(invitations)
    .set({ ...patch })
    .where(eq(invitations.id, invitationId))
    .returning()
    .then((r) => r[0]);
  if (!row) throw new ApiError(404, 'NOT_FOUND', 'Invitation not found.');
  return row;
}

// -------------------------------------------------------------------- users

export async function findUserByEmail(tx: Tx, email: string): Promise<User | null> {
  return tx
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

export async function insertUser(
  tx: Tx,
  values: typeof users.$inferInsert,
): Promise<User> {
  const row = await tx.insert(users).values(values).returning().then((r) => r[0]);
  if (!row) throw new ApiError(500, 'INTERNAL_ERROR', 'User insert failed.');
  return row;
}

export interface MembershipWithOrg {
  organizationId: string;
  role: string;
  status: string;
  organizationName: string;
  organizationSlug: string;
}

/** All memberships of a user across orgs (org switcher, spec §37). */
export async function listMembershipsForUser(
  tx: Tx,
  userId: string,
): Promise<MembershipWithOrg[]> {
  return tx
    .select({
      organizationId: organizationMemberships.organizationId,
      role: organizationMemberships.role,
      status: organizationMemberships.status,
      organizationName: organizations.name,
      organizationSlug: organizations.slug,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(eq(organizationMemberships.userId, userId));
}
