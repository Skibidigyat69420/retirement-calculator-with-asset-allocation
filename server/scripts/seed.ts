/**
 * Seed script (spec §179/§180/§207) — run with: `npm run db:seed`.
 *
 * Guards:
 *  - throws unless ALLOW_SEED === 'true'
 *  - refuses to run against a DATABASE_URL whose hostname ends with
 *    'supabase.co' unless ALLOW_PROD_SEED === 'true' (never seed fake data
 *    into production by accident).
 *
 * Idempotent-ish: upserts by slug/email/name. Uses withSystem + direct
 * inserts (bypasses tenant RLS — a seed run is a developer operation).
 *
 * Dev loop after seeding (port comes from the server's PORT env, default 4000):
 *   curl -X POST localhost:4000/api/v1/auth/dev-login \
 *     -H 'content-type: application/json' \
 *     -d '{"email":"you@soundthesis.local"}'
 */
import { eq } from 'drizzle-orm';
import { withSystem, pool } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { calculateRiskScore, getRiskProfile } from '../../src/lib/riskQuestionnaire.js';
import { mapPlanInputToEngineInput } from '../src/services/engineAdapter.js';
import type { MasterPlanInputs } from '../../src/types/index.js';
import { env } from '../src/config.js';

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

if (process.env['ALLOW_SEED'] !== 'true' && !env.ALLOW_SEED) {
  throw new Error('Refusing to seed: set ALLOW_SEED=true.');
}
const dbHost = (() => {
  try {
    return new URL(env.DATABASE_URL).hostname;
  } catch {
    return '';
  }
})();
if (dbHost.endsWith('supabase.co') && process.env['ALLOW_PROD_SEED'] !== 'true') {
  throw new Error(
    'Refusing to seed a supabase.co database without ALLOW_PROD_SEED=true.',
  );
}

// Deterministic auth_user_id UUIDs (dev only).
const OWNER_AUTH_ID = '11111111-1111-4111-8111-111111111111';
const ADVISER_AUTH_ID = '22222222-2222-4222-8222-222222222222';

// Brand colors (spec §107).
const BRAND_PRIMARY = '#0B1220';
const BRAND_SECONDARY = '#101A2E';
const BRAND_ACCENT = '#C9A86A';

interface Summary {
  orgId: string;
  ownerUserId: string;
  adviserUserId: string;
  householdId: string;
  clientId: string;
  planId: string;
  planVersionId: string;
  scenarioId: string;
  seeded: string[];
}

async function upsertOrg(tx: Parameters<Parameters<typeof withSystem>[0]>[0]) {
  const existing = await tx
    .select()
    .from(schema.organizations)
    .where(eq(schema.organizations.slug, 'sound-thesis-wealth'))
    .limit(1)
    .then((r) => r[0]);
  if (existing) return { org: existing, created: false };
  const org = await tx
    .insert(schema.organizations)
    .values({
      name: 'Sound Thesis Wealth',
      slug: 'sound-thesis-wealth',
      brandPrimary: BRAND_PRIMARY,
      brandSecondary: BRAND_SECONDARY,
      settings: { accent: BRAND_ACCENT, baseCurrency: 'INR' },
      status: 'active',
      planTier: 'standard',
    })
    .returning()
    .then((r) => r[0]!);
  return { org, created: true };
}

async function upsertUser(
  tx: Parameters<Parameters<typeof withSystem>[0]>[0],
  values: { email: string; fullName: string; authUserId: string },
) {
  const existing = await tx
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, values.email))
    .limit(1)
    .then((r) => r[0]);
  if (existing) return { user: existing, created: false };
  const user = await tx
    .insert(schema.users)
    .values({ ...values, status: 'active' })
    .returning()
    .then((r) => r[0]!);
  return { user, created: true };
}

async function upsertMembership(
  tx: Parameters<Parameters<typeof withSystem>[0]>[0],
  values: typeof schema.organizationMemberships.$inferInsert,
) {
  const existing = await tx
    .select()
    .from(schema.organizationMemberships)
    .where(
      eq(schema.organizationMemberships.organizationId, values.organizationId as string),
    )
    .then((rows) =>
      rows.find((r) => r.userId === values.userId && r.role === values.role),
    );
  if (existing) return { membership: existing, created: false };
  const membership = await tx
    .insert(schema.organizationMemberships)
    .values(values)
    .returning()
    .then((r) => r[0]!);
  return { membership, created: true };
}

async function seed() {
  const summary: Summary = {
    orgId: '',
    ownerUserId: '',
    adviserUserId: '',
    householdId: '',
    clientId: '',
    planId: '',
    planVersionId: '',
    scenarioId: '',
    seeded: [],
  };

  await withSystem(async (tx) => {
    // ------------------------------------------------------------ org + users
    const { org, created: orgCreated } = await upsertOrg(tx);
    summary.orgId = org.id;
    if (orgCreated) summary.seeded.push('organization: Sound Thesis Wealth');

    const { user: owner, created: ownerCreated } = await upsertUser(tx, {
      email: 'you@soundthesis.local',
      fullName: 'Practice Owner',
      authUserId: OWNER_AUTH_ID,
    });
    summary.ownerUserId = owner.id;
    if (ownerCreated) summary.seeded.push('user: you@soundthesis.local (practice owner)');

    const { user: adviser, created: adviserCreated } = await upsertUser(tx, {
      email: 'adviser@soundthesis.local',
      fullName: 'Aarav Adviser',
      authUserId: ADVISER_AUTH_ID,
    });
    summary.adviserUserId = adviser.id;
    if (adviserCreated) summary.seeded.push('user: adviser@soundthesis.local (practitioner)');

    await upsertMembership(tx, {
      organizationId: org.id,
      userId: owner.id,
      role: 'practice_owner',
      status: 'active',
    });
    await upsertMembership(tx, {
      organizationId: org.id,
      userId: adviser.id,
      role: 'wealth_practitioner',
      status: 'active',
      invitedBy: owner.id,
    });

    // ------------------------------------------------------------- household
    const existingHousehold = await tx
      .select()
      .from(schema.households)
      .where(eq(schema.households.organizationId, org.id))
      .then((rows) => rows.find((h) => h.name === 'The Sharma Family'));
    let household: import('../src/db/schema.js').Household | undefined = existingHousehold;
    if (!household) {
      const inserted = await tx
        .insert(schema.households)
        .values({ organizationId: org.id, name: 'The Sharma Family' })
        .returning();
      if (inserted.length === 0 || !inserted[0]) throw new Error('household insert failed');
      household = inserted[0];
    }
    summary.householdId = household.id;
    if (!existingHousehold) summary.seeded.push('household: The Sharma Family');

    // ---------------------------------------------------------------- client
    const existingClient = await tx
      .select()
      .from(schema.clients)
      .where(eq(schema.clients.organizationId, org.id))
      .then((rows) => rows.find((c) => c.firstName === 'Raj' && c.lastName === 'Sharma'));
    let client = existingClient;
    if (!client) {
      const inserted = await tx
        .insert(schema.clients)
        .values({
          organizationId: org.id,
          householdId: household.id,
          firstName: 'Raj',
          lastName: 'Sharma',
          preferredName: 'Raj',
          email: 'raj.sharma@example.com',
          dateOfBirth: '1981-03-15', // ~45
          maritalStatus: 'married',
          status: 'active',
        })
        .returning();
      if (inserted.length === 0 || !inserted[0]) throw new Error('client insert failed');
      client = inserted[0];
    }
    summary.clientId = client.id;
    if (!existingClient) summary.seeded.push('client: Raj Sharma');

    if (
      !(await tx
        .select()
        .from(schema.clientAssignments)
        .then((rows) => rows.some((a) => a.clientId === client.id)))
    ) {
      await tx.insert(schema.clientAssignments).values([
        { clientId: client.id, userId: owner.id, assignmentRole: 'primary' },
        { clientId: client.id, userId: adviser.id, assignmentRole: 'secondary' },
      ]);
    }

    // ---------------------------------------------------------------- assets
    if (
      !(await tx
        .select()
        .from(schema.assets)
        .where(eq(schema.assets.clientId, client.id))
        .then((rows) => rows.length > 0))
    ) {
      await tx.insert(schema.assets).values([
        {
          organizationId: org.id,
          clientId: client.id,
          name: 'Equity Mutual Funds',
          assetType: 'mutual_fund',
          assetCategory: 'mutual_fund',
          currency: 'INR',
          currentValue: '32000000', // ₹3.2Cr
          liquidity: 'high',
          liquidateAtRetirement: true,
        },
        {
          organizationId: org.id,
          clientId: client.id,
          name: 'Residence Property',
          assetType: 'property',
          assetCategory: 'property',
          currency: 'INR',
          currentValue: '28000000', // ₹2.8Cr
          liquidity: 'low',
          liquidateAtRetirement: false,
        },
        {
          organizationId: org.id,
          clientId: client.id,
          name: 'EPF Corpus',
          assetType: 'epf',
          assetCategory: 'epf',
          currency: 'INR',
          currentValue: '4500000', // ₹45L
          liquidity: 'low',
          liquidateAtRetirement: false,
        },
      ]);
      summary.seeded.push('assets: equity MF ₹3.2Cr, property ₹2.8Cr, EPF ₹45L');
    }

    // ------------------------------------------------------------ liabilities
    if (
      !(await tx
        .select()
        .from(schema.liabilities)
        .where(eq(schema.liabilities.clientId, client.id))
        .then((rows) => rows.length > 0))
    ) {
      await tx.insert(schema.liabilities).values({
        organizationId: org.id,
        clientId: client.id,
        name: 'Home Loan',
        liabilityType: 'home_loan',
        outstandingAmount: '6500000', // ₹65L
        interestRate: '8.5',
        monthlyPayment: '62000',
      });
      summary.seeded.push('liability: home loan ₹65L');
    }

    // ----------------------------------------------------------------- goals
    if (
      !(await tx
        .select()
        .from(schema.goals)
        .where(eq(schema.goals.clientId, client.id))
        .then((rows) => rows.length > 0))
    ) {
      await tx.insert(schema.goals).values([
        {
          organizationId: org.id,
          clientId: client.id,
          name: 'Retirement Corpus',
          goalType: 'retirement',
          priority: 'essential',
          targetAmount: '120000000',
          yearsToGoal: '15',
          inflationRate: '6',
        },
        {
          organizationId: org.id,
          clientId: client.id,
          name: 'Child Education',
          goalType: 'education',
          priority: 'important',
          targetAmount: '2500000',
          yearsToGoal: '8',
          inflationRate: '6',
        },
        {
          organizationId: org.id,
          clientId: client.id,
          name: 'World Travel',
          goalType: 'travel',
          priority: 'aspirational',
          targetAmount: '6000000',
          yearsToGoal: '10',
          inflationRate: '6',
        },
      ]);
      summary.seeded.push('goals: retirement (essential), education (important), travel (aspirational)');
    }

    // ------------------------------------------------------------- cashflows
    if (
      !(await tx
        .select()
        .from(schema.cashflowRules)
        .where(eq(schema.cashflowRules.clientId, client.id))
        .then((rows) => rows.length > 0))
    ) {
      await tx.insert(schema.cashflowRules).values([
        {
          organizationId: org.id,
          clientId: client.id,
          type: 'income',
          name: 'Salary',
          annualAmount: '8500000', // ₹85L/yr
          annualGrowthRate: '8',
        },
        {
          organizationId: org.id,
          clientId: client.id,
          type: 'expense',
          name: 'Monthly Household Expense',
          monthlyAmount: '180000', // ₹1.8L/mo
          annualGrowthRate: '6',
        },
      ]);
      summary.seeded.push('cashflows: salary ₹85L/yr, expenses ₹1.8L/mo');
    }

    // ------------------------------------------------------ risk assessment
    if (
      !(await tx
        .select()
        .from(schema.riskAssessments)
        .where(eq(schema.riskAssessments.clientId, client.id))
        .then((rows) => rows.length > 0))
    ) {
      const answers: Record<string, number> = {
        'time-horizon-main': 8,
        'time-horizon-retirement': 8,
        'loss-reaction': 6,
        'drawdown-tolerance': 8,
        'income-stability': 8,
        'experience': 6,
      };
      const score = calculateRiskScore(answers);
      const profile = getRiskProfile(score);
      await tx.insert(schema.riskAssessments).values({
        organizationId: org.id,
        clientId: client.id,
        answers,
        rawScore: String(score),
        profile: profile.id,
        dimensionScores: {},
        questionnaireVersion: '1.0.0',
        assessedBy: owner.id,
        completedAt: new Date().toISOString(),
      });
      summary.seeded.push(`risk assessment: ${profile.id} (score ${score})`);
    }

    // ------------------------------------------------- plan 'Master Plan' v1
    const existingPlan = await tx
      .select()
      .from(schema.retirementPlans)
      .where(eq(schema.retirementPlans.clientId, client.id))
      .then((rows) => rows.find((p) => p.name === 'Master Plan'));
    let plan = existingPlan ?? null;
    if (!plan) {
      const inputSnapshot: MasterPlanInputs = mapPlanInputToEngineInput({
        client: { name: 'Raj Sharma', advisor: 'Practice Owner' },
        currentAge: 45,
        retirementAge: 60,
        lifeExpectancy: 85,
        inflation: 6,
        annualIncome: 8500000,
        monthlyExpenditure: 180000,
        assets: [
          { id: 'seed-1', name: 'Equity Mutual Funds', value: 32000000, returnRate: 12, category: 'equity', currency: 'INR', liquidateAtRetirement: true },
          { id: 'seed-2', name: 'EPF Corpus', value: 4500000, returnRate: 8, category: 'debt', currency: 'INR', liquidateAtRetirement: true },
        ],
        sip: { amount: 200000, equitySplit: 70, debtSplit: 30, stepUp: 5, equityReturn: 12, debtReturn: 8 },
        stp: { active: false, source: 'custom', lumpsum: 0, monthlyTransfer: 0, liquidReturn: 7, equitySplit: 50, debtSplit: 50, liquidCap: 0 },
        swp: { monthlyNeedToday: 300000, postRetirementReturn: 8, taxRate: 10, startAge: 60, endAge: 85 },
        goals: [
          // NOTE: no "retirement corpus" goal here — retirement need is already
          // modelled by swp.monthlyNeedToday; a corpus goal maturing at
          // retirement would be funded from the same portfolio (engine pays
          // goals out of the corpus at maturity) and double-count the need.
          { id: 'seed-g1', name: 'World Tour', targetAmount: 5000000, yearsToGoal: 6, priority: 'aspirational', inflation: 6, recurring: false },
          { id: 'seed-g2', name: 'Child Education', targetAmount: 2500000, yearsToGoal: 8, priority: 'important', inflation: 6, recurring: false },
        ],
      });
      plan = await tx
        .insert(schema.retirementPlans)
        .values({
          organizationId: org.id,
          clientId: client.id,
          name: 'Master Plan',
          status: 'draft',
          createdBy: owner.id,
        })
        .returning()
        .then((r) => r[0] ?? null);
      if (!plan) throw new Error('plan insert failed');
      const version = await tx
        .insert(schema.planVersions)
        .values({
          organizationId: org.id,
          planId: plan.id,
          versionNumber: 1,
          inputSnapshot,
          assumptionsSnapshot: {},
          resultSnapshot: {},
          engineVersion: env.ENGINE_VERSION,
          createdBy: owner.id,
        })
        .returning()
        .then((r) => r[0] ?? null);
      if (!version) throw new Error('version insert failed');
      await tx
        .update(schema.retirementPlans)
        .set({ currentVersionId: version.id })
        .where(eq(schema.retirementPlans.id, plan.id));
      summary.planId = plan.id;
      summary.planVersionId = version.id;
      summary.seeded.push('plan: Master Plan v1 (§145-shaped input snapshot)');
    } else {
      summary.planId = plan.id;
      summary.planVersionId = plan.currentVersionId ?? '';
    }

    // ------------------------------------------------------------ base scenario
    if (
      !(await tx
        .select()
        .from(schema.planScenarios)
        .where(eq(schema.planScenarios.planId, summary.planId))
        .then((rows) => rows.length > 0))
    ) {
      const scenario = await tx
        .insert(schema.planScenarios)
        .values({
          organizationId: org.id,
          planId: summary.planId,
          name: 'Base',
          scenarioType: 'base',
          assumptions: {},
          result: {},
          resultStatus: 'draft',
          baseVersionId: summary.planVersionId || null,
          createdBy: owner.id,
        })
        .returning()
        .then((r) => r[0]!);
      summary.scenarioId = scenario.id;
      summary.seeded.push('scenario: Base');
    }

    // ----------------------------------------------------------------- tasks
    if (
      !(await tx
        .select()
        .from(schema.tasks)
        .where(eq(schema.tasks.organizationId, org.id))
        .then((rows) => rows.length > 0))
    ) {
      await tx.insert(schema.tasks).values([
        {
          organizationId: org.id,
          clientId: client.id,
          title: 'Collect KYC documents for Raj Sharma',
          priority: 'high',
          assignedTo: adviser.id,
          createdBy: owner.id,
        },
        {
          organizationId: org.id,
          clientId: client.id,
          title: 'Review asset allocation vs risk profile',
          priority: 'normal',
          assignedTo: adviser.id,
          createdBy: owner.id,
        },
      ]);
      summary.seeded.push('tasks: 2 open tasks');
    }

    // ----------------------------------------------------------- decision log
    if (
      !(await tx
        .select()
        .from(schema.decisionLogs)
        .where(eq(schema.decisionLogs.clientId, client.id))
        .then((rows) => rows.length > 0))
    ) {
      await tx.insert(schema.decisionLogs).values({
        organizationId: org.id,
        clientId: client.id,
        planId: summary.planId,
        actorUserId: owner.id,
        action: 'plan_created',
        summary: "Seed: client onboarded with starter plan 'Master Plan' (v1).",
        metadata: { seeded: true },
      });
    }
  });

  return summary;
}

seed()
  .then((summary) => {
    console.log('\nSeed complete.');
    if (summary.seeded.length === 0) {
      console.log('Everything already present — nothing new seeded.');
    } else {
      for (const line of summary.seeded) console.log(`  + ${line}`);
    }
    const port = process.env.PORT ?? '4000';
    console.log('\nDev login (AUTH_MODE=dev):');
    console.log(`  curl -X POST localhost:${port}/api/v1/auth/dev-login \\`);
    console.log(`    -H 'content-type: application/json' \\`);
    console.log(`    -d '{"email":"you@soundthesis.local"}'`);
    console.log(`  x-organization-id: ${summary.orgId}\n`);
  })
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
