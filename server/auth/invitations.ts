/**
 * Practitioner invitations (spec §39).
 * Single use · short expiry · hashed at rest · revocable.
 */
import type { PoolClient } from 'pg';
import { generateToken, hashToken } from './tokens.js';
import { isInvitableRole, type InvitationRow, type Role } from './types.js';

export const INVITATION_TTL_HOURS = 72;

export interface CreateInvitationInput {
  organizationId: string;
  email: string;
  role: Role;
  invitedBy: string;
}

export interface CreatedInvitation {
  invitation: InvitationRow;
  /** Plaintext token — returned once, embedded in the accept link. */
  token: string;
}

export async function createInvitation(
  client: PoolClient,
  input: CreateInvitationInput,
): Promise<CreatedInvitation> {
  if (!isInvitableRole(input.role)) {
    throw new Error(`Role '${input.role}' cannot be granted by invitation.`);
  }
  const token = generateToken(24);
  const { rows } = await client.query<InvitationRow>(
    `INSERT INTO invitations
       (organization_id, email, role, invited_by, token_hash, expires_at)
     VALUES ($1, $2, $3, $4, $5, now() + ($6 || ' hours')::interval)
     ON CONFLICT (organization_id, email)
       WHERE status = 'pending'
     DO UPDATE SET role = EXCLUDED.role, invited_by = EXCLUDED.invited_by,
                   token_hash = EXCLUDED.token_hash, expires_at = EXCLUDED.expires_at,
                   status = 'pending', accepted_at = NULL
     RETURNING *`,
    [
      input.organizationId,
      input.email.trim().toLowerCase(),
      input.role,
      input.invitedBy,
      hashToken(token),
      String(INVITATION_TTL_HOURS),
    ],
  );
  return { invitation: rows[0], token };
}

/** Shape returned by SECURITY DEFINER auth_lookup_invitation(). */
export type InvitationView = Omit<InvitationRow, 'token_hash'> & { organization_name: string };

export type InvitationLookup =
  | { ok: true; invitation: InvitationView }
  | { ok: false; reason: 'not_found' | 'used' | 'revoked' | 'expired' };

/** Pre-context lookup via SECURITY DEFINER auth_lookup_invitation(). */
export async function findInvitationByToken(
  client: PoolClient,
  token: string,
): Promise<InvitationLookup> {
  const { rows } = await client.query<InvitationView>(
    `SELECT * FROM auth_lookup_invitation($1)`,
    [hashToken(token)],
  );
  const invitation = rows[0];
  if (!invitation) return { ok: false, reason: 'not_found' };
  if (invitation.status === 'accepted') return { ok: false, reason: 'used' };
  if (invitation.status === 'revoked') return { ok: false, reason: 'revoked' };
  if (invitation.expires_at.getTime() <= Date.now()) return { ok: false, reason: 'expired' };
  return { ok: true, invitation };
}

export async function revokeInvitation(client: PoolClient, invitationId: string): Promise<boolean> {
  const { rowCount } = await client.query(
    `UPDATE invitations SET status = 'revoked'
     WHERE id = $1 AND status = 'pending'`,
    [invitationId],
  );
  return (rowCount ?? 0) > 0;
}

export async function listPendingInvitations(
  client: PoolClient,
  organizationId: string,
): Promise<InvitationRow[]> {
  const { rows } = await client.query<InvitationRow>(
    `SELECT * FROM invitations
     WHERE organization_id = $1 AND status = 'pending' AND expires_at > now()
     ORDER BY created_at DESC`,
    [organizationId],
  );
  return rows;
}
