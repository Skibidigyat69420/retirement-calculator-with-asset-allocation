import { randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { addHours } from '../lib/date.js';
import { inTenant, guards, auditFields } from '../services/context.js';
import {
  countActiveRole,
  deleteMembership,
  findInvitation,
  findMembership,
  findOrganization,
  insertInvitation,
  listInvitations,
  listMembers,
  updateInvitation,
  updateMembership,
  updateOrganization,
} from '../repositories/orgRepository.js';
import { sha256 } from '../services/invitationService.js';
import { requireRole } from '../tenancy/plugin.js';
import { ApiError } from '../http/errors.js';
import { auditService, redact } from '../audit/service.js';

/**
 * Team / membership / invitation routes (spec §131).
 */

const patchOrgSchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    logoUrl: z.string().url().nullable().optional(),
    website: z.string().url().nullable().optional(),
    brandPrimary: z.string().nullable().optional(),
    brandSecondary: z.string().nullable().optional(),
    settings: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'No fields to update.' });

const memberPatchSchema = z.object({
  role: z
    .enum(['platform_admin', 'practice_owner', 'practice_admin', 'wealth_practitioner', 'associate', 'read_only'])
    .optional(),
  status: z.enum(['active', 'suspended', 'deactivated']).optional(),
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['practice_admin', 'wealth_practitioner', 'associate', 'read_only']),
});

function orgRow(o: { id: string; name: string; slug: string; logoUrl: string | null; website: string | null; brandPrimary: string | null; brandSecondary: string | null; status: string; planTier: string; settings: unknown; createdAt: string; updatedAt: string }) {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    logoUrl: o.logoUrl,
    website: o.website,
    brandPrimary: o.brandPrimary,
    brandSecondary: o.brandSecondary,
    status: o.status,
    planTier: o.planTier,
    settings: o.settings,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  };
}

export default async function organizationRoutes(app: FastifyInstance): Promise<void> {
  app.get('/organizations/current', async (request) => {
    return inTenant(request, async (tx, ctx) => {
      const org = await findOrganization(tx, ctx.organizationId);
      return orgRow(org);
    });
  });

  app.patch('/organizations/current', { preHandler: requireRole('practice_owner', 'practice_admin') }, async (request, reply) => {
    const body = patchOrgSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      guards.manageTeam(ctx);
      const org = await updateOrganization(tx, ctx.organizationId, body);
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'ORGANIZATION_UPDATED',
        resourceType: 'organization',
        resourceId: ctx.organizationId,
        metadata: redact({ before: undefined, patch: body }),
        ...auditFields(request),
      });
      return orgRow(org);
    });
  });

  app.get('/organizations/current/members', { preHandler: requireRole('practice_owner', 'practice_admin') }, async (request) => {
    return inTenant(request, async (tx, ctx) => {
      guards.manageTeam(ctx);
      const members = await listMembers(tx, ctx.organizationId);
      return { data: members };
    });
  });

  app.patch('/organizations/current/members/:userId', { preHandler: requireRole('practice_owner', 'practice_admin') }, async (request) => {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
    const body = memberPatchSchema.parse(request.body ?? {});
    if (Object.keys(body).length === 0) throw new ApiError(400, 'VALIDATION_ERROR', 'No fields to update.');
    return inTenant(request, async (tx, ctx) => {
      guards.manageTeam(ctx);
      const target = await findMembership(tx, ctx.organizationId, userId);
      // practice_admin cannot modify a practice_owner (spec §131).
      if (ctx.role === 'practice_admin' && target.role === 'practice_owner') {
        throw new ApiError(403, 'ORG_ACCESS_DENIED', 'practice_admin cannot modify a practice_owner.');
      }
      const membership = await updateMembership(tx, ctx.organizationId, userId, body);
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'MEMBERSHIP_UPDATED',
        resourceType: 'user',
        resourceId: userId,
        metadata: redact({ before: { role: target.role, status: target.status }, after: body }),
        ...auditFields(request),
      });
      return membership;
    });
  });

  app.delete('/organizations/current/members/:userId', { preHandler: requireRole('practice_owner', 'practice_admin') }, async (request, reply) => {
    const { userId } = z.object({ userId: z.string().uuid() }).parse(request.params);
    await inTenant(request, async (tx, ctx) => {
      guards.manageTeam(ctx);
      const target = await findMembership(tx, ctx.organizationId, userId);
      if (ctx.role === 'practice_admin' && target.role === 'practice_owner') {
        throw new ApiError(403, 'ORG_ACCESS_DENIED', 'practice_admin cannot remove a practice_owner.');
      }
      // Refuse to remove the last active practice_owner / platform_admin.
      if (target.role === 'practice_owner' || target.role === 'platform_admin') {
        const remaining = await countActiveRole(tx, ctx.organizationId, target.role);
        if (remaining <= 1) {
          throw new ApiError(409, 'LAST_OWNER', `Cannot remove the last ${target.role} of the organization.`);
        }
      }
      await deleteMembership(tx, ctx.organizationId, userId);
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'MEMBER_REMOVED',
        resourceType: 'user',
        resourceId: userId,
        metadata: redact({ removedRole: target.role }),
        ...auditFields(request),
      });
    });
    return reply.status(204).send();
  });

  app.post('/organizations/current/invitations', { preHandler: requireRole('practice_owner', 'practice_admin') }, async (request, reply) => {
    const body = inviteSchema.parse(request.body ?? {});
    return inTenant(request, async (tx, ctx) => {
      guards.manageTeam(ctx);
      // 32 random bytes, base64url — returned ONCE, only sha256 stored.
      const token = randomBytes(32).toString('base64url');
      const expiresAt = addHours(new Date(), 72).toISOString();
      const invitation = await insertInvitation(tx, {
        organizationId: ctx.organizationId,
        email: body.email,
        role: body.role,
        tokenHash: sha256(token),
        invitedBy: ctx.userId,
        status: 'pending',
        expiresAt,
      });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'INVITATION_CREATED',
        resourceType: 'invitation',
        resourceId: invitation.id,
        metadata: redact({ email: body.email, role: body.role, expiresAt }),
        ...auditFields(request),
      });
      return reply.status(201).send({
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        token,
      });
    });
  });

  app.get('/organizations/current/invitations', { preHandler: requireRole('practice_owner', 'practice_admin') }, async (request) => {
    return inTenant(request, async (tx, ctx) => {
      guards.manageTeam(ctx);
      const invitations = await listInvitations(tx, ctx.organizationId);
      return {
        data: invitations.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          status: i.status,
          expiresAt: i.expiresAt,
          acceptedAt: i.acceptedAt,
          createdAt: i.createdAt,
        })),
      };
    });
  });

  app.post('/organizations/current/invitations/:id/revoke', { preHandler: requireRole('practice_owner', 'practice_admin') }, async (request) => {
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    return inTenant(request, async (tx, ctx) => {
      guards.manageTeam(ctx);
      const invitation = await findInvitation(tx, ctx.organizationId, id);
      if (invitation.status !== 'pending') {
        throw new ApiError(409, 'INVALID_STATE', `Invitation is ${invitation.status}.`);
      }
      const revoked = await updateInvitation(tx, id, { status: 'revoked' });
      await auditService.log({
        organizationId: ctx.organizationId,
        actorUserId: ctx.userId,
        action: 'INVITATION_REVOKED',
        resourceType: 'invitation',
        resourceId: id,
        metadata: redact({ email: invitation.email }),
        ...auditFields(request),
      });
      return { id: revoked.id, status: revoked.status };
    });
  });
}
