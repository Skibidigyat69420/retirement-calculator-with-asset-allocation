import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { createClient, type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createStore, emptyProfile, type AppStore } from './store.js';
import type { Actor, ClientRecord, Plan, UserRecord } from './types.js';

const isProduction = process.env.NODE_ENV === 'production';
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

if (isProduction && !supabase) {
  throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required in production.');
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function error(reply: FastifyReply, status: number, code: string, message: string) {
  return reply.status(status).send({ error: { code, message } });
}

function amount(value: Record<string, unknown>): number {
  const raw = value.currentValue ?? value.amount ?? value.balance ?? 0;
  return typeof raw === 'number' && Number.isFinite(raw) ? raw : 0;
}

function sumAmount(items: Record<string, unknown>[]): number {
  return items.reduce((total, item) => total + amount(item), 0);
}

function toClientSummary(client: ClientRecord, profile = emptyProfile()) {
  const assets = profile.assets.filter((item) => item.status !== 'archived');
  const liabilities = profile.liabilities.filter((item) => item.status !== 'archived');
  const totalAssets = sumAmount(assets);
  const totalLiabilities = sumAmount(liabilities);
  return {
    ...client,
    name: client.preferredName || `${client.firstName} ${client.lastName}`.trim(),
    financialSummary: {
      netWorth: totalAssets - totalLiabilities,
      investableAssets: totalAssets,
      totalAssets,
      totalLiabilities,
      assetCount: assets.length,
      byCategory: assets.reduce<Record<string, number>>((acc, item) => {
        const category = typeof item.category === 'string' ? item.category : 'other';
        acc[category] = (acc[category] ?? 0) + amount(item);
        return acc;
      }, {}),
    },
  };
}

function planResponse(plan: Plan) {
  const currentVersion = plan.versions.find((version) => version.id === plan.currentVersionId) ?? null;
  return { ...plan, currentVersion };
}

function fullNameFromSupabase(user: SupabaseUser): string | null {
  const metadataName = user.user_metadata?.full_name ?? user.user_metadata?.name;
  return typeof metadataName === 'string' && metadataName.trim() ? metadataName.trim() : null;
}

async function resolveSupabaseUser(token: string): Promise<SupabaseUser | null> {
  if (!supabase) return null;
  const { data, error: authError } = await supabase.auth.getUser(token);
  if (authError || !data.user?.email) return null;
  return data.user;
}

async function actorFromRequest(store: AppStore, request: FastifyRequest): Promise<Actor | null> {
  const header = request.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return null;

  let user: UserRecord | null = null;
  if (token.startsWith('dev:')) {
    user = await store.findUserByAuthId(token.slice('dev:'.length));
  } else {
    const supabaseUser = await resolveSupabaseUser(token);
    if (!supabaseUser?.email) return null;
    user = await store.findUserByAuthId(supabaseUser.id);
    if (!user) {
      return {
        user: { id: supabaseUser.id, authUserId: supabaseUser.id, email: normalizeEmail(supabaseUser.email), fullName: fullNameFromSupabase(supabaseUser) },
        memberships: [],
        organizationId: null,
      };
    }
  }

  if (!user) return null;
  const memberships = await store.listMemberships(user.id);
  return { user, memberships, organizationId: memberships[0]?.organizationId ?? null };
}

async function requireOrganization(store: AppStore, request: FastifyRequest, reply: FastifyReply): Promise<{ actor: Actor; organizationId: string } | null> {
  const actor = await actorFromRequest(store, request);
  if (!actor) {
    error(reply, 401, 'UNAUTHORIZED', 'Sign in is required.');
    return null;
  }
  if (actor.memberships.length === 0) {
    error(reply, 403, 'ONBOARDING_REQUIRED', 'Your account must be linked to a practice.');
    return null;
  }
  const requested = typeof request.headers['x-organization-id'] === 'string' ? request.headers['x-organization-id'] : null;
  const organizationId = requested && actor.memberships.some((membership) => membership.organizationId === requested) ? requested : actor.organizationId;
  if (!organizationId) {
    error(reply, 400, 'ORGANIZATION_REQUIRED', 'Select a practice first.');
    return null;
  }
  return { actor, organizationId };
}

function roleFor(actor: Actor, organizationId: string) {
  return actor.memberships.find((membership) => membership.organizationId === organizationId)?.role ?? null;
}

function canWrite(actor: Actor, organizationId: string) {
  return roleFor(actor, organizationId) !== 'read_only';
}

function canManageTeam(actor: Actor, organizationId: string) {
  const role = roleFor(actor, organizationId);
  return role === 'practice_owner' || role === 'practice_admin';
}

function requireWriteAccess(reply: FastifyReply, actor: Actor, organizationId: string) {
  if (canWrite(actor, organizationId)) return true;
  error(reply, 403, 'FORBIDDEN', 'Your role cannot modify this workspace.');
  return false;
}

function requireTeamAccess(reply: FastifyReply, actor: Actor, organizationId: string) {
  if (canManageTeam(actor, organizationId)) return true;
  error(reply, 403, 'FORBIDDEN', 'Only practice owners and admins can manage invitations.');
  return false;
}

export async function buildApp(store: AppStore = createStore()) {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  await app.register(cors, { origin: isProduction ? false : true, credentials: true });
  await store.ensureDevelopmentSeed();

  app.addHook('onClose', async () => {
    await store.close();
  });

  app.get('/health', async () => ({ ok: true, service: 'soundthesis-api', persistence: process.env.DATABASE_URL ? 'postgres' : 'memory' }));

  app.post('/api/v1/auth/dev-login', async (request, reply) => {
    if (isProduction) return error(reply, 404, 'NOT_FOUND', 'Not found.');
    const body = z.object({ email: z.string().email() }).parse(request.body);
    const user = await store.findUserByEmail(body.email);
    if (!user) return error(reply, 401, 'INVALID_CREDENTIALS', 'No demo user exists for this email.');
    return {
      token: `dev:${user.authUserId}`,
      tokenType: 'Bearer',
      expiresIn: 60 * 60 * 8,
      user: { id: user.id, email: user.email, fullName: user.fullName },
      memberships: await store.listMemberships(user.id),
    };
  });

  app.get('/api/v1/auth/session', async (request, reply) => {
    const actor = await actorFromRequest(store, request);
    if (!actor) return error(reply, 401, 'UNAUTHORIZED', 'Session could not be verified.');
    return { user: { id: actor.user.id, email: actor.user.email, fullName: actor.user.fullName }, memberships: actor.memberships };
  });

  app.post('/api/v1/auth/onboarding/practice', async (request, reply) => {
    const actor = await actorFromRequest(store, request);
    if (!actor) return error(reply, 401, 'UNAUTHORIZED', 'Session could not be verified.');
    const body = z.object({ fullName: z.string().trim().min(1), practiceName: z.string().trim().min(1) }).parse(request.body);
    const user = await store.upsertUser({ authUserId: actor.user.authUserId, email: actor.user.email, fullName: body.fullName });
    const memberships = await store.listMemberships(user.id);
    if (memberships[0]) return { organization: { id: memberships[0].organizationId, name: memberships[0].organizationName } };
    return { organization: await store.createOrganizationForUser({ user, practiceName: body.practiceName, role: 'practice_owner' }) };
  });

  app.post('/api/v1/auth/invitations/accept', async (request, reply) => {
    const actor = await actorFromRequest(store, request);
    if (!actor) return error(reply, 401, 'UNAUTHORIZED', 'Session could not be verified.');
    const body = z.object({ token: z.string().min(20), fullName: z.string().trim().min(1) }).parse(request.body);
    const invitation = await store.findInvitationByTokenHash(tokenHash(body.token));
    if (!invitation || invitation.status !== 'pending') return error(reply, 404, 'INVITATION_NOT_FOUND', 'Invitation is not active.');
    if (Date.parse(invitation.expiresAt) < Date.now()) return error(reply, 410, 'INVITATION_EXPIRED', 'Invitation has expired.');
    if (normalizeEmail(invitation.email) !== normalizeEmail(actor.user.email)) return error(reply, 403, 'INVITATION_EMAIL_MISMATCH', 'Sign in with the invited email address.');
    const user = await store.upsertUser({ authUserId: actor.user.authUserId, email: actor.user.email, fullName: body.fullName });
    const organization = await store.getOrganization(invitation.organizationId);
    if (!organization) return error(reply, 404, 'ORGANIZATION_NOT_FOUND', 'Practice was not found.');
    await store.addMembership({ user, organization, role: invitation.role });
    await store.markInvitationAccepted(invitation.id);
    return { organization };
  });

  app.get('/api/v1/fx/rates', async () => ({
    base: 'INR',
    rates: { INR: 1, USD: 83.2, EUR: 90.1, GBP: 105.5 },
    currencies: ['INR', 'USD', 'EUR', 'GBP'],
    asOf: new Date().toISOString().slice(0, 10),
    fetchedAt: new Date().toISOString(),
    source: 'bundled-fallback',
    stale: false,
  }));

  app.get('/api/v1/clients', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const rows = await store.listClients(scoped.organizationId);
    return { data: await Promise.all(rows.map(async (client) => toClientSummary(client, (await store.getProfile(scoped.organizationId, client.id)) ?? emptyProfile()))) };
  });

  app.post('/api/v1/clients', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const body = z.object({ firstName: z.string().trim().min(1), lastName: z.string().trim().min(1), preferredName: z.string().trim().optional(), email: z.string().email().optional(), phone: z.string().trim().optional() }).parse(request.body);
    return reply.status(201).send(toClientSummary(await store.createClient(scoped.organizationId, scoped.actor.user, body)));
  });

  app.get('/api/v1/clients/:clientId', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const client = await store.getClient(scoped.organizationId, clientId);
    if (!client) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    return toClientSummary(client, (await store.getProfile(scoped.organizationId, client.id)) ?? emptyProfile());
  });

  app.patch('/api/v1/clients/:clientId', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const body = z.object({ firstName: z.string().trim().optional(), lastName: z.string().trim().optional(), preferredName: z.string().trim().nullable().optional(), email: z.string().email().nullable().optional(), phone: z.string().trim().nullable().optional(), dateOfBirth: z.string().nullable().optional(), maritalStatus: z.string().nullable().optional(), notes: z.string().nullable().optional() }).parse(request.body);
    const client = await store.updateClient(scoped.organizationId, clientId, body);
    if (!client) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    return toClientSummary(client, (await store.getProfile(scoped.organizationId, client.id)) ?? emptyProfile());
  });

  app.get('/api/v1/clients/:clientId/profile', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const profile = await store.getProfile(scoped.organizationId, clientId);
    if (!profile) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    return { ...profile, netWorth: sumAmount(profile.assets) - sumAmount(profile.liabilities), totals: { assets: sumAmount(profile.assets), liabilities: sumAmount(profile.liabilities) } };
  });

  for (const resource of ['assets', 'liabilities', 'cashflows', 'goals'] as const) {
    app.post(`/api/v1/clients/:clientId/${resource}`, async (request, reply) => {
      const scoped = await requireOrganization(store, request, reply);
      if (!scoped) return;
      if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
      const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
      const record = await store.createResource(scoped.organizationId, clientId, resource, request.body as Record<string, unknown>);
      if (!record) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
      return reply.status(201).send(record);
    });

    app.patch(`/api/v1/clients/:clientId/${resource}/:id`, async (request, reply) => {
      const scoped = await requireOrganization(store, request, reply);
      if (!scoped) return;
      if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
      const params = z.object({ clientId: z.string(), id: z.string() }).parse(request.params);
      const record = await store.updateResource(scoped.organizationId, params.clientId, resource, params.id, request.body as Record<string, unknown>);
      if (!record) return error(reply, 404, 'RESOURCE_NOT_FOUND', 'Resource was not found.');
      return record;
    });
  }

  for (const resource of ['assets', 'liabilities'] as const) {
    app.post(`/api/v1/clients/:clientId/${resource}/:id/archive`, async (request, reply) => {
      const scoped = await requireOrganization(store, request, reply);
      if (!scoped) return;
      if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
      const params = z.object({ clientId: z.string(), id: z.string() }).parse(request.params);
      const record = await store.archiveResource(scoped.organizationId, params.clientId, resource, params.id);
      if (!record) return error(reply, 404, 'RESOURCE_NOT_FOUND', 'Resource was not found.');
      return record;
    });
  }

  app.get('/api/v1/clients/:clientId/plans', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const rows = await store.listPlans(scoped.organizationId, clientId);
    return { data: rows.map((plan) => ({ id: plan.id, clientId: plan.clientId, name: plan.name, status: plan.status })) };
  });

  app.get('/api/v1/reports', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const query = z.object({ clientId: z.string().optional() }).parse(request.query);
    return { data: await store.listReports(scoped.organizationId, query.clientId) };
  });

  app.post('/api/v1/clients/:clientId/reports', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const body = z.object({
      kind: z.enum(['plan-report', 'dossier']).default('dossier'),
      name: z.string().trim().min(1).optional(),
    }).parse(request.body ?? {});
    const report = await store.createReport(scoped.organizationId, clientId, body.kind, body.name);
    if (!report) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    return reply.status(201).send(report);
  });

  app.patch('/api/v1/reports/:reportId', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { reportId } = z.object({ reportId: z.string() }).parse(request.params);
    const body = z.object({ status: z.enum(['draft', 'review', 'approved', 'archived']) }).parse(request.body);
    const report = await store.updateReportStatus(scoped.organizationId, reportId, body.status);
    if (!report) return error(reply, 404, 'REPORT_NOT_FOUND', 'Report was not found.');
    return report;
  });

  app.post('/api/v1/reports/:reportId/archive', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { reportId } = z.object({ reportId: z.string() }).parse(request.params);
    const report = await store.updateReportStatus(scoped.organizationId, reportId, 'archived');
    if (!report) return error(reply, 404, 'REPORT_NOT_FOUND', 'Report was not found.');
    return report;
  });

  app.get('/api/v1/reports/:reportId/download-url', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { reportId } = z.object({ reportId: z.string() }).parse(request.params);
    const report = (await store.listReports(scoped.organizationId)).find((item) => item.id === reportId);
    if (!report) return error(reply, 404, 'REPORT_NOT_FOUND', 'Report was not found.');
    return {
      url: `/dossier?reportId=${encodeURIComponent(report.id)}&clientId=${encodeURIComponent(report.clientId)}&autoPrint=true`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
    };
  });

  app.post('/api/v1/clients/:clientId/plans', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const body = z.object({ name: z.string().trim().min(1).default('New Financial Plan') }).parse(request.body ?? {});
    const plan = await store.createPlan(scoped.organizationId, clientId, body.name);
    if (!plan) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    return reply.status(201).send(planResponse(plan));
  });

  app.get('/api/v1/plans/:planId', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { planId } = z.object({ planId: z.string() }).parse(request.params);
    const plan = await store.getPlan(scoped.organizationId, planId);
    if (!plan) return error(reply, 404, 'PLAN_NOT_FOUND', 'Plan was not found.');
    return planResponse(plan);
  });

  app.patch('/api/v1/plans/:planId', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { planId } = z.object({ planId: z.string() }).parse(request.params);
    const body = z.object({ name: z.string().trim().min(1).optional(), status: z.enum(['draft', 'active', 'archived']).optional() }).parse(request.body);
    const plan = await store.updatePlan(scoped.organizationId, planId, body);
    if (!plan) return error(reply, 404, 'PLAN_NOT_FOUND', 'Plan was not found.');
    return planResponse(plan);
  });

  app.delete('/api/v1/plans/:planId', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { planId } = z.object({ planId: z.string() }).parse(request.params);
    const plan = await store.updatePlan(scoped.organizationId, planId, { status: 'archived' });
    if (!plan) return error(reply, 404, 'PLAN_NOT_FOUND', 'Plan was not found.');
    return planResponse(plan);
  });

  app.post('/api/v1/plans/:planId/versions', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { planId } = z.object({ planId: z.string() }).parse(request.params);
    const body = z.object({ inputSnapshot: z.record(z.string(), z.unknown()).default({}), assumptionsSnapshot: z.record(z.string(), z.unknown()).default({}) }).parse(request.body ?? {});
    const version = await store.createPlanVersion(scoped.organizationId, planId, body.inputSnapshot, body.assumptionsSnapshot);
    if (!version) return error(reply, 404, 'PLAN_NOT_FOUND', 'Plan was not found.');
    return reply.status(201).send(version);
  });

  app.post('/api/v1/plans/:planId/calculate', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { planId } = z.object({ planId: z.string() }).parse(request.params);
    const plan = await store.getPlan(scoped.organizationId, planId);
    if (!plan) return error(reply, 404, 'PLAN_NOT_FOUND', 'Plan was not found.');
    const profile = (await store.getProfile(scoped.organizationId, plan.clientId)) ?? emptyProfile();
    const netWorth = sumAmount(profile.assets) - sumAmount(profile.liabilities);
    return { result: { netWorth, requiredCorpus: 0, projectedCorpus: Math.max(netWorth, 0), fundingRatio: netWorth > 0 ? 1 : 0, probabilityOfSuccess: netWorth > 0 ? 0.75 : 0.5 }, baseScenarioRecalculated: true };
  });

  app.get('/api/v1/clients/:clientId/export', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const client = await store.getClient(scoped.organizationId, clientId);
    if (!client) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    const profile = (await store.getProfile(scoped.organizationId, clientId)) ?? emptyProfile();
    const plans = await store.listPlans(scoped.organizationId, clientId);
    reply.header('content-type', 'application/json');
    return { client: toClientSummary(client, profile), profile, plans: plans.map(planResponse) };
  });

  app.get('/api/v1/organizations/current/invitations', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireTeamAccess(reply, scoped.actor, scoped.organizationId)) return;
    return { data: (await store.listInvitations(scoped.organizationId)).map(({ tokenHash: _tokenHash, ...invitation }) => invitation) };
  });

  app.post('/api/v1/organizations/current/invitations', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireTeamAccess(reply, scoped.actor, scoped.organizationId)) return;
    const body = z.object({ email: z.string().email(), role: z.enum(['practice_admin', 'wealth_practitioner', 'associate', 'read_only']) }).parse(request.body);
    const token = randomUUID().replaceAll('-', '') + randomUUID().replaceAll('-', '');
    const invitation = await store.createInvitation({ organizationId: scoped.organizationId, tokenHash: tokenHash(token), email: body.email, role: body.role, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString() });
    return reply.status(201).send({ ...invitation, token });
  });

  app.post('/api/v1/organizations/current/invitations/:id/revoke', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireTeamAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { id } = z.object({ id: z.string() }).parse(request.params);
    const revoked = await store.revokeInvitation(scoped.organizationId, id);
    if (!revoked) return error(reply, 404, 'INVITATION_NOT_FOUND', 'Invitation was not found.');
    return { ok: true };
  });

  app.setErrorHandler((err, _request, reply) => {
    if (err instanceof z.ZodError) {
      error(reply, 400, 'VALIDATION_ERROR', err.issues[0]?.message ?? 'Request body is invalid.');
      return;
    }
    app.log.error(err);
    error(reply, 500, 'INTERNAL_ERROR', 'Something went wrong.');
  });

  return app;
}
