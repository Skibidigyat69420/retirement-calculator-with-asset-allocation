import { createHash } from 'node:crypto';
import { withSystem, type Tx } from '../db/client.js';
import {
  findInvitationByHash,
  findUserByEmail,
  insertUser,
  updateInvitation,
} from '../repositories/orgRepository.js';
import { auditLogs, organizationMemberships } from '../db/schema.js';
import { redact } from '../audit/service.js';
import { env } from '../config.js';
import { ApiError } from '../http/errors.js';
import { SignJWT } from 'jose';

/**
 * Invitation acceptance (spec §131, §37). PUBLIC route — runs in a single
 * withSystem transaction (the invitee has no membership yet, so no tenant
 * GUC can be set; RLS is bypassed deliberately for this system operation).
 *
 * DEV MODE ONLY user creation: in supabase mode user accounts are provisioned
 * by Supabase Auth (out of scope here) — this service creates the local
 * users row with auth_user_id NULL in dev mode.
 */

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export interface AcceptInvitationResult {
  user: { id: string; email: string; fullName: string | null };
  organization: { id: string; name: string };
  /** Dev mode only — minted so the accept call can complete the local loop. */
  devToken?: string;
}

async function mintDevToken(authUserId: string): Promise<string> {
  const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
  return new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(authUserId)
    .setAudience('dev')
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(secret);
}

export class InvitationService {
  async accept(params: {
    token: string;
    fullName?: string;
    requestId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AcceptInvitationResult> {
    return withSystem(async (tx: Tx) => {
      const invitation = await findInvitationByHash(tx, sha256(params.token));
      if (!invitation || invitation.status !== 'pending') {
        throw new ApiError(404, 'NOT_FOUND', 'Invitation not found or already used.');
      }
      if (!invitation.expiresAt || new Date(invitation.expiresAt).getTime() < Date.now()) {
        await updateInvitation(tx, invitation.id, { status: 'expired' });
        throw new ApiError(410, 'INVITATION_EXPIRED', 'Invitation has expired.');
      }

      const existing = await findUserByEmail(tx, invitation.email);
      let user: import('../db/schema.js').User;
      if (!existing) {
        if (env.AUTH_MODE !== 'dev') {
          // Supabase mode: the auth account must be created via Supabase
          // Auth admin API before acceptance; not implemented in this scope.
          throw new ApiError(
            501,
            'NOT_IMPLEMENTED',
            'User provisioning outside dev mode is not implemented.',
          );
        }
        user = await insertUser(tx, {
          email: invitation.email,
          fullName: params.fullName ?? null,
          // DEV MODE ONLY: no Supabase auth account; auth_user_id stays NULL
          // and dev-login keys off the users row directly.
          authUserId: null,
          status: 'active',
        });
      } else {
        user = existing;
        if (params.fullName && !user.fullName) {
          const { users } = await import('../db/schema.js');
          const { eq } = await import('drizzle-orm');
          user = await tx
            .update(users)
            .set({ fullName: params.fullName })
            .where(eq(users.id, user.id))
            .returning()
            .then((r) => r[0]!);
        }
      }

      await tx
        .insert(organizationMemberships)
        .values({
          organizationId: invitation.organizationId,
          userId: user.id,
          role: invitation.role,
          status: 'active',
          invitedBy: invitation.invitedBy,
        })
        .onConflictDoNothing();

      const accepted = await updateInvitation(tx, invitation.id, {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
        acceptedByUserId: user.id,
      });

      const { organizations } = await import('../db/schema.js');
      const { eq } = await import('drizzle-orm');
      const org = await tx
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(eq(organizations.id, invitation.organizationId))
        .limit(1)
        .then((r) => r[0]);
      if (!org) throw new ApiError(500, 'INTERNAL_ERROR', 'Organization missing.');

      // Audit via the open transaction, NOT auditService.log: the actor user
      // row is created in this same uncommitted tx, and auditService.log
      // writes on the shared no-GUC pool (a separate connection) whose
      // snapshot cannot see it — the audit_logs FK to users would fail and
      // roll back the whole acceptance. This is the one place where writing
      // the audit row on `tx` is required rather than optional.
      await tx.insert(auditLogs).values({
        organizationId: invitation.organizationId,
        actorUserId: user.id,
        action: 'INVITATION_ACCEPTED',
        resourceType: 'invitation',
        resourceId: invitation.id,
        metadata: redact({
          invitationId: invitation.id,
          email: invitation.email,
          role: invitation.role,
          acceptedAt: accepted.acceptedAt,
        }),
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        requestId: params.requestId ?? null,
      });

      const result: AcceptInvitationResult = {
        user: { id: user.id, email: user.email, fullName: user.fullName },
        organization: org,
      };
      if (env.AUTH_MODE === 'dev') {
        result.devToken = await mintDevToken(user.authUserId ?? user.id);
      }
      return result;
    });
  }
}

export const invitationService = new InvitationService();
