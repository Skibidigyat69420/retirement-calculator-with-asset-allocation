export type Role = 'practice_owner' | 'practice_admin' | 'wealth_practitioner' | 'associate' | 'read_only';
export type InviteRole = Exclude<Role, 'practice_owner'>;
export type ResourceType = 'assets' | 'liabilities' | 'cashflows' | 'goals';
export type ReportKind = 'plan-report' | 'dossier';
export type ReportStatus = 'draft' | 'review' | 'approved' | 'archived';

export type UserRecord = { id: string; authUserId: string; email: string; fullName: string | null };
export type Membership = { organizationId: string; organizationName: string; role: Role };
export type Organization = { id: string; name: string };

export type ClientRecord = {
  id: string;
  householdId: string;
  firstName: string;
  lastName: string;
  preferredName: string | null;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  notes: string | null;
  status: 'active' | 'archived';
  assignedPractitioners: { userId: string; fullName: string | null; assignmentRole: string }[];
};

export type Profile = Record<ResourceType, Record<string, unknown>[]>;

export type PlanVersion = {
  id: string;
  versionNumber: number;
  inputSnapshot: Record<string, unknown>;
  assumptionsSnapshot: Record<string, unknown>;
};

export type Plan = {
  id: string;
  clientId: string;
  name: string;
  status: 'draft' | 'active' | 'archived';
  currentVersionId: string | null;
  versions: PlanVersion[];
};

export type Invitation = {
  id: string;
  tokenHash: string;
  email: string;
  role: InviteRole;
  status: 'pending' | 'accepted' | 'revoked';
  organizationId: string;
  expiresAt: string;
};

export type ReportRecord = {
  id: string;
  clientId: string;
  kind: ReportKind;
  name: string;
  clientName: string;
  version: number;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
};

export type Actor = { user: UserRecord; memberships: Membership[]; organizationId: string | null };
