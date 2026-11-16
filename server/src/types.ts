export type Role = 'practice_owner' | 'practice_admin' | 'wealth_practitioner' | 'associate' | 'read_only';
export type InviteRole = Exclude<Role, 'practice_owner'>;
export type ResourceType = 'assets' | 'liabilities' | 'cashflows' | 'goals';
export type ReportKind = 'plan-report' | 'dossier';
export type ReportStatus = 'draft' | 'review' | 'approved' | 'archived';
export type RiskAssessmentStatus = 'invited' | 'completed' | 'revoked' | 'expired';
export type RiskProfileStatus = 'in_progress' | 'completed';
export type RiskProfileSource = 'advisor' | 'client' | 'imported';
export type RiskWorkflowStatus = 'draft' | 'sent' | 'client_in_progress' | 'submitted' | 'reviewed' | 'applied';
export type RiskAnswerOwner = 'advisor' | 'client' | 'joint';
export type RiskAnswerDetails = Record<string, { owner: RiskAnswerOwner; note?: string; uncertain?: boolean }>;

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

/**
 * A separately retained client-completed risk questionnaire. It is deliberately
 * independent of a plan version: an adviser may review and import it into a
 * plan, while the original client response remains an auditable record.
 */
export type RiskAssessment = {
  id: string;
  organizationId: string;
  clientId: string;
  recipientName: string | null;
  status: RiskAssessmentStatus;
  answers: Record<string, number>;
  answerDetails: RiskAnswerDetails;
  riskScore: number | null;
  riskVerdict: string | null;
  expiresAt: string;
  sentAt: string | null;
  openedAt: string | null;
  reminderSentAt: string | null;
  revokedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** The one current, shared risk profile for a household. */
export type ClientRiskProfile = {
  id: string;
  organizationId: string;
  clientId: string;
  status: RiskProfileStatus;
  source: RiskProfileSource;
  workflowStatus: RiskWorkflowStatus;
  answers: Record<string, number>;
  answerDetails: RiskAnswerDetails;
  riskScore: number | null;
  riskVerdict: string | null;
  completedAt: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  appliedAt: string | null;
  clientConfirmedAt: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type ClientRiskProfileVersion = Omit<ClientRiskProfile, 'id' | 'createdAt' | 'updatedAt'> & {
  id: string;
  profileId: string;
  createdAt: string;
};

export type CalculationRun = {
  id: string;
  planId: string;
  planVersionId: string;
  engineVersion: string;
  seed: string | null;
  result: Record<string, unknown>;
  createdAt: string;
};

export type ClientDraft = {
  id: string;
  clientId: string | null;
  name: string;
  status: 'active' | 'archived';
  isSample: boolean;
  sampleKey: string | null;
  data: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type AuditEvent = {
  id: string;
  organizationId: string;
  actorUserId: string | null;
  eventType: string;
  subjectType: string | null;
  subjectId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type Actor = { user: UserRecord; memberships: Membership[]; organizationId: string | null };
