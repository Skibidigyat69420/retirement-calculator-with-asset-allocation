import { randomUUID } from 'node:crypto';
import postgres, { type Sql } from 'postgres';
import type {
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
  getClient(organizationId: string, clientId: string): Promise<ClientRecord | null>;
  updateClient(organizationId: string, clientId: string, patch: Partial<ClientRecord>): Promise<ClientRecord | null>;
  getProfile(organizationId: string, clientId: string): Promise<Profile | null>;
  createResource(organizationId: string, clientId: string, resource: ResourceType, data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  updateResource(organizationId: string, clientId: string, resource: ResourceType, id: string, data: Record<string, unknown>): Promise<Record<string, unknown> | null>;
  archiveResource(organizationId: string, clientId: string, resource: 'assets' | 'liabilities', id: string): Promise<Record<string, unknown> | null>;
  listPlans(organizationId: string, clientId: string): Promise<Plan[]>;
  createPlan(organizationId: string, clientId: string, name: string): Promise<Plan | null>;
  getPlan(organizationId: string, planId: string): Promise<Plan | null>;
  updatePlan(organizationId: string, planId: string, patch: Pick<Partial<Plan>, 'name' | 'status'>): Promise<Plan | null>;
  createPlanVersion(organizationId: string, planId: string, inputSnapshot: Record<string, unknown>, assumptionsSnapshot: Record<string, unknown>): Promise<PlanVersion | null>;
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
  return new MemoryStore();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

  async archiveResource(organizationId: string, clientId: string, resource: 'assets' | 'liabilities', id: string) {
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
    const rows = await this.sql`select id, name from organizations where id = ${organizationId} limit 1`;
    return rows[0] ? { id: rows[0].id, name: rows[0].name } : null;
  }

  async findUserByAuthId(authUserId: string) {
    const rows = await this.sql`select id, auth_user_id, email, full_name from users where auth_user_id = ${authUserId} limit 1`;
    return mapUser(rows[0]);
  }

  async findUserByEmail(email: string) {
    const rows = await this.sql`select id, auth_user_id, email, full_name from users where email = ${normalizeEmail(email)} limit 1`;
    return mapUser(rows[0]);
  }

  async upsertUser(input: { authUserId: string; email: string; fullName: string | null }) {
    const rows = await this.sql`
      insert into users (auth_user_id, email, full_name)
      values (${input.authUserId}, ${normalizeEmail(input.email)}, ${input.fullName})
      on conflict (auth_user_id)
      do update set email = excluded.email, full_name = coalesce(excluded.full_name, users.full_name), updated_at = now()
      returning id, auth_user_id, email, full_name
    `;
    return mapUser(rows[0])!;
  }

  async listMemberships(userId: string) {
    const rows = await this.sql`
      select m.organization_id, o.name as organization_name, m.role
      from organization_memberships m
      join organizations o on o.id = m.organization_id
      where m.user_id = ${userId} and m.status = 'active'
      order by o.created_at asc
    `;
    return rows.map(mapMembership);
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
    const rows = await this.sql`select * from clients where organization_id = ${organizationId} and status = 'active' order by updated_at desc`;
    return Promise.all(rows.map((row) => this.mapClient(row)));
  }

  async createClient(organizationId: string, actor: UserRecord, input: Partial<ClientRecord> & { firstName: string; lastName: string }) {
    return this.sql.begin(async (tx) => {
      const p = clientNameParts(input);
      const rows = await tx`
        insert into clients (organization_id, first_name, last_name, preferred_name, email, phone, date_of_birth, marital_status, notes)
        values (${organizationId}, ${p.firstName}, ${p.lastName}, ${p.preferredName}, ${p.email}, ${p.phone}, ${p.dateOfBirth}, ${p.maritalStatus}, ${p.notes})
        returning *
      `;
      await tx`insert into client_assignments (client_id, user_id, assignment_role) values (${rows[0].id}, ${actor.id}, 'lead') on conflict do nothing`;
      return this.mapClient(rows[0], tx as unknown as Sql);
    });
  }

  async getClient(organizationId: string, clientId: string) {
    const rows = await this.sql`select * from clients where organization_id = ${organizationId} and id = ${clientId} limit 1`;
    return rows[0] ? this.mapClient(rows[0]) : null;
  }

  async updateClient(organizationId: string, clientId: string, patch: Partial<ClientRecord>) {
    const current = await this.getClient(organizationId, clientId);
    if (!current) return null;
    const next = { ...current, ...patch };
    const rows = await this.sql`
      update clients
      set first_name = ${next.firstName}, last_name = ${next.lastName}, preferred_name = ${next.preferredName},
          email = ${next.email}, phone = ${next.phone}, date_of_birth = ${next.dateOfBirth},
          marital_status = ${next.maritalStatus}, notes = ${next.notes}, updated_at = now()
      where organization_id = ${organizationId} and id = ${clientId}
      returning *
    `;
    return this.mapClient(rows[0]);
  }

  async getProfile(organizationId: string, clientId: string) {
    if (!(await this.getClient(organizationId, clientId))) return null;
    const rows = await this.sql`select id, resource_type, data, status from financial_resources where organization_id = ${organizationId} and client_id = ${clientId}`;
    const profile = emptyProfile();
    for (const row of rows) {
      const resource = row.resource_type as ResourceType;
      profile[resource].push({ id: row.id, status: row.status, ...row.data });
    }
    return profile;
  }

  async createResource(organizationId: string, clientId: string, resource: ResourceType, data: Record<string, unknown>) {
    if (!(await this.getClient(organizationId, clientId))) return null;
    const rows = await this.sql`
      insert into financial_resources (organization_id, client_id, resource_type, data)
      values (${organizationId}, ${clientId}, ${resource}, ${this.sql.json(data as any)})
      returning id, data, status
    `;
    return { id: rows[0].id, status: rows[0].status, ...rows[0].data };
  }

  async updateResource(organizationId: string, clientId: string, resource: ResourceType, id: string, data: Record<string, unknown>) {
    const rows = await this.sql`
      update financial_resources
      set data = data || ${this.sql.json(data as any)}::jsonb, updated_at = now()
      where organization_id = ${organizationId} and client_id = ${clientId} and resource_type = ${resource} and id = ${id}
      returning id, data, status
    `;
    return rows[0] ? { id: rows[0].id, status: rows[0].status, ...rows[0].data } : null;
  }

  async archiveResource(organizationId: string, clientId: string, resource: 'assets' | 'liabilities', id: string) {
    const rows = await this.sql`
      update financial_resources set status = 'archived', updated_at = now()
      where organization_id = ${organizationId} and client_id = ${clientId} and resource_type = ${resource} and id = ${id}
      returning id, data, status
    `;
    return rows[0] ? { id: rows[0].id, status: rows[0].status, ...rows[0].data } : null;
  }

  async listPlans(organizationId: string, clientId: string) {
    const rows = await this.sql`select * from plans where organization_id = ${organizationId} and client_id = ${clientId} and status <> 'archived' order by updated_at desc`;
    return Promise.all(rows.map((row) => this.mapPlan(row)));
  }

  async createPlan(organizationId: string, clientId: string, name: string) {
    if (!(await this.getClient(organizationId, clientId))) return null;
    const rows = await this.sql`insert into plans (organization_id, client_id, name) values (${organizationId}, ${clientId}, ${name}) returning *`;
    return this.mapPlan(rows[0]);
  }

  async getPlan(organizationId: string, planId: string) {
    const rows = await this.sql`select * from plans where organization_id = ${organizationId} and id = ${planId} limit 1`;
    return rows[0] ? this.mapPlan(rows[0]) : null;
  }

  async updatePlan(organizationId: string, planId: string, patch: Pick<Partial<Plan>, 'name' | 'status'>) {
    const current = await this.getPlan(organizationId, planId);
    if (!current) return null;
    const rows = await this.sql`
      update plans set name = ${patch.name ?? current.name}, status = ${patch.status ?? current.status}, updated_at = now()
      where organization_id = ${organizationId} and id = ${planId}
      returning *
    `;
    return this.mapPlan(rows[0]);
  }

  async createPlanVersion(organizationId: string, planId: string, inputSnapshot: Record<string, unknown>, assumptionsSnapshot: Record<string, unknown>) {
    const plan = await this.getPlan(organizationId, planId);
    if (!plan) return null;
    return this.sql.begin(async (tx) => {
      const rows = await tx`
        insert into plan_versions (plan_id, version_number, input_snapshot, assumptions_snapshot)
        values (${planId}, ${plan.versions.length + 1}, ${tx.json(inputSnapshot as any)}, ${tx.json(assumptionsSnapshot as any)})
        returning id, version_number, input_snapshot, assumptions_snapshot
      `;
      await tx`update plans set current_version_id = ${rows[0].id}, updated_at = now() where id = ${planId}`;
      return mapPlanVersion(rows[0]);
    });
  }

  async findInvitationByTokenHash(tokenHash: string) {
    const rows = await this.sql`select * from practice_invitations where token_hash = ${tokenHash} limit 1`;
    return mapInvitation(rows[0]);
  }

  async createInvitation(input: { organizationId: string; tokenHash: string; email: string; role: InviteRole; expiresAt: string }) {
    const rows = await this.sql`
      insert into practice_invitations (organization_id, token_hash, email, role, expires_at)
      values (${input.organizationId}, ${input.tokenHash}, ${normalizeEmail(input.email)}, ${input.role}, ${input.expiresAt})
      returning *
    `;
    return mapInvitation(rows[0])!;
  }

  async listInvitations(organizationId: string) {
    const rows = await this.sql`select * from practice_invitations where organization_id = ${organizationId} order by created_at desc`;
    return rows.map((row) => mapInvitation(row)!);
  }

  async revokeInvitation(organizationId: string, id: string) {
    const rows = await this.sql`update practice_invitations set status = 'revoked', updated_at = now() where organization_id = ${organizationId} and id = ${id} returning id`;
    return rows.length > 0;
  }

  async markInvitationAccepted(id: string) {
    await this.sql`update practice_invitations set status = 'accepted', updated_at = now() where id = ${id}`;
  }

  async listReports(organizationId: string, clientId?: string) {
    const rows = clientId
      ? await this.sql`
          select r.*, c.first_name, c.last_name, c.preferred_name
          from reports r
          join clients c on c.id = r.client_id
          where r.organization_id = ${organizationId} and r.client_id = ${clientId}
          order by r.created_at desc
        `
      : await this.sql`
          select r.*, c.first_name, c.last_name, c.preferred_name
          from reports r
          join clients c on c.id = r.client_id
          where r.organization_id = ${organizationId}
          order by r.created_at desc
        `;
    return rows.map(mapReport);
  }

  async createReport(organizationId: string, clientId: string, kind: ReportKind, name?: string) {
    const client = await this.getClient(organizationId, clientId);
    if (!client) return null;
    const versionRows = await this.sql`
      select coalesce(max(version), 0)::int + 1 as next_version
      from reports
      where organization_id = ${organizationId} and client_id = ${clientId} and kind = ${kind}
    `;
    const rows = await this.sql`
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
  }

  async updateReportStatus(organizationId: string, id: string, status: ReportStatus) {
    const rows = await this.sql`
      update reports
      set status = ${status}, updated_at = now()
      where organization_id = ${organizationId} and id = ${id}
      returning *
    `;
    if (!rows[0]) return null;
    const clientRows = await this.sql`select first_name, last_name, preferred_name from clients where id = ${rows[0].client_id}`;
    return mapReport({ ...rows[0], ...clientRows[0] });
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

  private async mapPlan(row: any): Promise<Plan> {
    const versions = await this.sql`
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
