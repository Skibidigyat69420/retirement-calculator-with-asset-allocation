import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import { createClient, type SupabaseClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { createStore, emptyProfile, type AppStore } from './store.js';
import { calculatePlan } from './calculations.js';
import { getInrFxRates } from './fx.js';
import type { Actor, ClientRecord, ClientRiskProfile, Plan, RiskAssessment, UserRecord } from './types.js';

const isProduction = process.env.NODE_ENV === 'production';
const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();

// Kept server-side so a bearer-link submission cannot manufacture a score that
// is not one of the options presented by the shared questionnaire.
const RISK_QUESTION_SCORES: Record<string, number[]> = {
  'time-horizon-main': [1, 3, 5, 8, 10], 'time-horizon-retirement': [1, 3, 5, 8, 10],
  'loss-reaction': [1, 3, 6, 9, 10], 'drawdown-tolerance': [1, 3, 5, 8, 10],
  'income-stability': [1, 3, 5, 7, 10], 'net-worth-income': [1, 3, 5, 8, 10],
  experience: [1, 3, 5, 8, 10], 'understanding-risk': [1, 3, 5, 8, 10],
  'emergency-fund': [1, 3, 5, 8, 10], 'liquidity-needs': [1, 3, 5, 8, 10],
  'goal-timing-flexibility': [1, 3, 5, 8, 10], 'past-behavior': [1, 3, 5, 8, 10],
  'regret-reaction': [1, 3, 7, 10], 'portfolio-concentration': [1, 3, 5, 8, 10],
};

const RISK_DIMENSIONS = [
  { ids: ['time-horizon-main', 'time-horizon-retirement'], weight: 0.15 },
  { ids: ['loss-reaction', 'drawdown-tolerance'], weight: 0.25 },
  { ids: ['income-stability', 'net-worth-income'], weight: 0.20 },
  { ids: ['experience', 'understanding-risk'], weight: 0.15 },
  { ids: ['emergency-fund', 'liquidity-needs'], weight: 0.10 },
  { ids: ['goal-timing-flexibility'], weight: 0.05 },
  { ids: ['past-behavior', 'regret-reaction'], weight: 0.05 },
  { ids: ['portfolio-concentration'], weight: 0.05 },
] as const;

function calculateRiskVerdict(answers: Record<string, number>) {
  const score = Math.round(RISK_DIMENSIONS.reduce((total, dimension) => {
    const raw = dimension.ids.reduce((sum, id) => sum + answers[id], 0);
    const max = dimension.ids.length * 10;
    return total + (raw / max) * 100 * dimension.weight;
  }, 0));
  const verdict = score >= 70 ? 'Aggressive' : score >= 55 ? 'Growth' : score >= 40 ? 'Balanced' : score >= 25 ? 'Moderate' : 'Conservative';
  return { score, verdict };
}

function hasValidRiskAnswers(answers: Record<string, number>, requireComplete: boolean): boolean {
  const ids = Object.keys(RISK_QUESTION_SCORES);
  if (requireComplete && Object.keys(answers).length !== ids.length) return false;
  return Object.entries(answers).every(([id, score]) => RISK_QUESTION_SCORES[id]?.includes(score));
}

let supabase: SupabaseClient | null = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

if (isProduction && !supabase) {
  console.warn('[WARN] SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are not configured. Supabase auth will be unavailable.');
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

type PortableRiskProfile = {
  version: 1;
  type: 'soundthesis-risk-profile';
  exportedAt: string;
  expiresAt: string;
  answers: Record<string, number>;
};

function riskProfileExportKey(): string | null {
  // Production database deployments already require FIELD_ENCRYPTION_KEY. It
  // is safe to derive a separate HMAC key from that secret, while allowing a
  // dedicated rotation key if the practice supplies one.
  const key = process.env.RISK_PROFILE_EXPORT_KEY?.trim() || process.env.FIELD_ENCRYPTION_KEY?.trim();
  if (key) return key;
  return isProduction ? null : 'soundthesis-development-risk-profile-export-key';
}

function signPortableRiskProfile(payload: PortableRiskProfile): string | null {
  const key = riskProfileExportKey();
  if (!key) return null;
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', key).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

function readPortableRiskProfile(code: string): PortableRiskProfile | null {
  const key = riskProfileExportKey();
  const [encoded, signature, ...rest] = code.trim().split('.');
  if (!key || !encoded || !signature || rest.length > 0) return null;
  const expected = createHmac('sha256', key).update(encoded).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const payload = z.object({
      version: z.literal(1),
      type: z.literal('soundthesis-risk-profile'),
      exportedAt: z.string().datetime(),
      expiresAt: z.string().datetime(),
      answers: z.record(z.string(), z.number().int().min(1).max(10)),
    }).parse(JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')));
    if (Date.parse(payload.expiresAt) <= Date.now() || !hasValidRiskAnswers(payload.answers, false)) return null;
    return payload;
  } catch {
    return null;
  }
}

function publicRiskAssessmentResponse(assessment: RiskAssessment, profile?: ClientRiskProfile | null) {
  return {
    id: assessment.id,
    recipientName: assessment.recipientName,
    status: assessment.status,
    answers: assessment.answers,
    answerDetails: assessment.answerDetails,
    riskScore: assessment.riskScore,
    riskVerdict: assessment.riskVerdict,
    expiresAt: assessment.expiresAt,
    sentAt: assessment.sentAt,
    openedAt: assessment.openedAt,
    reminderSentAt: assessment.reminderSentAt,
    revokedAt: assessment.revokedAt,
    workflowStatus: profile?.workflowStatus ?? null,
    clientConfirmedAt: profile?.clientConfirmedAt ?? null,
    completedAt: assessment.completedAt,
    createdAt: assessment.createdAt,
    updatedAt: assessment.updatedAt,
  };
}

function adviserRiskAssessmentResponse(assessment: RiskAssessment, client: ClientRecord) {
  return {
    ...publicRiskAssessmentResponse(assessment),
    clientId: client.id,
    clientName: client.preferredName || `${client.firstName} ${client.lastName}`.trim(),
  };
}

function sharedRiskProfileResponse(profile: ClientRiskProfile) {
  return {
    id: profile.id,
    status: profile.status,
    source: profile.source,
    workflowStatus: profile.workflowStatus,
    answers: profile.answers,
    answerDetails: profile.answerDetails,
    riskScore: profile.riskScore,
    riskVerdict: profile.riskVerdict,
    completedAt: profile.completedAt,
    submittedAt: profile.submittedAt,
    reviewedAt: profile.reviewedAt,
    appliedAt: profile.appliedAt,
    clientConfirmedAt: profile.clientConfirmedAt,
    version: profile.version,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function error(reply: FastifyReply, status: number, code: string, message: string) {
  return reply.status(status).send({ error: { code, message } });
}

async function audit(
  store: AppStore,
  actor: Actor,
  organizationId: string,
  eventType: string,
  subjectType: string,
  subjectId: string,
  metadata: Record<string, unknown> = {},
) {
  await store.recordAuditEvent({
    organizationId,
    actorUserId: actor.user.id,
    eventType,
    subjectType,
    subjectId,
    metadata,
  });
}

function amount(value: Record<string, unknown>): number {
  const raw = value.currentValue ?? value.amount ?? value.balance ?? value.outstandingAmount ?? value.principal ?? 0;
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

function hasPracticeWideClientAccess(actor: Actor, organizationId: string) {
  const role = roleFor(actor, organizationId);
  return role === 'practice_owner' || role === 'practice_admin';
}

async function requireClientAccess(store: AppStore, scoped: { actor: Actor; organizationId: string }, reply: FastifyReply, clientId: string) {
  const client = await store.getClient(scoped.organizationId, clientId);
  if (!client || (!hasPracticeWideClientAccess(scoped.actor, scoped.organizationId) && !client.assignedPractitioners.some((assignment) => assignment.userId === scoped.actor.user.id))) {
    error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    return null;
  }
  return client;
}

async function requirePlanAccess(store: AppStore, scoped: { actor: Actor; organizationId: string }, reply: FastifyReply, planId: string) {
  const plan = await store.getPlan(scoped.organizationId, planId);
  if (!plan) { error(reply, 404, 'PLAN_NOT_FOUND', 'Plan was not found.'); return null; }
  const client = await requireClientAccess(store, scoped, reply, plan.clientId);
  return client ? plan : null;
}

export async function buildApp(store: AppStore = createStore()) {
  const app = Fastify({ logger: { level: process.env.LOG_LEVEL ?? 'info' } });
  const allowedOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean);
  await app.register(cors, {
    origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });
  await store.ensureDevelopmentSeed();

  app.addHook('onClose', async () => {
    await store.close();
  });

  app.get('/health', async () => ({ ok: true, service: 'soundthesis-api', persistence: process.env.DATABASE_URL ? 'postgres' : 'memory' }));

  app.post('/api/v1/auth/dev-login', async (request, reply) => {
    if (isProduction && process.env.AUTH_MODE !== 'dev') return error(reply, 404, 'NOT_FOUND', 'Not found.');
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

  app.get('/api/v1/fx/rates', async () => getInrFxRates());

  // Public, bearer-link risk profiler. The token is never persisted in clear
  // text and no client identity, plan, allocation or practice data is exposed.
  app.get('/api/v1/public/risk-assessments/:token', async (request, reply) => {
    const { token } = z.object({ token: z.string().min(32).max(256) }).parse(request.params);
    const hash = tokenHash(token);
    const assessment = await store.markRiskAssessmentOpened(hash) ?? await store.getRiskAssessmentByTokenHash(hash);
    if (!assessment) return error(reply, 404, 'RISK_ASSESSMENT_NOT_FOUND', 'This risk questionnaire link is not available.');
    if (assessment.status === 'expired') return error(reply, 410, 'RISK_ASSESSMENT_EXPIRED', 'This risk questionnaire link has expired.');
    if (assessment.status === 'revoked') return error(reply, 410, 'RISK_ASSESSMENT_REVOKED', 'This risk questionnaire link has been revoked.');
    return publicRiskAssessmentResponse(assessment, await store.getClientRiskProfile(assessment.organizationId, assessment.clientId));
  });

  // A client can safely pause and resume the bearer-link questionnaire. Draft
  // answers belong only to the assessment record until the client submits a
  // complete questionnaire; only then do they update the household plan.
  app.patch('/api/v1/public/risk-assessments/:token/draft', async (request, reply) => {
    const { token } = z.object({ token: z.string().min(32).max(256) }).parse(request.params);
    const body = z.object({ answers: z.record(z.string(), z.number().int().min(1).max(10)), answerDetails: z.record(z.string(), z.object({ owner: z.enum(['advisor', 'client', 'joint']), note: z.string().trim().max(500).optional(), uncertain: z.boolean().optional() })).optional() }).parse(request.body);
    if (!hasValidRiskAnswers(body.answers, false)) {
      return error(reply, 400, 'RISK_ANSWERS_INVALID', 'A risk answer is not one of the available questionnaire options.');
    }
    const assessment = await store.saveRiskAssessmentDraft(tokenHash(token), body.answers, body.answerDetails);
    if (!assessment) return error(reply, 410, 'RISK_ASSESSMENT_UNAVAILABLE', 'This risk questionnaire link is unavailable or has expired.');
    const profile = await store.updateClientRiskProfileWorkflow(assessment.organizationId, assessment.clientId, 'client_in_progress');
    return publicRiskAssessmentResponse(assessment, profile);
  });

  app.post('/api/v1/public/risk-assessments/:token/submit', async (request, reply) => {
    const { token } = z.object({ token: z.string().min(32).max(256) }).parse(request.params);
    const body = z.object({
      answers: z.record(z.string(), z.number().int().min(1).max(10)),
      answerDetails: z.record(z.string(), z.object({ owner: z.enum(['advisor', 'client', 'joint']), note: z.string().trim().max(500).optional(), uncertain: z.boolean().optional() })).optional(),
    }).parse(request.body);
    if (!hasValidRiskAnswers(body.answers, true)) {
      return error(reply, 400, 'RISK_ANSWERS_INCOMPLETE', 'Answer each risk-profile question before submitting.');
    }
    const result = calculateRiskVerdict(body.answers);
    const assessment = await store.submitRiskAssessment(tokenHash(token), body.answers, result, body.answerDetails);
    if (!assessment) return error(reply, 410, 'RISK_ASSESSMENT_UNAVAILABLE', 'This risk questionnaire link is unavailable or has expired.');
    await store.upsertClientRiskProfile(assessment.organizationId, assessment.clientId, {
      answers: body.answers, answerDetails: body.answerDetails, source: 'client', score: result.score, verdict: result.verdict, workflowStatus: 'submitted',
    });
    await store.recordAuditEvent({
      organizationId: assessment.organizationId,
      actorUserId: null,
      eventType: 'risk_assessment.completed',
      subjectType: 'risk_assessment',
      subjectId: assessment.id,
      metadata: { clientId: assessment.clientId },
    });
    return publicRiskAssessmentResponse(assessment, await store.getClientRiskProfile(assessment.organizationId, assessment.clientId));
  });

  app.post('/api/v1/public/risk-assessments/:token/confirm', async (request, reply) => {
    const { token } = z.object({ token: z.string().min(32).max(256) }).parse(request.params);
    const assessment = await store.getRiskAssessmentByTokenHash(tokenHash(token));
    if (!assessment || assessment.status !== 'completed') return error(reply, 410, 'RISK_ASSESSMENT_UNAVAILABLE', 'This completed questionnaire is unavailable.');
    const profile = await store.getClientRiskProfile(assessment.organizationId, assessment.clientId);
    if (!profile || !['reviewed', 'applied'].includes(profile.workflowStatus)) return error(reply, 409, 'RISK_PROFILE_NOT_REVIEWED', 'Your adviser has not reviewed this profile yet.');
    const confirmed = await store.confirmClientRiskProfile(assessment.organizationId, assessment.clientId);
    await store.recordAuditEvent({ organizationId: assessment.organizationId, actorUserId: null, eventType: 'risk_profile.client_confirmed', subjectType: 'risk_profile', subjectId: confirmed!.id, metadata: { clientId: assessment.clientId } });
    return publicRiskAssessmentResponse(assessment, confirmed);
  });

  app.get('/api/v1/clients', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const rows = (await store.listClients(scoped.organizationId)).filter((client) => hasPracticeWideClientAccess(scoped.actor, scoped.organizationId) || client.assignedPractitioners.some((assignment) => assignment.userId === scoped.actor.user.id));
    return { data: await Promise.all(rows.map(async (client) => toClientSummary(client, (await store.getProfile(scoped.organizationId, client.id)) ?? emptyProfile()))) };
  });

  app.get('/api/v1/client-drafts', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    return { data: await store.listClientDrafts(scoped.organizationId) };
  });

  app.post('/api/v1/client-drafts', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped || !requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const body = z.object({ name: z.string().trim().min(1), data: z.record(z.string(), z.unknown()).default({}) }).parse(request.body);
    const draft = await store.createClientDraft(scoped.organizationId, body);
    await audit(store, scoped.actor, scoped.organizationId, 'client_draft.created', 'client_draft', draft.id, { name: draft.name });
    return reply.status(201).send(draft);
  });

  app.patch('/api/v1/client-drafts/:draftId', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped || !requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { draftId } = z.object({ draftId: z.string().uuid() }).parse(request.params);
    const body = z.object({ name: z.string().trim().min(1).optional(), data: z.record(z.string(), z.unknown()).optional(), status: z.enum(['active', 'archived']).optional() }).parse(request.body);
    const draft = await store.updateClientDraft(scoped.organizationId, draftId, body);
    if (!draft) return error(reply, 404, 'CLIENT_DRAFT_NOT_FOUND', 'Client draft was not found.');
    return draft;
  });

  app.post('/api/v1/clients', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const body = z.object({ firstName: z.string().trim().min(1), lastName: z.string().trim().min(1), preferredName: z.string().trim().optional(), email: z.string().email().optional(), phone: z.string().trim().optional() }).parse(request.body);
    const client = await store.createClient(scoped.organizationId, scoped.actor.user, body);
    await audit(store, scoped.actor, scoped.organizationId, 'client.created', 'client', client.id, { name: `${client.firstName} ${client.lastName}`.trim() });
    return reply.status(201).send(toClientSummary(client));
  });

  app.get('/api/v1/clients/:clientId', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const client = await requireClientAccess(store, scoped, reply, clientId);
    if (!client) return;
    return toClientSummary(client, (await store.getProfile(scoped.organizationId, client.id)) ?? emptyProfile());
  });

  app.patch('/api/v1/clients/:clientId', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    if (!await requireClientAccess(store, scoped, reply, clientId)) return;
    const body = z.object({ firstName: z.string().trim().optional(), lastName: z.string().trim().optional(), preferredName: z.string().trim().nullable().optional(), email: z.string().email().nullable().optional(), phone: z.string().trim().nullable().optional(), dateOfBirth: z.string().nullable().optional(), maritalStatus: z.string().nullable().optional(), notes: z.string().nullable().optional() }).parse(request.body);
    const client = await store.updateClient(scoped.organizationId, clientId, body);
    if (!client) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    return toClientSummary(client, (await store.getProfile(scoped.organizationId, client.id)) ?? emptyProfile());
  });

  app.get('/api/v1/clients/:clientId/profile', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    if (!await requireClientAccess(store, scoped, reply, clientId)) return;
    const profile = await store.getProfile(scoped.organizationId, clientId);
    if (!profile) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    return { ...profile, netWorth: sumAmount(profile.assets) - sumAmount(profile.liabilities), totals: { assets: sumAmount(profile.assets), liabilities: sumAmount(profile.liabilities) } };
  });

  app.get('/api/v1/clients/:clientId/risk-profile', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    if (!await requireClientAccess(store, scoped, reply, clientId)) return;
    const profile = await store.getClientRiskProfile(scoped.organizationId, clientId);
    return profile ? sharedRiskProfileResponse(profile) : { data: null };
  });

  app.put('/api/v1/clients/:clientId/risk-profile', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    if (!await requireClientAccess(store, scoped, reply, clientId)) return;
    const body = z.object({ answers: z.record(z.string(), z.number().int().min(1).max(10)), answerDetails: z.record(z.string(), z.object({ owner: z.enum(['advisor', 'client', 'joint']), note: z.string().trim().max(500).optional(), uncertain: z.boolean().optional() })).optional() }).parse(request.body);
    if (!hasValidRiskAnswers(body.answers, false)) return error(reply, 400, 'RISK_ANSWERS_INVALID', 'A risk answer is not one of the available questionnaire options.');
    const complete = hasValidRiskAnswers(body.answers, true);
    const result = complete ? calculateRiskVerdict(body.answers) : { score: null, verdict: null };
    const profile = await store.upsertClientRiskProfile(scoped.organizationId, clientId, {
      answers: body.answers, answerDetails: body.answerDetails, source: 'advisor', score: result.score, verdict: result.verdict,
    });
    if (!profile) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    await audit(store, scoped.actor, scoped.organizationId, 'risk_profile.advisor_updated', 'risk_profile', profile.id, { clientId, status: profile.status });
    return sharedRiskProfileResponse(profile);
  });

  app.get('/api/v1/clients/:clientId/risk-profile/history', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    if (!await requireClientAccess(store, scoped, reply, clientId)) return;
    return { data: await store.listClientRiskProfileVersions(scoped.organizationId, clientId) };
  });

  for (const workflowStatus of ['reviewed', 'applied'] as const) {
    app.post(`/api/v1/clients/:clientId/risk-profile/${workflowStatus}`, async (request, reply) => {
      const scoped = await requireOrganization(store, request, reply);
      if (!scoped || !requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
      const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
      if (!await requireClientAccess(store, scoped, reply, clientId)) return;
      const currentProfile = await store.getClientRiskProfile(scoped.organizationId, clientId);
      if (!currentProfile) return error(reply, 404, 'RISK_PROFILE_NOT_FOUND', 'There is no risk profile to review.');
      if (workflowStatus === 'reviewed' && (currentProfile.status !== 'completed' || currentProfile.workflowStatus !== 'submitted')) {
        return error(reply, 409, 'RISK_PROFILE_NOT_READY_FOR_REVIEW', 'A completed client submission is required before adviser review.');
      }
      if (workflowStatus === 'applied' && currentProfile.workflowStatus !== 'reviewed') {
        return error(reply, 409, 'RISK_PROFILE_NOT_REVIEWED', 'Review this risk profile before applying it to the plan.');
      }
      const profile = await store.updateClientRiskProfileWorkflow(scoped.organizationId, clientId, workflowStatus, scoped.actor.user.id);
      if (!profile) return error(reply, 404, 'RISK_PROFILE_NOT_FOUND', 'There is no risk profile to update.');
      await audit(store, scoped.actor, scoped.organizationId, `risk_profile.${workflowStatus}`, 'risk_profile', profile.id, { clientId });
      return sharedRiskProfileResponse(profile);
    });
  }

  app.post('/api/v1/clients/:clientId/risk-profile/export', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    if (!await requireClientAccess(store, scoped, reply, clientId)) return;
    const profile = await store.getClientRiskProfile(scoped.organizationId, clientId);
    if (!profile || Object.keys(profile.answers).length === 0) return error(reply, 404, 'RISK_PROFILE_NOT_FOUND', 'There is no risk profile to export for this household.');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000).toISOString();
    const exportCode = signPortableRiskProfile({
      version: 1, type: 'soundthesis-risk-profile', exportedAt: now.toISOString(), expiresAt, answers: profile.answers,
    });
    if (!exportCode) return error(reply, 503, 'RISK_PROFILE_EXPORT_UNAVAILABLE', 'Risk-profile export signing is not configured on this server.');
    await audit(store, scoped.actor, scoped.organizationId, 'risk_profile.exported', 'risk_profile', profile.id, { clientId, expiresAt });
    return { exportCode, expiresAt, profile: sharedRiskProfileResponse(profile) };
  });

  app.post('/api/v1/clients/:clientId/risk-profile/import', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    if (!await requireClientAccess(store, scoped, reply, clientId)) return;
    const { exportCode } = z.object({ exportCode: z.string().trim().min(40).max(10_000) }).parse(request.body);
    const portableProfile = readPortableRiskProfile(exportCode);
    if (!portableProfile) return error(reply, 400, 'RISK_PROFILE_IMPORT_INVALID', 'This risk-profile export is invalid, expired, or was not created by this application.');
    const complete = hasValidRiskAnswers(portableProfile.answers, true);
    const result = complete ? calculateRiskVerdict(portableProfile.answers) : { score: null, verdict: null };
    const profile = await store.upsertClientRiskProfile(scoped.organizationId, clientId, {
      answers: portableProfile.answers, source: 'imported', score: result.score, verdict: result.verdict,
    });
    if (!profile) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    await audit(store, scoped.actor, scoped.organizationId, 'risk_profile.imported', 'risk_profile', profile.id, { clientId, exportedAt: portableProfile.exportedAt });
    return sharedRiskProfileResponse(profile);
  });

  for (const resource of ['assets', 'liabilities', 'cashflows', 'goals'] as const) {
    app.post(`/api/v1/clients/:clientId/${resource}`, async (request, reply) => {
      const scoped = await requireOrganization(store, request, reply);
      if (!scoped) return;
      if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
      const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
      if (!await requireClientAccess(store, scoped, reply, clientId)) return;
      const record = await store.createResource(scoped.organizationId, clientId, resource, request.body as Record<string, unknown>);
      if (!record) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
      await audit(store, scoped.actor, scoped.organizationId, `financial_resource.${resource}.created`, 'financial_resource', String(record.id), { clientId });
      return reply.status(201).send(record);
    });

    app.patch(`/api/v1/clients/:clientId/${resource}/:id`, async (request, reply) => {
      const scoped = await requireOrganization(store, request, reply);
      if (!scoped) return;
      if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
      const params = z.object({ clientId: z.string(), id: z.string() }).parse(request.params);
      if (!await requireClientAccess(store, scoped, reply, params.clientId)) return;
      const record = await store.updateResource(scoped.organizationId, params.clientId, resource, params.id, request.body as Record<string, unknown>);
      if (!record) return error(reply, 404, 'RESOURCE_NOT_FOUND', 'Resource was not found.');
      await audit(store, scoped.actor, scoped.organizationId, `financial_resource.${resource}.updated`, 'financial_resource', params.id, { clientId: params.clientId });
      return record;
    });
  }

  for (const resource of ['assets', 'liabilities', 'cashflows', 'goals'] as const) {
    app.post(`/api/v1/clients/:clientId/${resource}/:id/archive`, async (request, reply) => {
      const scoped = await requireOrganization(store, request, reply);
      if (!scoped) return;
      if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
      const params = z.object({ clientId: z.string(), id: z.string() }).parse(request.params);
      if (!await requireClientAccess(store, scoped, reply, params.clientId)) return;
      const record = await store.archiveResource(scoped.organizationId, params.clientId, resource, params.id);
      if (!record) return error(reply, 404, 'RESOURCE_NOT_FOUND', 'Resource was not found.');
      await audit(store, scoped.actor, scoped.organizationId, `financial_resource.${resource}.archived`, 'financial_resource', params.id, { clientId: params.clientId });
      return record;
    });
  }

  app.get('/api/v1/clients/:clientId/plans', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    if (!await requireClientAccess(store, scoped, reply, clientId)) return;
    const rows = await store.listPlans(scoped.organizationId, clientId);
    return { data: rows.map((plan) => ({ id: plan.id, clientId: plan.clientId, name: plan.name, status: plan.status })) };
  });

  app.get('/api/v1/clients/:clientId/risk-assessments', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    if (!await requireClientAccess(store, scoped, reply, clientId)) return;
    const assessments = await store.listRiskAssessments(scoped.organizationId, clientId);
    return { data: assessments.map((assessment) => publicRiskAssessmentResponse(assessment)) };
  });

  // Practice-level register for the isolated adviser Risk Profiler desk.
  // Unlike the bearer-link routes, this returns the client mapping, but only
  // for households the signed-in adviser is permitted to view.
  app.get('/api/v1/risk-assessments', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const assessments = await store.listRiskAssessments(scoped.organizationId);
    const rows = await Promise.all(assessments.map(async (assessment) => ({
      assessment,
      client: await store.getClient(scoped.organizationId, assessment.clientId),
    })));
    const visible = rows.filter(({ client }) => client && (
      hasPracticeWideClientAccess(scoped.actor, scoped.organizationId)
      || client.assignedPractitioners.some((assignment) => assignment.userId === scoped.actor.user.id)
    ));
    return { data: visible.map(({ assessment, client }) => adviserRiskAssessmentResponse(assessment, client!)) };
  });

  app.get('/api/v1/risk-profiles', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const profiles = await store.listClientRiskProfiles(scoped.organizationId);
    const rows = await Promise.all(profiles.map(async (profile) => ({
      profile,
      client: await store.getClient(scoped.organizationId, profile.clientId),
    })));
    const visible = rows.filter(({ client }) => client && (
      hasPracticeWideClientAccess(scoped.actor, scoped.organizationId)
      || client.assignedPractitioners.some((assignment) => assignment.userId === scoped.actor.user.id)
    ));
    return {
      data: visible.map(({ profile, client }) => ({
        ...sharedRiskProfileResponse(profile),
        clientId: client!.id,
        clientName: client!.preferredName || `${client!.firstName} ${client!.lastName}`.trim(),
      })),
    };
  });

  app.post('/api/v1/clients/:clientId/risk-assessments', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    if (!await requireClientAccess(store, scoped, reply, clientId)) return;
    const body = z.object({
      recipientName: z.string().trim().min(1).max(120).optional(),
      expiresInDays: z.coerce.number().int().min(1).max(90).default(30),
      initialAnswers: z.record(z.string(), z.number().int().min(1).max(10)).optional(),
    }).parse(request.body ?? {});
    if (body.initialAnswers && !hasValidRiskAnswers(body.initialAnswers, false)) {
      return error(reply, 400, 'RISK_ANSWERS_INVALID', 'A risk answer is not one of the available questionnaire options.');
    }
    // A new link replaces an unfinished one. Otherwise two client sessions
    // could independently overwrite the shared household profile.
    const previous = await store.listRiskAssessments(scoped.organizationId, clientId);
    await Promise.all(previous
      .filter((assessment) => assessment.status === 'invited')
      .map((assessment) => store.updateRiskAssessmentLifecycle(scoped.organizationId, assessment.id, 'revoked')));
    const accessToken = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + body.expiresInDays * 24 * 60 * 60 * 1000).toISOString();
    const currentProfile = await store.getClientRiskProfile(scoped.organizationId, clientId);
    const initialAnswers = body.initialAnswers ?? currentProfile?.answers ?? {};
    const initialDetails = currentProfile?.answerDetails ?? Object.fromEntries(Object.keys(initialAnswers).map((id) => [id, { owner: 'advisor' as const }]));
    const initialResult = hasValidRiskAnswers(initialAnswers, true) ? calculateRiskVerdict(initialAnswers) : { score: null, verdict: null };
    await store.upsertClientRiskProfile(scoped.organizationId, clientId, { answers: initialAnswers, answerDetails: initialDetails, source: 'advisor', score: initialResult.score, verdict: initialResult.verdict, workflowStatus: 'sent' });
    const assessment = await store.createRiskAssessment(scoped.organizationId, clientId, {
      recipientName: body.recipientName,
      tokenHash: tokenHash(accessToken),
      expiresAt,
      answers: initialAnswers, answerDetails: initialDetails,
    });
    if (!assessment) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    await audit(store, scoped.actor, scoped.organizationId, 'risk_assessment.created', 'risk_assessment', assessment.id, { clientId, expiresAt });
    return reply.status(201).send({ assessment: publicRiskAssessmentResponse(assessment), accessToken });
  });

  for (const action of ['shared', 'reminded', 'revoked'] as const) {
    app.post(`/api/v1/clients/:clientId/risk-assessments/:assessmentId/${action}`, async (request, reply) => {
      const scoped = await requireOrganization(store, request, reply);
      if (!scoped || !requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
      const { clientId, assessmentId } = z.object({ clientId: z.string(), assessmentId: z.string() }).parse(request.params);
      if (!await requireClientAccess(store, scoped, reply, clientId)) return;
      const assessment = await store.updateRiskAssessmentLifecycle(scoped.organizationId, assessmentId, action);
      if (!assessment || assessment.clientId !== clientId) return error(reply, 404, 'RISK_ASSESSMENT_NOT_FOUND', 'This risk questionnaire is not available.');
      await audit(store, scoped.actor, scoped.organizationId, `risk_assessment.${action}`, 'risk_assessment', assessment.id, { clientId });
      return publicRiskAssessmentResponse(assessment);
    });
  }

  app.get('/api/v1/reports', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const query = z.object({ clientId: z.string().optional() }).parse(request.query);
    if (query.clientId && !await requireClientAccess(store, scoped, reply, query.clientId)) return;
    const reports = await store.listReports(scoped.organizationId, query.clientId);
    if (hasPracticeWideClientAccess(scoped.actor, scoped.organizationId)) return { data: reports };
    const visible = await Promise.all(reports.map(async (report) => ({ report, client: await store.getClient(scoped.organizationId, report.clientId) })));
    return { data: visible.filter(({ client }) => client?.assignedPractitioners.some((assignment) => assignment.userId === scoped.actor.user.id)).map(({ report }) => report) };
  });

  app.get('/api/v1/audit-events', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const query = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) }).parse(request.query ?? {});
    return { data: await store.listAuditEvents(scoped.organizationId, query.limit) };
  });

  app.post('/api/v1/clients/:clientId/reports', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    if (!await requireClientAccess(store, scoped, reply, clientId)) return;
    const body = z.object({
      kind: z.enum(['plan-report', 'dossier']).default('dossier'),
      name: z.string().trim().min(1).optional(),
    }).parse(request.body ?? {});
    const report = await store.createReport(scoped.organizationId, clientId, body.kind, body.name);
    if (!report) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    await audit(store, scoped.actor, scoped.organizationId, 'report.created', 'report', report.id, { clientId, kind: report.kind, version: report.version });
    return reply.status(201).send(report);
  });

  app.patch('/api/v1/reports/:reportId', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const { reportId } = z.object({ reportId: z.string() }).parse(request.params);
    const existing = (await store.listReports(scoped.organizationId)).find((item) => item.id === reportId);
    if (!existing || !await requireClientAccess(store, scoped, reply, existing.clientId)) return;
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
    const existing = (await store.listReports(scoped.organizationId)).find((item) => item.id === reportId);
    if (!existing || !await requireClientAccess(store, scoped, reply, existing.clientId)) return;
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
    if (!await requireClientAccess(store, scoped, reply, report.clientId)) return;
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
    if (!await requireClientAccess(store, scoped, reply, clientId)) return;
    const body = z.object({ name: z.string().trim().min(1).default('New Financial Plan') }).parse(request.body ?? {});
    const plan = await store.createPlan(scoped.organizationId, clientId, body.name);
    if (!plan) return error(reply, 404, 'CLIENT_NOT_FOUND', 'Client was not found.');
    await audit(store, scoped.actor, scoped.organizationId, 'plan.created', 'plan', plan.id, { clientId, name: plan.name });
    return reply.status(201).send(planResponse(plan));
  });

  app.get('/api/v1/plans/:planId', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { planId } = z.object({ planId: z.string() }).parse(request.params);
    const plan = await requirePlanAccess(store, scoped, reply, planId);
    if (!plan) return;
    return planResponse(plan);
  });

  app.patch('/api/v1/plans/:planId', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { planId } = z.object({ planId: z.string() }).parse(request.params);
    if (!await requirePlanAccess(store, scoped, reply, planId)) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
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
    if (!await requirePlanAccess(store, scoped, reply, planId)) return;
    const plan = await store.updatePlan(scoped.organizationId, planId, { status: 'archived' });
    if (!plan) return error(reply, 404, 'PLAN_NOT_FOUND', 'Plan was not found.');
    return planResponse(plan);
  });

  app.post('/api/v1/plans/:planId/versions', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { planId } = z.object({ planId: z.string() }).parse(request.params);
    if (!await requirePlanAccess(store, scoped, reply, planId)) return;
    if (!requireWriteAccess(reply, scoped.actor, scoped.organizationId)) return;
    const body = z.object({ inputSnapshot: z.record(z.string(), z.unknown()).default({}), assumptionsSnapshot: z.record(z.string(), z.unknown()).default({}) }).parse(request.body ?? {});
    const version = await store.createPlanVersion(scoped.organizationId, planId, body.inputSnapshot, body.assumptionsSnapshot);
    if (!version) return error(reply, 404, 'PLAN_NOT_FOUND', 'Plan was not found.');
    await audit(store, scoped.actor, scoped.organizationId, 'plan.version_created', 'plan_version', version.id, { planId, versionNumber: version.versionNumber });
    return reply.status(201).send(version);
  });

  app.post('/api/v1/plans/:planId/calculate', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { planId } = z.object({ planId: z.string() }).parse(request.params);
    const plan = await requirePlanAccess(store, scoped, reply, planId);
    if (!plan) return;
    const profile = (await store.getProfile(scoped.organizationId, plan.clientId)) ?? emptyProfile();
    const version = plan.versions.find((item) => item.id === plan.currentVersionId) ?? null;
    if (!version) return error(reply, 409, 'PLAN_VERSION_REQUIRED', 'Save a plan version before running a calculation.');
    const result = calculatePlan(version.inputSnapshot, version.assumptionsSnapshot, profile, version.id);
    const calculationRun = await store.createCalculationRun({
      organizationId: scoped.organizationId,
      planId: plan.id,
      planVersionId: version.id,
      engineVersion: result.calculationVersion,
      seed: null,
      result: result as unknown as Record<string, unknown>,
    });
    if (!calculationRun) return error(reply, 409, 'CALCULATION_PERSIST_FAILED', 'The plan version could not be persisted for calculation.');
    await audit(store, scoped.actor, scoped.organizationId, 'calculation.completed', 'calculation_run', calculationRun.id, { planId: plan.id, planVersionId: version.id, engineVersion: result.calculationVersion });
    return {
      result,
      baseScenarioRecalculated: true,
      planVersionId: version.id,
      calculationRunId: calculationRun.id,
    };
  });

  app.get('/api/v1/plans/:planId/calculations/latest', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { planId } = z.object({ planId: z.string() }).parse(request.params);
    const plan = await requirePlanAccess(store, scoped, reply, planId);
    if (!plan) return;
    const calculationRun = await store.getLatestCalculationRun(scoped.organizationId, planId);
    if (!calculationRun) return error(reply, 404, 'CALCULATION_NOT_FOUND', 'No calculation has been run for this plan.');
    return calculationRun;
  });

  app.get('/api/v1/clients/:clientId/export', async (request, reply) => {
    const scoped = await requireOrganization(store, request, reply);
    if (!scoped) return;
    const { clientId } = z.object({ clientId: z.string() }).parse(request.params);
    const client = await requireClientAccess(store, scoped, reply, clientId);
    if (!client) return;
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
