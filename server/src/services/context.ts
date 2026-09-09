import type { FastifyRequest } from 'fastify';
import { withTenant, type Tx } from '../db/client.js';
import {
  findAssignmentRole,
  findClient,
  type ClientWithAssignments,
} from '../repositories/clientRepository.js';
import {
  canViewClient,
  canEditClient,
  canCreatePlan,
  canArchiveClient,
  canDeleteClient,
  canExportReport,
  canViewReports,
  canCreateScenario,
  canManageDocuments,
  canManageTeam,
} from '../permissions/policies.js';
import type { OrganizationMembership } from '../db/schema.js';

const asMembership = (role: string): { role: OrganizationMembership['role'] } => ({
  role: role as OrganizationMembership['role'],
});
import { errors, type ErrorCode } from '../http/errors.js';

/**
 * Shared route/service glue: request-scoped audit fields, the tenant
 * transaction wrapper, and the client-access guard used by every
 * client-scoped route (IDOR protection: cross-tenant ids 404 via the
 * organization_id filter; in-org rows without permission → 403
 * CLIENT_ACCESS_DENIED per the spec's error contract).
 */

export function auditFields(request: FastifyRequest): {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
} {
  return {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
    requestId: request.requestId,
  };
}

export interface MembershipCtx {
  organizationId: string;
  userId: string;
  role: string;
}

export function membershipCtx(request: FastifyRequest): MembershipCtx {
  return {
    organizationId: request.membership.organizationId,
    userId: request.actor.userId,
    role: request.membership.role,
  };
}

/** Run fn in a withTenant transaction derived from the request membership. */
export function inTenant<T>(
  request: FastifyRequest,
  fn: (tx: Tx, ctx: MembershipCtx) => Promise<T>,
): Promise<T> {
  const ctx = membershipCtx(request);
  return withTenant(ctx.organizationId, ctx.userId, ctx.role, (tx) => fn(tx, ctx));
}

export interface ClientAccess {
  client: ClientWithAssignments;
  assignmentRole: ReturnType<typeof findAssignmentRole> extends Promise<infer R> ? R : never;
}

export async function loadClientAccess(
  tx: Tx,
  ctx: MembershipCtx,
  clientId: string,
): Promise<{ client: Awaited<ReturnType<typeof findClient>>; assignmentRole: import('../db/schema.js').AssignmentRole | null }> {
  const client = await findClient(tx, ctx.organizationId, clientId);
  const assignmentRole = await findAssignmentRole(tx, clientId, ctx.userId);
  return { client, assignmentRole };
}

export function guardView(
  ctx: MembershipCtx,
  assignmentRole: import('../db/schema.js').AssignmentRole | null,
): void {
  if (!canViewClient(asMembership(ctx.role), assignmentRole)) {
    throw errors.clientAccessDenied();
  }
}

export function guardEdit(
  ctx: MembershipCtx,
  assignmentRole: import('../db/schema.js').AssignmentRole | null,
): void {
  if (!canEditClient(asMembership(ctx.role), assignmentRole)) {
    throw errors.clientAccessDenied();
  }
}

export const guards = {
  view: guardView,
  edit: guardEdit,
  createPlan: (ctx: MembershipCtx, a: import('../db/schema.js').AssignmentRole | null) => {
    if (!canCreatePlan(asMembership(ctx.role), a)) throw errors.clientAccessDenied();
  },
  archive: (ctx: MembershipCtx, a: import('../db/schema.js').AssignmentRole | null) => {
    if (!canArchiveClient(asMembership(ctx.role), a)) throw errors.clientAccessDenied();
  },
  delete: (ctx: MembershipCtx) => {
    if (!canDeleteClient(asMembership(ctx.role))) throw errors.clientAccessDenied();
  },
  export: (ctx: MembershipCtx, a: import('../db/schema.js').AssignmentRole | null) => {
    if (!canExportReport(asMembership(ctx.role), a)) throw errors.clientAccessDenied();
  },
  viewReports: (ctx: MembershipCtx, a: import('../db/schema.js').AssignmentRole | null) => {
    if (!canViewReports(asMembership(ctx.role), a)) throw errors.clientAccessDenied();
  },
  createScenario: (ctx: MembershipCtx, a: import('../db/schema.js').AssignmentRole | null) => {
    if (!canCreateScenario(asMembership(ctx.role), a)) throw errors.clientAccessDenied();
  },
  documents: (ctx: MembershipCtx, a: import('../db/schema.js').AssignmentRole | null) => {
    if (!canManageDocuments(asMembership(ctx.role), a)) throw errors.clientAccessDenied();
  },
  manageTeam: (ctx: MembershipCtx) => {
    if (!canManageTeam(asMembership(ctx.role))) {
      throw errors.orgAccessDenied();
    }
  },
};

export type { ErrorCode };
