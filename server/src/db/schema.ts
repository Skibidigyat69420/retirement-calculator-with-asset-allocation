import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  bigint,
  boolean,
  date,
  timestamp,
  jsonb,
  numeric,
  uniqueIndex,
  primaryKey,
  index,
} from 'drizzle-orm/pg-core';

/**
 * Drizzle schema mirroring the platform migration contract (supabase/ migrations).
 * Column names are snake_case exactly as in Postgres. `citext` columns map to text.
 * All ids default gen_random_uuid(); created_at/updated_at default now().
 */

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .defaultNow(),
};

const metadata = jsonb('metadata').notNull().default({});

// ---------------------------------------------------------------- organizations

export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  logoUrl: text('logo_url'),
  website: text('website'),
  brandPrimary: text('brand_primary'),
  brandSecondary: text('brand_secondary'),
  status: text('status').notNull().default('active'),
  planTier: text('plan_tier').notNull().default('standard'),
  settings: jsonb('settings').notNull().default({}),
  ...timestamps,
});

// ------------------------------------------------------------------------ users

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  authUserId: uuid('auth_user_id').unique(),
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  status: text('status').notNull().default('active'),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true, mode: 'string' }),
  ...timestamps,
});

// ------------------------------------------------- organization_memberships

export const organizationMemberships = pgTable(
  'organization_memberships',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    role: text('role', {
      enum: [
        'platform_admin',
        'practice_owner',
        'practice_admin',
        'wealth_practitioner',
        'associate',
        'read_only',
      ],
    }).notNull(),
    status: text('status').notNull().default('active'),
    invitedBy: uuid('invited_by'),
    ...timestamps,
  },
  (t) => [
    uniqueIndex('organization_memberships_org_user_uniq').on(
      t.organizationId,
      t.userId,
    ),
  ],
);

// ------------------------------------------------------------------ households

export const households = pgTable('households', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id),
  name: text('name').notNull(),
  status: text('status').notNull().default('active'),
  ...timestamps,
});

// -------------------------------------------------------------------- clients

export const clients = pgTable(
  'clients',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    householdId: uuid('household_id').references(() => households.id),
    firstName: text('first_name').notNull(),
    lastName: text('last_name').notNull(),
    preferredName: text('preferred_name'),
    email: text('email'),
    phone: text('phone'),
    dateOfBirth: date('date_of_birth', { mode: 'string' }),
    maritalStatus: text('marital_status'),
    status: text('status').notNull().default('active'),
    notes: text('notes'),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'string' }),
    ...timestamps,
  },
  (t) => [index('clients_organization_id_idx').on(t.organizationId)],
);

// ------------------------------------------------------------ client_assignments

export const clientAssignments = pgTable(
  'client_assignments',
  {
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    assignmentRole: text('assignment_role', {
      enum: ['primary', 'secondary', 'associate', 'viewer'],
    })
      .notNull()
      .default('secondary'),
    createdAt: timestamps.createdAt,
  },
  (t) => [primaryKey({ columns: [t.clientId, t.userId] })],
);

// --------------------------------------------------------------------- assets

export const assets = pgTable(
  'assets',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    name: text('name').notNull(),
    assetType: text('asset_type').notNull(),
    assetCategory: text('asset_category'),
    currency: text('currency').notNull().default('INR'),
    currentValue: numeric('current_value', { precision: 20, scale: 2 })
      .notNull()
      .default('0'),
    costBasis: numeric('cost_basis', { precision: 20, scale: 2 }),
    expectedReturn: numeric('expected_return', { precision: 8, scale: 4 }),
    liquidity: text('liquidity'),
    liquidateAtRetirement: boolean('liquidate_at_retirement')
      .notNull()
      .default(false),
    externalReference: text('external_reference'),
    metadata,
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'string' }),
    ...timestamps,
  },
  (t) => [index('assets_client_id_idx').on(t.clientId)],
);

// ------------------------------------------------------------------ liabilities

export const liabilities = pgTable(
  'liabilities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    name: text('name').notNull(),
    liabilityType: text('liability_type').notNull(),
    outstandingAmount: numeric('outstanding_amount', {
      precision: 20,
      scale: 2,
    }).notNull(),
    interestRate: numeric('interest_rate', { precision: 8, scale: 4 }),
    monthlyPayment: numeric('monthly_payment', { precision: 20, scale: 2 }),
    maturityDate: date('maturity_date', { mode: 'string' }),
    metadata,
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'string' }),
    ...timestamps,
  },
  (t) => [index('liabilities_client_id_idx').on(t.clientId)],
);

// --------------------------------------------------------------- cashflow_rules

export const cashflowRules = pgTable(
  'cashflow_rules',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    type: text('type', {
      enum: ['income', 'expense', 'sip', 'stp', 'swp', 'transfer'],
    }).notNull(),
    name: text('name').notNull(),
    annualAmount: numeric('annual_amount', { precision: 20, scale: 2 }),
    monthlyAmount: numeric('monthly_amount', { precision: 20, scale: 2 }),
    annualGrowthRate: numeric('annual_growth_rate', {
      precision: 8,
      scale: 4,
    }),
    startDate: date('start_date', { mode: 'string' }),
    endDate: date('end_date', { mode: 'string' }),
    metadata,
    ...timestamps,
  },
  (t) => [index('cashflow_rules_client_id_idx').on(t.clientId)],
);

// -------------------------------------------------------------------- goals

export const goals = pgTable(
  'goals',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    name: text('name').notNull(),
    goalType: text('goal_type').notNull(),
    priority: text('priority', {
      enum: ['essential', 'important', 'aspirational'],
    }).notNull(),
    targetAmount: numeric('target_amount', { precision: 20, scale: 2 }),
    targetDate: date('target_date', { mode: 'string' }),
    yearsToGoal: numeric('years_to_goal', { precision: 8, scale: 2 }),
    inflationRate: numeric('inflation_rate', { precision: 8, scale: 4 }),
    recurring: boolean('recurring').notNull().default(false),
    status: text('status').notNull().default('active'),
    metadata,
    ...timestamps,
  },
  (t) => [index('goals_client_id_idx').on(t.clientId)],
);

// ------------------------------------------------------------ risk_assessments
// Append-only: no updated_at.

export const riskAssessments = pgTable(
  'risk_assessments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    answers: jsonb('answers').notNull(),
    rawScore: numeric('raw_score', { precision: 10, scale: 4 }),
    profile: text('profile'),
    dimensionScores: jsonb('dimension_scores').notNull().default({}),
    questionnaireVersion: text('questionnaire_version'),
    assessedBy: uuid('assessed_by'),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'string',
    }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('risk_assessments_client_id_idx').on(t.clientId)],
);

// ------------------------------------------------------------ retirement_plans

export const retirementPlans = pgTable(
  'retirement_plans',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    name: text('name').notNull(),
    status: text('status', {
      enum: ['draft', 'in_review', 'approved', 'active', 'archived'],
    })
      .notNull()
      .default('draft'),
    createdBy: uuid('created_by'),
    currentVersionId: uuid('current_version_id'),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'string' }),
    ...timestamps,
  },
  (t) => [index('retirement_plans_client_id_idx').on(t.clientId)],
);

// --------------------------------------------------------------- plan_versions
// Append-only.

export const planVersions = pgTable(
  'plan_versions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    planId: uuid('plan_id')
      .notNull()
      .references(() => retirementPlans.id),
    versionNumber: integer('version_number').notNull(),
    inputSnapshot: jsonb('input_snapshot').notNull(),
    assumptionsSnapshot: jsonb('assumptions_snapshot').notNull(),
    resultSnapshot: jsonb('result_snapshot').notNull(),
    engineVersion: text('engine_version').notNull(),
    createdBy: uuid('created_by'),
    changeSummary: text('change_summary'),
    createdAt: timestamps.createdAt,
  },
  (t) => [
    uniqueIndex('plan_versions_plan_version_uniq').on(
      t.planId,
      t.versionNumber,
    ),
  ],
);

// -------------------------------------------------------------- plan_scenarios

export const planScenarios = pgTable(
  'plan_scenarios',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    planId: uuid('plan_id')
      .notNull()
      .references(() => retirementPlans.id),
    name: text('name').notNull(),
    scenarioType: text('scenario_type', {
      enum: [
        'base',
        'conservative',
        'optimistic',
        'custom',
        'stress',
        'reverse',
        'what_if',
      ],
    }).notNull(),
    assumptions: jsonb('assumptions').notNull(),
    result: jsonb('result').notNull(),
    resultStatus: text('result_status', {
      enum: ['draft', 'stale', 'calculated', 'archived'],
    })
      .notNull()
      .default('draft'),
    baseVersionId: uuid('base_version_id'),
    createdBy: uuid('created_by'),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'string' }),
    ...timestamps,
  },
  (t) => [index('plan_scenarios_plan_id_idx').on(t.planId)],
);

// ------------------------------------------------------------- assumption_sets

export const assumptionSets = pgTable('assumption_sets', {
  id: uuid('id').defaultRandom().primaryKey(),
  // NULL organization = global assumption set shared across tenants.
  organizationId: uuid('organization_id').references(() => organizations.id),
  name: text('name').notNull(),
  source: text('source'),
  version: text('version'),
  data: jsonb('data').notNull(),
  validFrom: date('valid_from', { mode: 'string' }),
  validTo: date('valid_to', { mode: 'string' }),
  createdAt: timestamps.createdAt,
});

// ------------------------------------------------------------ meeting_sessions

export const meetingSessions = pgTable(
  'meeting_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id')
      .notNull()
      .references(() => clients.id),
    title: text('title').notNull(),
    currentStage: integer('current_stage').notNull().default(1),
    status: text('status').notNull().default('open'),
    startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' }),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'string',
    }),
    createdBy: uuid('created_by'),
    ...timestamps,
  },
  (t) => [index('meeting_sessions_client_id_idx').on(t.clientId)],
);

// ----------------------------------------------------- meeting_checklist_items

export const meetingChecklistItems = pgTable(
  'meeting_checklist_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetingSessions.id),
    stageId: integer('stage_id').notNull(),
    checklistKey: text('checklist_key').notNull(),
    completed: boolean('completed').notNull().default(false),
    completedBy: uuid('completed_by'),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'string',
    }),
    // No created_at/updated_at in migration — the unique (meeting_id,
    // checklist_key) row IS the state; completed_at carries the timestamp.
  },
  (t) => [
    uniqueIndex('meeting_checklist_items_meeting_key_uniq').on(
      t.meetingId,
      t.checklistKey,
    ),
  ],
);

// -------------------------------------------------------------- meeting_notes

export const meetingNotes = pgTable(
  'meeting_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    meetingId: uuid('meeting_id')
      .notNull()
      .references(() => meetingSessions.id),
    stageId: integer('stage_id').notNull(),
    body: text('body').notNull(),
    authorId: uuid('author_id'),
    ...timestamps,
  },
  (t) => [index('meeting_notes_meeting_id_idx').on(t.meetingId)],
);

// -------------------------------------------------------------- decision_logs
// Append-only.

export const decisionLogs = pgTable(
  'decision_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id'),
    planId: uuid('plan_id'),
    actorUserId: uuid('actor_user_id'),
    action: text('action').notNull(),
    summary: text('summary').notNull(),
    metadata,
    createdAt: timestamps.createdAt,
  },
  (t) => [index('decision_logs_client_id_idx').on(t.clientId)],
);

// ----------------------------------------------------------------- audit_logs
// Append-only.

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    actorUserId: uuid('actor_user_id'),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id'),
    metadata,
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    requestId: text('request_id'),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('audit_logs_organization_id_idx').on(t.organizationId)],
);

// -------------------------------------------------------------------- reports

export const reports = pgTable(
  'reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id'),
    planId: uuid('plan_id'),
    reportType: text('report_type').notNull(),
    status: text('status', {
      enum: ['queued', 'generating', 'ready', 'failed', 'archived'],
    })
      .notNull()
      .default('queued'),
    planVersionId: uuid('plan_version_id'),
    storageKey: text('storage_key'),
    idempotencyKey: text('idempotency_key').unique(),
    createdBy: uuid('created_by'),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'string',
    }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('reports_client_id_idx').on(t.clientId)],
);

// ------------------------------------------------------------------ documents
// No updated_at.

export const documents = pgTable(
  'documents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id'),
    planId: uuid('plan_id'),
    name: text('name').notNull(),
    documentType: text('document_type').notNull(),
    storageKey: text('storage_key').notNull(),
    mimeType: text('mime_type'),
    sizeBytes: bigint('size_bytes', { mode: 'number' }),
    uploadedBy: uuid('uploaded_by'),
    archivedAt: timestamp('archived_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('documents_client_id_idx').on(t.clientId)],
);

// ---------------------------------------------------------------------- tasks

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    clientId: uuid('client_id'),
    planId: uuid('plan_id'),
    title: text('title').notNull(),
    description: text('description'),
    assignedTo: uuid('assigned_to'),
    dueAt: timestamp('due_at', { withTimezone: true, mode: 'string' }),
    status: text('status', {
      enum: ['open', 'in_progress', 'completed', 'cancelled'],
    })
      .notNull()
      .default('open'),
    priority: text('priority', {
      enum: ['low', 'normal', 'high', 'urgent'],
    })
      .notNull()
      .default('normal'),
    createdBy: uuid('created_by'),
    completedAt: timestamp('completed_at', {
      withTimezone: true,
      mode: 'string',
    }),
    ...timestamps,
  },
  (t) => [index('tasks_organization_id_idx').on(t.organizationId)],
);

// -------------------------------------------------------------- notifications
// Append-only.

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    type: text('type').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    metadata,
    readAt: timestamp('read_at', { withTimezone: true, mode: 'string' }),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('notifications_user_id_idx').on(t.userId)],
);

// --------------------------------------------------------------- invitations

export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id),
    email: text('email').notNull(),
    role: text('role', {
      enum: [
        'practice_admin',
        'wealth_practitioner',
        'associate',
        'read_only',
      ],
    }).notNull(),
    tokenHash: text('token_hash').notNull().unique(),
    invitedBy: uuid('invited_by'),
    status: text('status', {
      enum: ['pending', 'accepted', 'revoked', 'expired'],
    })
      .notNull()
      .default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'string' }),
    acceptedAt: timestamp('accepted_at', {
      withTimezone: true,
      mode: 'string',
    }),
    acceptedByUserId: uuid('accepted_by_user_id'),
    createdAt: timestamps.createdAt,
  },
  (t) => [index('invitations_organization_id_idx').on(t.organizationId)],
);

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type OrganizationMembership = typeof organizationMemberships.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type ClientAssignment = typeof clientAssignments.$inferSelect;
export type AssignmentRole = ClientAssignment['assignmentRole'];
export type AuditLog = typeof auditLogs.$inferSelect;
export type Household = typeof households.$inferSelect;
export type Asset = typeof assets.$inferSelect;
export type Liability = typeof liabilities.$inferSelect;
export type CashflowRule = typeof cashflowRules.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type RiskAssessment = typeof riskAssessments.$inferSelect;
export type RetirementPlan = typeof retirementPlans.$inferSelect;
export type PlanVersion = typeof planVersions.$inferSelect;
export type PlanScenario = typeof planScenarios.$inferSelect;
export type AssumptionSetRow = typeof assumptionSets.$inferSelect;
export type MeetingSession = typeof meetingSessions.$inferSelect;
export type MeetingChecklistItem = typeof meetingChecklistItems.$inferSelect;
export type MeetingNote = typeof meetingNotes.$inferSelect;
export type DecisionLog = typeof decisionLogs.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;
export type { AnyPgColumn } from 'drizzle-orm/pg-core';
