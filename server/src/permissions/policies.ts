import type { OrganizationMembership, AssignmentRole } from '../db/schema.js';

/**
 * Authorization matrix (spec §41).
 *
 * Role ordering:
 *   platform_admin > practice_owner > practice_admin >
 *   wealth_practitioner > associate > read_only
 *
 * Semantics:
 *  - platform_admin: effectively everything in org (billing/org deletion live
 *    outside this API; treat as full access here).
 *  - practice_owner: everything in org.
 *  - practice_admin: everything except org deletion / billing (n/a here) — so
 *    everything in this matrix except deleting clients.
 *  - wealth_practitioner: full client/plan/scenario/report work for ASSIGNED
 *    clients. Assignment role governs scope: primary/secondary → full edit;
 *    associate → edit financial profile (assets/goals) but no report export;
 *    viewer → read-only. On UNASSIGNED clients in their org: read-only.
 *  - associate: edit financial profile + goals, read plans, no export, no archive.
 *  - read_only: read everything in the org, nothing else.
 *
 * All can* functions take the caller's org membership and, for client-scope
 * checks, the optional assignmentRole for that client (null = unassigned).
 */

const ROLE_ORDER: readonly string[] = [
  'platform_admin',
  'practice_owner',
  'practice_admin',
  'wealth_practitioner',
  'associate',
  'read_only',
];

export function roleAtLeast(role: string, minimum: string): boolean {
  const r = ROLE_ORDER.indexOf(role);
  const m = ROLE_ORDER.indexOf(minimum);
  return r !== -1 && m !== -1 && r <= m;
}

interface MembershipLike {
  role: OrganizationMembership['role'];
  status?: string;
}

export function canViewClient(
  membership: MembershipLike,
  assignmentRole?: AssignmentRole | null,
): boolean {
  const role = membership.role;
  if (role === 'platform_admin' || role === 'practice_owner') return true;
  if (roleAtLeast(role, 'practice_admin')) return true; // practice_admin
  if (role === 'read_only') return true;
  if (role === 'associate') return true;
  // wealth_practitioner: assigned clients are viewable regardless of
  // assignment role; unassigned clients in their org are read-only viewable.
  return true;
}

export function canEditClient(
  membership: MembershipLike,
  assignmentRole?: AssignmentRole | null,
): boolean {
  const role = membership.role;
  if (role === 'platform_admin' || role === 'practice_owner') return true;
  if (roleAtLeast(role, 'practice_admin')) return true;
  if (role === 'associate') return assignmentRole === 'associate';
  if (role === 'read_only') return false;
  // wealth_practitioner
  if (!assignmentRole) return false; // unassigned → read-only
  return assignmentRole !== 'viewer';
}

export function canCreatePlan(
  membership: MembershipLike,
  assignmentRole?: AssignmentRole | null,
): boolean {
  const role = membership.role;
  if (role === 'platform_admin' || role === 'practice_owner') return true;
  if (roleAtLeast(role, 'practice_admin')) return true;
  if (role === 'associate' || role === 'read_only') return false;
  // wealth_practitioner: primary/secondary assignments can create plans;
  // associate/viewer assignments cannot.
  return assignmentRole === 'primary' || assignmentRole === 'secondary';
}

export function canArchiveClient(
  membership: MembershipLike,
  assignmentRole?: AssignmentRole | null,
): boolean {
  const role = membership.role;
  if (role === 'platform_admin' || role === 'practice_owner') return true;
  if (roleAtLeast(role, 'practice_admin')) return true;
  // wealth_practitioner: only primary assignment; associate/read_only: never.
  return role === 'wealth_practitioner' && assignmentRole === 'primary';
}

export function canDeleteClient(membership: MembershipLike): boolean {
  // Only platform_admin and practice_owner may hard-delete clients.
  const role = membership.role;
  return role === 'platform_admin' || role === 'practice_owner';
}

/**
 * Client creation is not client-scoped (the creator becomes the primary
 * assignment), so it is gated on the org role alone: leadership and
 * practitioners onboard clients; associate (financial-profile editing only)
 * and read_only (read everything, write nothing) cannot.
 */
export function canCreateClient(membership: MembershipLike): boolean {
  const role = membership.role;
  if (role === 'platform_admin' || role === 'practice_owner') return true;
  if (roleAtLeast(role, 'practice_admin')) return true;
  return role === 'wealth_practitioner';
}

export function canManageTeam(membership: MembershipLike): boolean {
  const role = membership.role;
  return (
    role === 'platform_admin' ||
    role === 'practice_owner' ||
    roleAtLeast(role, 'practice_admin')
  );
}

export function canExportReport(
  membership: MembershipLike,
  assignmentRole?: AssignmentRole | null,
): boolean {
  const role = membership.role;
  if (role === 'platform_admin' || role === 'practice_owner') return true;
  if (roleAtLeast(role, 'practice_admin')) return true;
  if (role === 'associate' || role === 'read_only') return false;
  // wealth_practitioner: export only on primary/secondary assignments.
  return assignmentRole === 'primary' || assignmentRole === 'secondary';
}

export function canViewReports(
  membership: MembershipLike,
  assignmentRole?: AssignmentRole | null,
): boolean {
  // Anyone who can view the client can view its reports.
  return canViewClient(membership, assignmentRole);
}

export function canManageDocuments(
  membership: MembershipLike,
  assignmentRole?: AssignmentRole | null,
): boolean {
  // Same gate as editing the client.
  return canEditClient(membership, assignmentRole);
}

export function canCreateScenario(
  membership: MembershipLike,
  assignmentRole?: AssignmentRole | null,
): boolean {
  const role = membership.role;
  if (role === 'platform_admin' || role === 'practice_owner') return true;
  if (roleAtLeast(role, 'practice_admin')) return true;
  if (role === 'associate' || role === 'read_only') return false;
  return assignmentRole === 'primary' || assignmentRole === 'secondary';
}

export function canApplyRecommendation(
  membership: MembershipLike,
  assignmentRole?: AssignmentRole | null,
): boolean {
  const role = membership.role;
  if (role === 'platform_admin' || role === 'practice_owner') return true;
  if (roleAtLeast(role, 'practice_admin')) return true;
  if (role === 'associate' || role === 'read_only') return false;
  // wealth_practitioner: applying recommendations modifies the plan — same
  // gate as creating scenarios/plans.
  return assignmentRole === 'primary' || assignmentRole === 'secondary';
}
