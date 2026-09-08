/**
 * Shared auth types and role model.
 *
 * Role hierarchy (spec §10): a user belongs to organizations through
 * memberships and has one role PER MEMBERSHIP — never a permanent role
 * column on users.
 */

export const ROLES = [
  'platform_admin',
  'practice_owner',
  'practice_admin',
  'wealth_practitioner',
  'associate',
  'read_only',
] as const;

export type Role = (typeof ROLES)[number];

/** Roles that may be granted through an invitation (spec §39). */
export const INVITABLE_ROLES: readonly Role[] = [
  'practice_owner',
  'practice_admin',
  'wealth_practitioner',
  'associate',
  'read_only',
];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isInvitableRole(value: string): value is Role {
  return (INVITABLE_ROLES as readonly string[]).includes(value);
}

export type MembershipStatus = 'active' | 'invited' | 'suspended';

export interface UserRow {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
  last_login_at: Date | null;
}

export interface CredentialsRow {
  user_id: string;
  password_hash: string;
  mfa_enabled: boolean;
  mfa_secret: string | null;
  mfa_pending_secret: string | null;
  failed_login_attempts: number;
  locked_until: Date | null;
  password_changed_at: Date;
}

export interface SessionRow {
  id: string;
  user_id: string;
  organization_id: string | null;
  token_hash: string;
  created_at: Date;
  expires_at: Date;
  revoked_at: Date | null;
  ip: string | null;
  user_agent: string | null;
}

export interface MembershipRow {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  status: MembershipStatus;
  invited_by: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OrganizationRef {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export interface MembershipWithOrg extends MembershipRow {
  organization_name: string;
  organization_slug: string;
}

/** What /api/v1/auth/me returns (spec §38 service requirement). */
export interface MePayload {
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    status: string;
    mfaEnabled: boolean;
    lastLoginAt: string | null;
  };
  memberships: Array<{
    organizationId: string;
    organizationName: string;
    organizationSlug: string;
    role: Role;
    status: MembershipStatus;
  }>;
  activeOrganization: {
    id: string;
    name: string;
  } | null;
  session: {
    id: string;
    createdAt: string;
    expiresAt: string;
  };
}

export interface InvitationRow {
  id: string;
  organization_id: string;
  email: string;
  role: Role;
  invited_by: string | null;
  token_hash: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  created_at: Date;
  expires_at: Date;
  accepted_at: Date | null;
}

export interface PublicInvitation {
  id: string;
  email: string;
  role: Role;
  organizationName: string;
  expiresAt: string;
  status: InvitationRow['status'];
}

export interface SessionInfo {
  id: string;
  current: boolean;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
}

export type LoginResult =
  | { status: 'ok'; me: MePayload }
  | { status: 'mfa_required'; mfaToken: string }
  | { status: 'locked'; retryAfterSeconds: number };

export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  MFA_REQUIRED: 'AUTH_MFA_REQUIRED',
  MFA_INVALID: 'AUTH_MFA_INVALID',
  ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  SESSION_REVOKED: 'AUTH_SESSION_REVOKED',
  NOT_AUTHENTICATED: 'AUTH_NOT_AUTHENTICATED',
  MEMBERSHIP_REQUIRED: 'AUTH_MEMBERSHIP_REQUIRED',
  INVITATION_INVALID: 'AUTH_INVITATION_INVALID',
  INVITATION_EXPIRED: 'AUTH_INVITATION_EXPIRED',
  RESET_TOKEN_INVALID: 'AUTH_RESET_TOKEN_INVALID',
  RESET_TOKEN_EXPIRED: 'AUTH_RESET_TOKEN_EXPIRED',
  PASSWORD_TOO_WEAK: 'AUTH_PASSWORD_TOO_WEAK',
  EMAIL_TAKEN: 'AUTH_EMAIL_TAKEN',
  RATE_LIMITED: 'RATE_LIMITED',
  CSRF_MISSING_HEADER: 'CSRF_MISSING_HEADER',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];
