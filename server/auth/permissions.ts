/**
 * Role → permission matrix (spec §41). The backend is authoritative;
 * these helpers power the middleware and service-layer checks
 * (three layers: RLS → middleware requireRole → service can()).
 */
import type { Role } from './types.js';

export const PERMISSIONS = [
  'org.settings.manage',
  'org.billing.manage',
  'org.members.invite',
  'org.members.manage',       // change roles, suspend, remove
  'org.members.view',
  'clients.view',
  'clients.create',
  'clients.edit',
  'clients.archive',
  'clients.delete',           // permanent deletion — restricted (spec §134)
  'plans.create',
  'plans.edit',
  'plans.approve',
  'scenarios.run',
  'reports.view',
  'reports.generate',
  'reports.approve',
  'reports.export',
  'documents.manage',
  'tasks.manage',
  'audit.view',
  'integrations.manage',      // broker connections etc.
  'exports.run',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

type RolePermissions = Record<Role, ReadonlySet<Permission>>;

const all = (...p: Permission[]) => new Set<Permission>(p);

const CLIENT_ALL: Permission[] = [
  'clients.view', 'clients.create', 'clients.edit', 'clients.archive',
  'plans.create', 'plans.edit', 'plans.approve', 'scenarios.run',
  'reports.view', 'reports.generate', 'reports.approve', 'reports.export',
  'documents.manage', 'tasks.manage', 'exports.run',
];

const TEAM_VIEW: Permission[] = ['org.members.view'];

export const ROLE_PERMISSIONS: RolePermissions = {
  // platform_admin operates the platform, not any one practice's data.
  platform_admin: all(
    'org.members.view', 'audit.view', 'org.billing.manage',
  ),
  practice_owner: all(
    'org.settings.manage', 'org.billing.manage',
    'org.members.invite', 'org.members.manage', 'org.members.view',
    ...CLIENT_ALL, 'audit.view', 'integrations.manage', 'clients.delete',
  ),
  practice_admin: all(
    'org.settings.manage',
    'org.members.invite', 'org.members.manage', 'org.members.view',
    ...CLIENT_ALL, 'audit.view', 'integrations.manage',
  ),
  wealth_practitioner: all(...CLIENT_ALL, ...TEAM_VIEW, 'integrations.manage'),
  associate: all(
    'clients.view', 'plans.create', 'plans.edit', 'scenarios.run',
    'reports.view', 'reports.generate', 'documents.manage',
    'tasks.manage', ...TEAM_VIEW,
  ),
  read_only: all('clients.view', 'plans.create', 'reports.view', ...TEAM_VIEW),
};

/** Role precedence for "at least role X" checks inside a practice. */
const PRACTICE_RANK: Record<Exclude<Role, 'platform_admin'>, number> = {
  practice_owner: 100,
  practice_admin: 80,
  wealth_practitioner: 50,
  associate: 30,
  read_only: 10,
};

export function roleCan(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

/** True when `role` is strictly higher in the practice hierarchy than `minimum`. */
export function roleAtLeast(role: Role, minimum: Exclude<Role, 'platform_admin'>): boolean {
  if (role === 'platform_admin') return false; // platform role: no implicit practice power
  return PRACTICE_RANK[role] >= PRACTICE_RANK[minimum];
}

/** Whether members of `actorRole` may grant `targetRole` via invitation (spec §39). */
export function canInviteRole(actorRole: Role, targetRole: Role): boolean {
  if (actorRole === 'platform_admin') return true;
  if (targetRole === 'platform_admin') return false; // never invitable
  if (!roleAtLeast(actorRole, 'practice_admin')) return false;
  // Admins cannot create peers/superiors; owners can grant anything except platform_admin.
  if (actorRole === 'practice_admin') {
    return PRACTICE_RANK[targetRole as Exclude<Role, 'platform_admin'>] < PRACTICE_RANK.practice_admin;
  }
  return true; // practice_owner
}

/**
 * Spec §41 example policy functions, generalized to the membership role.
 * These operate on data the caller already tenant-scoped; RLS is the
 * final backstop.
 */
export const canManageTeam = (actorRole: Role): boolean => roleCan(actorRole, 'org.members.manage');
export const canExportReport = (actorRole: Role): boolean => roleCan(actorRole, 'reports.export');
