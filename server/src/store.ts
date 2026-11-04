import { randomUUID } from 'node:crypto';
import postgres, { type Sql } from 'postgres';
import type {
  AuditEvent,
  ClientDraft,
  CalculationRun,
  ClientRecord,
  Invitation,
  InviteRole,
  Membership,
  Organization,
  Plan,
  PlanVersion,
  Profile,
  ReportKind,
  ReportRecord,
  ReportStatus,
  ResourceType,
  Role,
  UserRecord,
} from './types.js';

export interface AppStore {
  close(): Promise<void>;
  ensureDevelopmentSeed(): Promise<void>;
  getOrganization(organizationId: string): Promise<Organization | null>;
  findUserByAuthId(authUserId: string): Promise<UserRecord | null>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  upsertUser(input: { authUserId: string; email: string; fullName: string | null }): Promise<UserRecord>;
  listMemberships(userId: string): Promise<Membership[]>;
  createOrganizationForUser(input: { user: UserRecord; practiceName: string; role: Role }): Promise<Organization>;
  addMembership(input: { user: UserRecord; organization: Organization; role: Role }): Promise<Membership>;
  listClients(organizationId: string): Promise<ClientRecord[]>;
  createClient(organizationId: string, actor: UserRecord, input: Partial<ClientRecord> & { firstName: string; lastName: string }): Promise<ClientRecord>;
  ensureClientDraftSamples(organizationId: string): Promise<void>;
  listClientDrafts(organizationId: string): Promise<ClientDraft[]>;
  createClientDraft(organizationId: string, input: { name: string; data: Record<string, unknown>; isSample?: boolean }): Promise<ClientDraft>;
  updateClientDraft(organizationId: string, id: string, patch: { name?: string; data?: Record<string, unknown>; status?: 'active' | 'archived' }): Promise<ClientDraft | null>;
  getClient(organizationId: string, clientId: string): Promise<ClientRecord | null>;
  updateClient(organizationId: string, clientId: string, patch: Partial<ClientRecord>): Promise<ClientRecord | null>;
  getProfile(organizationId: string, clientId: string): Promise<Profile | null>;
  createResource(organizationId: string, clientId: string, resource: ResourceType, data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  updateResource(organizationId: string, clientId: string, resource: ResourceType, id: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  archiveResource(organizationId: string, clientId: string, resource: ResourceType, id: string): Promise<Record<string, unknown> | null>;
  listPlans(organizationId: string, clientId: string): Promise<Plan[]>;
  createPlan(organizationId: string, clientId: string, name: string): Promise<Plan | null>;
  getPlan(organizationId: string, planId: string): Promise<Plan | null>;
  updatePlan(organizationId: string, planId: string, patch: Pick<Partial<Plan>, 'name' | 'status'>): Promise<Plan | null>;
  createPlanVersion(organizationId: string, planId: string, inputSnapshot: Record<string, unknown>, assumptionsSnapshot: Record<string, unknown>): Promise<PlanVersion | null>;
  createCalculationRun(input: { organizationId: string; planId: string; planVersionId: string; engineVersion: string; seed: string | null; result: Record<string, unknown> }): Promise<CalculationRun | null>;
  getLatestCalculationRun(organizationId: string, planId: string): Promise<CalculationRun | null>;
  recordAuditEvent(input: Omit<AuditEvent, 'id' | 'createdAt'>): Promise<AuditEvent>;
  listAuditEvents(organizationId: string, limit: number): Promise<AuditEvent[]>;
  findInvitationByTokenHash(tokenHash: string): Promise<Invitation | null>;
  createInvitation(input: { organizationId: string; tokenHash: string; email: string; role: InviteRole; expiresAt: string }): Promise<Invitation>;
  listInvitations(organizationId: string): Promise<Invitation[]>;
  revokeInvitation(organizationId: string, id: string): Promise<boolean>;
  markInvitationAccepted(id: string): Promise<void>;
  listReports(organizationId: string, clientId?: string): Promise<ReportRecord[]>;
  createReport(organizationId: string, clientId: string, kind: ReportKind, name?: string): Promise<ReportRecord | null>;
  updateReportStatus(organizationId: string, id: string, status: ReportStatus): Promise<ReportRecord | null>;
}

export function emptyProfile(): Profile {
  return { assets: [], liabilities: [], cashflows: [], goals: [] };
}

export function createStore(): AppStore {
  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (databaseUrl) {
    return new PostgresStore(postgres(databaseUrl, { max: 10, prepare: false }));
  }
  return createInMemoryStore();
}

/** A deterministic store for local development and API contract tests. */
export function createInMemoryStore(): AppStore {
  return new MemoryStore();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function defaultClientDrafts(): { name: string; data: Record<string, unknown> }[] {
  return [
    { name: 'Rhea and Karan Shah', data: { tier: 'HNI', stage: 'IPS Draft', tags: ['Tech Founder', 'Retirement 2035'], financialSummary: { netWorth: 48500000, investableAssets: 38200000, totalAssets: 52000000, totalLiabilities: 3500000, assetCount: 8 } } },
    { name: 'Vikram & Ananya Malhotra', data: { tier: 'Ultra HNI', stage: 'Discovery', tags: ['Estate Succession', 'NRI Compliance'], financialSummary: { netWorth: 124000000, investableAssets: 95000000, totalAssets: 130000000, totalLiabilities: 6000000, assetCount: 14 } } },
    { name: 'Sharma Family', data: { tier: 'HNI', stage: 'Active Mandate', tags: ['Multi-Gen', 'Higher Education'], financialSummary: { netWorth: 24700000, investableAssets: 18200000, totalAssets: 34400000, totalLiabilities: 9700000, assetCount: 6 } } },
    { name: 'Aarav Mehta', data: { tier: 'Affluent', stage: 'Risk Profiling', tags: ['FIRE 45', 'Aggressive Growth'], financialSummary: { netWorth: 8200000, investableAssets: 7800000, totalAssets: 8200000, totalLiabilities: 0, assetCount: 4 } } },
  ];
}

function clientNameParts(input: Partial<ClientRecord> & { firstName: string; lastName: string }) {
  return {
    firstName: input.firstName,
    lastName: input.lastName,
    preferredName: input.preferredName ?? null,
    email: input.email ?? null,
    phone: input.phone ?? null,
    dateOfBirth: input.dateOfBirth ?? null,
    maritalStatus: input.maritalStatus ?? null,
    notes: input.notes ?? null,
  };
}

class MemoryStore implements AppStore {
  private users = new Map<string, UserRecord>();
  private organizations = new Map<string, Organization>();
  private membershipsByUserId = new Map<string, Membership[]>();
  private clients = new Map<string, ClientRecord & { organizationId: string }>();
  private profiles = new Map<string, Profile>();
  private plans = new Map<string, Plan & { organizationId: string }>();
  private invitations = new Map<string, Invitation>();
  private reports = new Map<string, ReportRecord & { organizationId: string }>();
  private calculationRuns = new Map<string, CalculationRun & { organizationId: string }>();
  private auditEvents: AuditEvent[] = [];
  private clientDrafts = new Map<string, ClientDraft & { organizationId: string }>();

  constructor() {
    const org = { id: 'demo-practice', name: 'Sound Thesis Demo Practice' };
    const user = { id: 'demo-user', authUserId: 'demo-user', email: 'adviser@soundthesis.local', fullName: 'Demo Adviser' };
    this.organizations.set(org.id, org);
    this.users.set(user.id, user);
    this.addMembershipSync(user, org, 'practice_owner');
    const client: ClientRecord & { organizationId: string } = {
      id: '00000000-0000-0000-0000-000000000000',
      organizationId: org.id,
      householdId: 'demo-household',
      firstName: 'Demo',
      lastName: 'Client',
      preferredName: null,
      email: 'client@example.com',
      phone: null,
      dateOfBirth: null,
      maritalStatus: null,
      notes: null,
      status: 'active',
      assignedPractitioners: [{ userId: user.id, fullName: user.fullName, assignmentRole: 'lead' }],
    };
    this.clients.set(client.id, client);
    this.profiles.set(client.id, emptyProfile());
  }

  async close() {}
  async ensureDevelopmentSeed() {}

  async getOrganization(organizationId: string) {
    return this.organizations.get(organizationId) ?? null;
  }

  async findUserByAuthId(authUserId: string) {
    return Array.from(this.users.values()).find((user) => user.authUserId === authUserId) ?? null;
  }

  async findUserByEmail(email: string) {
    return Array.from(this.users.values()).find((user) => user.email === normalizeEmail(email)) ?? null;
  }

  async upsertUser(input: { authUserId: string; email: string; fullName: string | null }) {
    const existing = await this.findUserByAuthId(input.authUserId);
    if (existing) {
      existing.email = normalizeEmail(input.email);
      existing.fullName = input.fullName || existing.fullName;
      return existing;
    }
    const user = { id: randomUUID(), authUserId: input.authUserId, email: normalizeEmail(input.email), fullName: input.fullName };
    this.users.set(user.id, user);
    return user;
  }

  async listMemberships(userId: string) {
    return this.membershipsByUserId.get(userId) ?? [];
  }

  async createOrganizationForUser(input: { user: UserRecord; practiceName: string; role: Role }) {
    const organization = { id: randomUUID(), name: input.practiceName };
    this.organizations.set(organization.id, organization);
    this.addMembershipSync(input.user, organization, input.role);
    return organization;
  }

  async addMembership(input: { user: UserRecord; organization: Organization; role: Role }) {
    return this.addMembershipSync(input.user, input.organization, input.role);
  }

  private addMembershipSync(user: UserRecord, organization: Organization, role: Role) {
    const memberships = this.membershipsByUserId.get(user.id) ?? [];
    const existing = memberships.find((membership) => membership.organizationId === organization.id);
    if (existing) return existing;
    const membership = { organizationId: organization.id, organizationName: organization.name, role };
    this.membershipsByUserId.set(user.id, [...memberships, membership]);
    return membership;
  }

  async listClients(organizationId: string) {
    return Array.from(this.clients.values()).filter((client) => client.organizationId === organizationId && client.status === 'active');
  }

  async createClient(organizationId: string, actor: UserRecord, input: Partial<ClientRecord> & { firstName: string; lastName: string }) {
    const client = {
      id: randomUUID(),
      organizationId,
      householdId: randomUUID(),
      status: 'active' as const,
      assignedPractitioners: [{ userId: actor.id, fullName: actor.fullName, assignmentRole: 'lead' }],
      ...clientNameParts(input),
    };
    this.clients.set(client.id, client);
    this.profiles.set(client.id, emptyProfile());
    return client;
  }

  async ensureClientDraftSamples(organizationId: string) {
    if (Array.from(this.clientDrafts.values()).some((draft) => draft.organizationId === organizationId && draft.isSample)) return;
    for (const sample of defaultClientDrafts()) await this.createClientDraft(organizationId, { ...sample, isSample: true });
  }
  async listClientDrafts(organizationId: string) { return Array.from(this.clientDrafts.values()).filter((draft) => draft.organizationId === organizationId && draft.status === 'active'); }
  async createClientDraft(organizationId: string, input: { name: string; data: Record<string, unknown>; isSample?: boolean }) {
    const now = new Date().toISOString(); const draft = { id: randomUUID(), organizationId, name: input.name, data: input.data, isSample: input.isSample ?? false, status: 'active' as const, createdAt: now, updatedAt: now };
    this.clientDrafts.set(draft.id, draft); return draft;
  }
  async updateClientDraft(organizationId: string, id: string, patch: { name?: string; data?: Record<string, unknown>; status?: 'active' | 'archived' }) {
    const draft = this.clientDrafts.get(id); if (!draft || draft.organizationId !== organizationId) return null;
    Object.assign(draft, patch, { updatedAt: new Date().toISOString() }); return draft;
  }

  async getClient(organizationId: string, clientId: string) {
    const client = this.clients.get(clientId);
    return client?.organizationId === organizationId ? client : null;
  }

  async updateClient(organizationId: string, clientId: string, patch: Partial<ClientRecord>) {
    const client = await this.getClient(organizationId, clientId);
    if (!client) return null;
    Object.assign(client, patch);
    return client;
  }

  async getProfile(organizationId: string, clientId: string) {
    if (!(await this.getClient(organizationId, clientId))) return null;
    return this.profiles.get(clientId) ?? emptyProfile();
  }

  async createResource(organizationId: string, clientId: string, resource: ResourceType, data: Record<string, unknown>) {
    const profile = await this.getProfile(organizationId, clientId);
    if (!profile) return null;
    const record = { id: randomUUID(), status: 'active', ...data };
    profile[resource].push(record);
    return record;
  }

  async updateResource(organizationId: string, clientId: string, resource: ResourceType, id: string, data: Record<string, unknown>) {
    const profile = await this.getProfile(organizationId, clientId);
    const record = profile?.[resource].find((item) => item.id === id);
    if (!record) return null;
    Object.assign(record, data);
    return record;
  }

  async archiveResource(organizationId: string, clientId: string, resource: ResourceType, id: string) {
    return this.updateResource(organizationId, clientId, resource, id, { status: 'archived' });
  }

  async listPlans(organizationId: string, clientId: string) {
    return Array.from(this.plans.values()).filter((plan) => plan.organizationId === organizationId && plan.clientId === clientId && plan.status !== 'archived');
  }

  async createPlan(organizationId: string, clientId: string, name: string) {
    if (!(await this.getClient(organizationId, clientId))) return null;
    const plan = { id: randomUUID(), organizationId, clientId, name, status: 'draft' as const, currentVersionId: null, versions: [] };
    this.plans.set(plan.id, plan);
    return plan;
  }

  async getPlan(organizationId: string, planId: string) {
    const plan = this.plans.get(planId);
    return plan?.organizationId === organizationId ? plan : null;
  }

  async updatePlan(organizationId: string, planId: string, patch: Pick<Partial<Plan>, 'name' | 'status'>) {
    const plan = await this.getPlan(organizationId, planId);
    if (!plan) return null;
    Object.assign(plan, patch);
    return plan;
  }

  async createPlanVersion(organizationId: string, planId: string, inputSnapshot: Record<string, unknown>, assumptionsSnapshot: Record<string, unknown>) {
    const plan = await this.getPlan(organizationId, planId);
    if (!plan) return null;
    const version = { id: randomUUID(), versionNumber: plan.versions.length + 1, inputSnapshot, assumptionsSnapshot };
    plan.versions.push(version);
    plan.currentVersionId = version.id;
    return version;
  }

  async createCalculationRun(input: { organizationId: string; planId: string; planVersionId: string; engineVersion: string; seed: string | null; result: Record<string, unknown> }) {
    const plan = await this.getPlan(input.organizationId, input.planId);
    if (!plan || !plan.versions.some((version) => version.id === input.planVersionId)) return null;
    const run = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
    this.calculationRuns.set(run.id, run);
    return run;
  }

  async getLatestCalculationRun(organizationId: string, planId: string) {
    return Array.from(this.calculationRuns.values())
      .filter((run) => run.organizationId === organizationId && run.planId === planId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  }

  async recordAuditEvent(input: Omit<AuditEvent, 'id' | 'createdAt'>) {
    const event = { id: randomUUID(), ...input, createdAt: new Date().toISOString() };
    this.auditEvents.push(event);
    return event;
  }

  async listAuditEvents(organizationId: string, limit: number) {
    return this.auditEvents
      .filter((event) => event.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async findInvitationByTokenHash(tokenHash: string) {
    return this.invitations.get(tokenHash) ?? null;
  }

  async createInvitation(input: { organizationId: string; tokenHash: string; email: string; role: InviteRole; expiresAt: string }) {
    const invitation = { ...input, id: randomUUID(), status: 'pending' as const, email: normalizeEmail(input.email) };
    this.invitations.set(invitation.tokenHash, invitation);
    return invitation;
  }

  async listInvitations(organizationId: string) {
    return Array.from(this.invitations.values()).filter((invitation) => invitation.organizationId === organizationId);
  }

  async revokeInvitation(organizationId: string, id: string) {
    const invitation = Array.from(this.invitations.values()).find((item) => item.organizationId === organizationId && item.id === id);
    if (!invitation) return false;
    invitation.status = 'revoked';
    return true;
  }

  async markInvitationAccepted(id: string) {
    const invitation = Array.from(this.invitations.values()).find((item) => item.id === id);
    if (invitation) invitation.status = 'accepted';
  }

  async listReports(organizationId: string, clientId?: string) {
    return Array.from(this.reports.values()).filter((report) => report.organizationId === organizationId && (!clientId || report.clientId === clientId));
  }

  async createReport(organizationId: string, clientId: string, kind: ReportKind, name?: string) {
    const client = await this.getClient(organizationId, clientId);
    if (!client) return null;
    const existing = await this.listReports(organizationId, clientId);
    const version = existing.filter((report) => report.kind === kind).length + 1;
    const now = new Date().toISOString();
    const report = {
      id: randomUUID(),
      organizationId,
      clientId,
      kind,
      name: name || (kind === 'dossier' ? 'Wealth Dossier' : 'Plan Report'),
      clientName: client.preferredName || `${client.firstName} ${client.lastName}`.trim(),
      version,
      status: 'review' as const,
      createdAt: now,
      updatedAt: now,
    };
    this.reports.set(report.id, report);
    return report;
  }

  async updateReportStatus(organizationId: string, id: string, status: ReportStatus) {
    const report = this.reports.get(id);
    if (!report || report.organizationId !== organizationId) return null;
    report.status = status;
    report.updatedAt = new Date().toISOString();
    return report;
  }
}

class PostgresStore implements AppStore {
  private readonly sql: Sql;

  constructor(sql: Sql) {
    this.sql = sql;
  }

  async close() {
    await this.sql.end();
  }

  private async withAuthUser<T>(authUserId: string, fn: (query: Sql) => Promise<T>): Promise<T> {
    const result = await this.sql.begin(async (tx) => {
      await tx`select set_config('app.auth_user_id', ${authUserId}, true)`;
      return fn(tx as unknown as Sql);
    });
    return result as T;
  }

  private async withAppUser<T>(userId: string, fn: (query: Sql) => Promise<T>): Promise<T> {
    const result = await this.sql.begin(async (tx) => {
      await tx`select set_config('app.user_id', ${userId}, true)`;
      return fn(tx as unknown as Sql);
    });
    return result as T;
  }

  private async withOrganization<T>(organizationId: string, fn: (query: Sql) => Promise<T>): Promise<T> {
    const result = await this.sql.begin(async (tx) => {
      await tx`select set_config('app.organization_id', ${organizationId}, true)`;
      return fn(tx as unknown as Sql);
    });
    return result as T;
  }

  async ensureDevelopmentSeed() {
    if (process.env.NODE_ENV === 'production' || process.env.SEED_DEMO_WORKSPACE !== 'true') return;
    const existing = await this.findUserByAuthId('demo-user');
    if (existing) return;
    await this.sql.begin(async (tx) => {
      const orgRows = await tx`
        insert into organizations (id, name)
        values ('00000000-0000-0000-0000-000000000001', 'Sound Thesis Demo Practice')
        on conflict (id) do update set name = excluded.name
        returning id, name
      `;
      const userRows = await tx`
        insert into users (id, auth_user_id, email, full_name)
        values ('00000000-0000-0000-0000-000000000002', 'demo-user', 'adviser@soundthesis.local', 'Demo Adviser')
        on conflict (auth_user_id) do update set email = excluded.email, full_name = excluded.full_name
        returning id
      `;
      await tx`
        insert into organization_memberships (organization_id, user_id, role)
        values (${orgRows[0].id}, ${userRows[0].id}, 'practice_owner')
        on conflict (organization_id, user_id) do update set status = 'active', role = excluded.role
      `;
      const clientRows = await tx`
        insert into clients (id, organization_id, household_id, first_name, last_name, email)
        values ('00000000-0000-0000-0000-000000000000', ${orgRows[0].id}, '00000000-0000-0000-0000-000000000003', 'Demo', 'Client', 'client@example.com')
        on conflict (id) do update set organization_id = excluded.organization_id
        returning id
      `;
      await tx`
        insert into client_assignments (client_id, user_id, assignment_role)
        values (${clientRows[0].id}, ${userRows[0].id}, 'lead')
        on conflict do nothing
      `;
    });
  }

  async getOrganization(organizationId: string) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`select id, name from organizations where id = ${organizationId} limit 1`;
      return rows[0] ? { id: rows[0].id, name: rows[0].name } : null;
    });
  }

  async findUserByAuthId(authUserId: string) {
    return this.withAuthUser(authUserId, async (query) => {
      const rows = await query`select id, auth_user_id, email, full_name from users where auth_user_id = ${authUserId} limit 1`;
      return mapUser(rows[0]);
    });
  }

  async findUserByEmail(email: string) {
    const rows = await this.sql`select id, auth_user_id, email, full_name from users where email = ${normalizeEmail(email)} limit 1`;
    return mapUser(rows[0]);
  }

  async upsertUser(input: { authUserId: string; email: string; fullName: string | null }) {
    return this.withAuthUser(input.authUserId, async (query) => {
      const rows = await query`
        insert into users (auth_user_id, email, full_name)
        values (${input.authUserId}, ${normalizeEmail(input.email)}, ${input.fullName})
        on conflict (auth_user_id)
        do update set email = excluded.email, full_name = coalesce(excluded.full_name, users.full_name), updated_at = now()
        returning id, auth_user_id, email, full_name
      `;
      return mapUser(rows[0])!;
    });
  }

  async listMemberships(userId: string) {
    return this.withAppUser(userId, async (query) => {
      const rows = await query`
        select m.organization_id, o.name as organization_name, m.role
        from organization_memberships m
        join organizations o on o.id = m.organization_id
        where m.user_id = ${userId} and m.status = 'active'
        order by o.created_at asc
      `;
      return rows.map(mapMembership);
    });
  }

  async createOrganizationForUser(input: { user: UserRecord; practiceName: string; role: Role }) {
    return this.sql.begin(async (tx) => {
      const orgRows = await tx`insert into organizations (name) values (${input.practiceName}) returning id, name`;
      await tx`
        insert into organization_memberships (organization_id, user_id, role)
        values (${orgRows[0].id}, ${input.user.id}, ${input.role})
        on conflict (organization_id, user_id) do nothing
      `;
      return { id: orgRows[0].id, name: orgRows[0].name };
    });
  }

  async addMembership(input: { user: UserRecord; organization: Organization; role: Role }) {
    await this.sql`
      insert into organization_memberships (organization_id, user_id, role)
      values (${input.organization.id}, ${input.user.id}, ${input.role})
      on conflict (organization_id, user_id) do update set status = 'active', updated_at = now()
    `;
    return { organizationId: input.organization.id, organizationName: input.organization.name, role: input.role };
  }

  async listClients(organizationId: string) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`select * from clients where organization_id = ${organizationId} and status = 'active' order by updated_at desc`;
      return Promise.all(rows.map((row) => this.mapClient(row, query)));
    });
  }

  async createClient(organizationId: string, actor: UserRecord, input: Partial<ClientRecord> & { firstName: string; lastName: string }) {
    return this.withOrganization(organizationId, async (query) => {
      const p = clientNameParts(input);
      const rows = await query`
        insert into clients (organization_id, first_name, last_name, preferred_name, email, phone, date_of_birth, marital_status, notes)
        values (${organizationId}, ${p.firstName}, ${p.lastName}, ${p.preferredName}, ${p.email}, ${p.phone}, ${p.dateOfBirth}, ${p.maritalStatus}, ${p.notes})
        returning *
      `;
      await query`insert into client_assignments (client_id, user_id, assignment_role) values (${rows[0].id}, ${actor.id}, 'lead') on conflict do nothing`;
      return this.mapClient(rows[0], query);
    });
  }

  async ensureClientDraftSamples(organizationId: string) {
    await this.withOrganization(organizationId, async (query) => {
      const rows = await query`select id from client_drafts where organization_id = ${organizationId} and is_sample = true limit 1`;
      if (rows[0]) return;
      for (const sample of defaultClientDrafts()) await query`insert into client_drafts (organization_id, name, data, is_sample) values (${organizationId}, ${sample.name}, ${query.json(sample.data as any)}, true)`;
    });
  }
  async listClientDrafts(organizationId: string) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`select * from client_drafts where organization_id = ${organizationId} and status = 'active' order by created_at desc`;
      return rows.map(mapClientDraft).filter((draft): draft is ClientDraft => draft !== null);
    });
  }
  async createClientDraft(organizationId: string, input: { name: string; data: Record<string, unknown>; isSample?: boolean }) {
    return this.withOrganization(organizationId, async (query) => mapClientDraft((await query`insert into client_drafts (organization_id, name, data, is_sample) values (${organizationId}, ${input.name}, ${query.json(input.data as any)}, ${input.isSample ?? false}) returning *`)[0])!);
  }
  async updateClientDraft(organizationId: string, id: string, patch: { name?: string; data?: Record<string, unknown>; status?: 'active' | 'archived' }) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`select * from client_drafts where id = ${id} and organization_id = ${organizationId} limit 1`; if (!rows[0]) return null;
      const current = rows[0]; const next = await query`update client_drafts set name = ${patch.name ?? current.name}, data = ${patch.data ? query.json(patch.data as any) : current.data}, status = ${patch.status ?? current.status}, updated_at = now() where id = ${id} returning *`;
      return mapClientDraft(next[0]);
    });
  }

  async getClient(organizationId: string, clientId: string) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`select * from clients where organization_id = ${organizationId} and id = ${clientId} limit 1`;
      return rows[0] ? this.mapClient(rows[0], query) : null;
    });
  }

  async updateClient(organizationId: string, clientId: string, patch: Partial<ClientRecord>) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`select * from clients where organization_id = ${organizationId} and id = ${clientId} limit 1`;
      if (!rows[0]) return null;
      const current = await this.mapClient(rows[0], query);
      const next = { ...current, ...patch };
      const updatedRows = await query`
        update clients
        set first_name = ${next.firstName}, last_name = ${next.lastName}, preferred_name = ${next.preferredName},
            email = ${next.email}, phone = ${next.phone}, date_of_birth = ${next.dateOfBirth},
            marital_status = ${next.maritalStatus}, notes = ${next.notes}, updated_at = now()
        where organization_id = ${organizationId} and id = ${clientId}
        returning *
      `;
      return this.mapClient(updatedRows[0], query);
    });
  }

  async getProfile(organizationId: string, clientId: string) {
    return this.withOrganization(organizationId, async (query) => {
      const clientRows = await query`select id from clients where organization_id = ${organizationId} and id = ${clientId} limit 1`;
      if (!clientRows[0]) return null;
      const rows = await query`select id, resource_type, data, status from financial_resources where organization_id = ${organizationId} and client_id = ${clientId}`;
      const profile = emptyProfile();
      for (const row of rows) {
        const resource = row.resource_type as ResourceType;
        profile[resource].push({ id: row.id, status: row.status, ...row.data });
      }
      return profile;
    });
  }

  async createResource(organizationId: string, clientId: string, resource: ResourceType, data: Record<string, unknown>) {
    return this.withOrganization(organizationId, async (query) => {
      const clientRows = await query`select id from clients where organization_id = ${organizationId} and id = ${clientId} limit 1`;
      if (!clientRows[0]) return null;
      const rows = await query`
        insert into financial_resources (organization_id, client_id, resource_type, data)
        values (${organizationId}, ${clientId}, ${resource}, ${query.json(data as any)})
        returning id, data, status
      `;
      return { id: rows[0].id, status: rows[0].status, ...rows[0].data };
    });
  }

  async updateResource(organizationId: string, clientId: string, resource: ResourceType, id: string, data: Record<string, unknown>) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`
        update financial_resources
        set data = data || ${query.json(data as any)}::jsonb, updated_at = now()
        where organization_id = ${organizationId} and client_id = ${clientId} and resource_type = ${resource} and id = ${id}
        returning id, data, status
      `;
      return rows[0] ? { id: rows[0].id, status: rows[0].status, ...rows[0].data } : null;
    });
  }

  async archiveResource(organizationId: string, clientId: string, resource: ResourceType, id: string) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`
        update financial_resources set status = 'archived', updated_at = now()
        where organization_id = ${organizationId} and client_id = ${clientId} and resource_type = ${resource} and id = ${id}
        returning id, data, status
      `;
      return rows[0] ? { id: rows[0].id, status: rows[0].status, ...rows[0].data } : null;
    });
  }

  async listPlans(organizationId: string, clientId: string) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`select * from plans where organization_id = ${organizationId} and client_id = ${clientId} and status <> 'archived' order by updated_at desc`;
      return Promise.all(rows.map((row) => this.mapPlan(row, query)));
    });
  }

  async createPlan(organizationId: string, clientId: string, name: string) {
    return this.withOrganization(organizationId, async (query) => {
      const clientRows = await query`select id from clients where organization_id = ${organizationId} and id = ${clientId} limit 1`;
      if (!clientRows[0]) return null;
      const rows = await query`insert into plans (organization_id, client_id, name) values (${organizationId}, ${clientId}, ${name}) returning *`;
      return this.mapPlan(rows[0], query);
    });
  }

  async getPlan(organizationId: string, planId: string) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`select * from plans where organization_id = ${organizationId} and id = ${planId} limit 1`;
      return rows[0] ? this.mapPlan(rows[0], query) : null;
    });
  }

  async updatePlan(organizationId: string, planId: string, patch: Pick<Partial<Plan>, 'name' | 'status'>) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`select * from plans where organization_id = ${organizationId} and id = ${planId} limit 1`;
      if (!rows[0]) return null;
      const current = await this.mapPlan(rows[0], query);
      const updatedRows = await query`
        update plans set name = ${patch.name ?? current.name}, status = ${patch.status ?? current.status}, updated_at = now()
        where organization_id = ${organizationId} and id = ${planId}
        returning *
      `;
      return this.mapPlan(updatedRows[0], query);
    });
  }

  async createPlanVersion(organizationId: string, planId: string, inputSnapshot: Record<string, unknown>, assumptionsSnapshot: Record<string, unknown>) {
    return this.withOrganization(organizationId, async (query) => {
      const planRows = await query`select * from plans where organization_id = ${organizationId} and id = ${planId} limit 1`;
      if (!planRows[0]) return null;
      const plan = await this.mapPlan(planRows[0], query);
      const rows = await query`
        insert into plan_versions (plan_id, version_number, input_snapshot, assumptions_snapshot)
        values (${planId}, ${plan.versions.length + 1}, ${query.json(inputSnapshot as any)}, ${query.json(assumptionsSnapshot as any)})
        returning id, version_number, input_snapshot, assumptions_snapshot
      `;
      await query`update plans set current_version_id = ${rows[0].id}, updated_at = now() where id = ${planId}`;
      return mapPlanVersion(rows[0]);
    });
  }

  async createCalculationRun(input: { organizationId: string; planId: string; planVersionId: string; engineVersion: string; seed: string | null; result: Record<string, unknown> }) {
    return this.withOrganization(input.organizationId, async (query) => {
      const planRows = await query`
        select id from plans where organization_id = ${input.organizationId} and id = ${input.planId} limit 1
      `;
      if (!planRows[0]) return null;
      const versionRows = await query`
        select id from plan_versions where plan_id = ${input.planId} and id = ${input.planVersionId} limit 1
      `;
      if (!versionRows[0]) return null;
      const rows = await query`
        insert into calculation_runs (organization_id, plan_id, plan_version_id, engine_version, seed, result)
        values (${input.organizationId}, ${input.planId}, ${input.planVersionId}, ${input.engineVersion}, ${input.seed}, ${query.json(input.result as any)})
        returning *
      `;
      return mapCalculationRun(rows[0]);
    });
  }

  async getLatestCalculationRun(organizationId: string, planId: string) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`
        select * from calculation_runs
        where organization_id = ${organizationId} and plan_id = ${planId}
        order by created_at desc
        limit 1
      `;
      return mapCalculationRun(rows[0]);
    });
  }

  async recordAuditEvent(input: Omit<AuditEvent, 'id' | 'createdAt'>) {
    return this.withOrganization(input.organizationId, async (query) => {
      const rows = await query`
        insert into audit_events (organization_id, actor_user_id, event_type, subject_type, subject_id, metadata)
        values (${input.organizationId}, ${input.actorUserId}, ${input.eventType}, ${input.subjectType}, ${input.subjectId}, ${query.json(input.metadata as any)})
        returning *
      `;
      return mapAuditEvent(rows[0])!;
    });
  }

  async listAuditEvents(organizationId: string, limit: number) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`
        select * from audit_events
        where organization_id = ${organizationId}
        order by created_at desc
        limit ${limit}
      `;
      return rows.map((row) => mapAuditEvent(row)!);
    });
  }

  async findInvitationByTokenHash(tokenHash: string) {
    const rows = await this.sql`select * from practice_invitations where token_hash = ${tokenHash} and status = 'pending' and expires_at > now() limit 1`;
    return mapInvitation(rows[0]);
  }

  async createInvitation(input: { organizationId: string; tokenHash: string; email: string; role: InviteRole; expiresAt: string }) {
    return this.withOrganization(input.organizationId, async (query) => {
      const rows = await query`
        insert into practice_invitations (organization_id, token_hash, email, role, expires_at)
        values (${input.organizationId}, ${input.tokenHash}, ${normalizeEmail(input.email)}, ${input.role}, ${input.expiresAt})
        returning *
      `;
      return mapInvitation(rows[0])!;
    });
  }

  async listInvitations(organizationId: string) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`select * from practice_invitations where organization_id = ${organizationId} order by created_at desc`;
      return rows.map((row) => mapInvitation(row)!);
    });
  }

  async revokeInvitation(organizationId: string, id: string) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`update practice_invitations set status = 'revoked', updated_at = now() where organization_id = ${organizationId} and id = ${id} returning id`;
      return rows.length > 0;
    });
  }

  async markInvitationAccepted(id: string) {
    await this.sql`update practice_invitations set status = 'accepted', updated_at = now() where id = ${id}`;
  }

  async listReports(organizationId: string, clientId?: string) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = clientId
        ? await query`
            select r.*, c.first_name, c.last_name, c.preferred_name
            from reports r
            join clients c on c.id = r.client_id
            where r.organization_id = ${organizationId} and r.client_id = ${clientId}
            order by r.created_at desc
          `
        : await query`
            select r.*, c.first_name, c.last_name, c.preferred_name
            from reports r
            join clients c on c.id = r.client_id
            where r.organization_id = ${organizationId}
            order by r.created_at desc
          `;
      return rows.map(mapReport);
    });
  }

  async createReport(organizationId: string, clientId: string, kind: ReportKind, name?: string) {
    return this.withOrganization(organizationId, async (query) => {
      const clientRows = await query`select * from clients where organization_id = ${organizationId} and id = ${clientId} limit 1`;
      if (!clientRows[0]) return null;
      const client = await this.mapClient(clientRows[0], query);
      const versionRows = await query`
        select coalesce(max(version), 0)::int + 1 as next_version
        from reports
        where organization_id = ${organizationId} and client_id = ${clientId} and kind = ${kind}
      `;
      const rows = await query`
        insert into reports (organization_id, client_id, kind, name, version, status)
        values (${organizationId}, ${clientId}, ${kind}, ${name || (kind === 'dossier' ? 'Wealth Dossier' : 'Plan Report')}, ${versionRows[0].next_version}, 'review')
        returning *
      `;
      return mapReport({
        ...rows[0],
        first_name: client.firstName,
        last_name: client.lastName,
        preferred_name: client.preferredName,
      });
    });
  }

  async updateReportStatus(organizationId: string, id: string, status: ReportStatus) {
    return this.withOrganization(organizationId, async (query) => {
      const rows = await query`
        update reports
        set status = ${status}, updated_at = now()
        where organization_id = ${organizationId} and id = ${id}
        returning *
      `;
      if (!rows[0]) return null;
      const clientRows = await query`select first_name, last_name, preferred_name from clients where id = ${rows[0].client_id}`;
      return mapReport({ ...rows[0], ...clientRows[0] });
    });
  }
  private async mapClient(row: any, query: Sql = this.sql): Promise<ClientRecord> {
    const assignments = await query`
      select ca.user_id, u.full_name, ca.assignment_role
      from client_assignments ca
      join users u on u.id = ca.user_id
      where ca.client_id = ${row.id}
    `;
    return {
      id: row.id,
      householdId: row.household_id,
      firstName: row.first_name,
      lastName: row.last_name,
      preferredName: row.preferred_name,
      email: row.email,
      phone: row.phone,
      dateOfBirth: row.date_of_birth,
      maritalStatus: row.marital_status,
      notes: row.notes,
      status: row.status,
      assignedPractitioners: assignments.map((assignment) => ({
        userId: assignment.user_id,
        fullName: assignment.full_name,
        assignmentRole: assignment.assignment_role,
      })),
    };
  }

  private async mapPlan(row: any, query: Sql = this.sql): Promise<Plan> {
    const versions = await query`
      select id, version_number, input_snapshot, assumptions_snapshot
      from plan_versions
      where plan_id = ${row.id}
      order by version_number asc
    `;
    return {
      id: row.id,
      clientId: row.client_id,
      name: row.name,
      status: row.status,
      currentVersionId: row.current_version_id,
      versions: versions.map(mapPlanVersion),
    };
  }
}

function mapUser(row: any): UserRecord | null {
  return row ? { id: row.id, authUserId: row.auth_user_id, email: row.email, fullName: row.full_name } : null;
}

function mapClientDraft(row: any): ClientDraft | null {
  if (!row) return null;
  return { id: row.id, name: row.name, status: row.status, isSample: row.is_sample, data: row.data ?? {}, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapMembership(row: any): Membership {
  return { organizationId: row.organization_id, organizationName: row.organization_name, role: row.role };
}

function mapPlanVersion(row: any): PlanVersion {
  return {
    id: row.id,
    versionNumber: row.version_number,
    inputSnapshot: row.input_snapshot ?? {},
    assumptionsSnapshot: row.assumptions_snapshot ?? {},
  };
}

function mapInvitation(row: any): Invitation | null {
  return row
    ? {
        id: row.id,
        tokenHash: row.token_hash,
        email: row.email,
        role: row.role,
        status: row.status,
        organizationId: row.organization_id,
        expiresAt: new Date(row.expires_at).toISOString(),
      }
    : null;
}

function mapReport(row: any): ReportRecord {
  return {
    id: row.id,
    clientId: row.client_id,
    kind: row.kind,
    name: row.name,
    clientName: row.preferred_name || `${row.first_name ?? ''} ${row.last_name ?? ''}`.trim(),
    version: row.version,
    status: row.status,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapCalculationRun(row: any): CalculationRun | null {
  return row
    ? {
        id: row.id,
        planId: row.plan_id,
        planVersionId: row.plan_version_id,
        engineVersion: row.engine_version,
        seed: row.seed,
        result: row.result ?? {},
        createdAt: new Date(row.created_at).toISOString(),
      }
    : null;
}

function mapAuditEvent(row: any): AuditEvent | null {
  return row
    ? {
        id: row.id,
        organizationId: row.organization_id,
        actorUserId: row.actor_user_id,
        eventType: row.event_type,
        subjectType: row.subject_type,
        subjectId: row.subject_id,
        metadata: row.metadata ?? {},
        createdAt: new Date(row.created_at).toISOString(),
      }
    : null;
}
