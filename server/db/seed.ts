/**
 * Demo seed: "Sound Thesis Demo Practice" plus a second, smaller demo tenant
 * ("Northstar Wealth (Demo)") so cross-tenant RLS isolation can be verified.
 *
 * All data is fake and clearly marked DEMO. Idempotent: every INSERT uses
 * deterministic UUIDs and ON CONFLICT DO NOTHING, so re-running is a no-op.
 * Refuses to run in production unless ALLOW_DEMO_SEED=true is set explicitly.
 *
 * Tenant context is set with SET LOCAL semantics (set_tenant_context) inside
 * the seeding transaction — per spec section 36, tenant state must never be
 * set on a reusable connection outside a transaction.
 *
 * Usage: npm run db:seed
 */
import pg from 'pg';
import { databaseUrl } from './connection.ts';

const { Client } = pg;

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== 'true') {
    console.error(
        'Refusing to seed demo data in production. Set ALLOW_DEMO_SEED=true to override.',
    );
    process.exit(1);
}

// Deterministic UUIDs: '00000000-0000-4000-8000-' + 12 hex digits of the serial.
function uuid(n: number): string {
    return `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
}

const ORG_DEMO = uuid(0x0001);
const ORG_NORTHSTAR = uuid(0x0002);
const SYSTEM_USER = uuid(0x0003);

// Deterministic pseudo-random in [0, 1) — stable across seed runs.
function rand(i: number, salt: number): number {
    const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
    return x - Math.floor(x);
}

const DEMO_ORG_NAME = 'Sound Thesis Demo Practice';
const ENGINE_VERSION = '2.1.0';

interface Practitioner {
    id: string;
    fullName: string;
    email: string;
    role: string;
}

const PRACTITIONERS: Practitioner[] = [
    { id: uuid(0x0010), fullName: 'Ketan Desai', email: 'ketan.demo@soundthesis.example', role: 'practice_owner' },
    { id: uuid(0x0011), fullName: 'Aarav Kapoor', email: 'aarav.demo@soundthesis.example', role: 'wealth_practitioner' },
    { id: uuid(0x0012), fullName: 'Meera Iyer', email: 'meera.demo@soundthesis.example', role: 'wealth_practitioner' },
    { id: uuid(0x0013), fullName: 'Rohan Banerjee', email: 'rohan.demo@soundthesis.example', role: 'associate' },
    { id: uuid(0x0014), fullName: 'Sana Qureshi', email: 'sana.demo@soundthesis.example', role: 'practice_admin' },
];

const FIRST_NAMES = [
    'Raj', 'Ananya', 'Vikram', 'Priya', 'Arjun', 'Kavya', 'Sanjay', 'Nisha',
    'Rahul', 'Divya', 'Amit', 'Shreya', 'Manish', 'Pooja', 'Karan', 'Ritu',
    'Naveen', 'Lakshmi', 'Suresh', 'Anita', 'Deepak', 'Farah', 'Gopal', 'Isha',
    'Sameer',
];
const LAST_NAMES = [
    'Sharma', 'Verma', 'Patel', 'Reddy', 'Mehta', 'Nair', 'Gupta', 'Joshi',
    'Kulkarni', 'Das', 'Malhotra', 'Chopra', 'Rao', 'Sinha', 'Bhat', 'Khan',
    'Agarwal', 'Menon', 'Singh', 'Iqbal', 'Rao', 'Sen', 'Pillai', 'Bose',
    'Chauhan',
];

const ASSET_POOL: Array<{ name: string; asset_type: string; asset_category: string; value: number }> = [
    { name: 'Listed Equity Portfolio', asset_type: 'equity', asset_category: 'growth', value: 4_500_000 },
    { name: 'Equity Mutual Funds', asset_type: 'mutual_fund', asset_category: 'growth', value: 3_200_000 },
    { name: 'Residential Property', asset_type: 'real_estate', asset_category: 'alternative', value: 12_000_000 },
    { name: 'Fixed Deposits', asset_type: 'fixed_income', asset_category: 'income', value: 2_000_000 },
    { name: 'Public Provident Fund', asset_type: 'ppf', asset_category: 'income', value: 1_800_000 },
    { name: 'Employees Provident Fund', asset_type: 'epf', asset_category: 'income', value: 2_600_000 },
    { name: 'National Pension System', asset_type: 'nps', asset_category: 'income', value: 1_500_000 },
    { name: 'Gold Holdings', asset_type: 'gold', asset_category: 'alternative', value: 900_000 },
    { name: 'Savings Account', asset_type: 'cash', asset_category: 'liquidity', value: 600_000 },
];

const GOAL_POOL: Array<{ name: string; goal_type: string; priority: string; target: number; years: number }> = [
    { name: 'Retirement Corpus', goal_type: 'retirement', priority: 'essential', target: 100_000_000, years: 12 },
    { name: "Child's Higher Education", goal_type: 'education', priority: 'essential', target: 8_000_000, years: 8 },
    { name: 'Home Purchase', goal_type: 'home', priority: 'important', target: 25_000_000, years: 5 },
    { name: 'World Travel', goal_type: 'travel', priority: 'aspirational', target: 5_000_000, years: 3 },
    { name: 'Emergency Fund', goal_type: 'emergency_fund', priority: 'essential', target: 2_000_000, years: 1 },
    { name: 'Legacy Transfer', goal_type: 'legacy', priority: 'aspirational', target: 30_000_000, years: 20 },
];

const CHECKLIST_KEYS: Array<[number, string]> = [
    [1, 'profile.confirmed'], [1, 'assets.reviewed'], [1, 'cashflow.documented'],
    [1, 'goals.captured'], [1, 'risk.assessed'],
    [2, 'net_worth.reviewed'], [2, 'readiness.scored'], [2, 'conflicts.noted'],
    [2, 'scenarios.compared'],
    [3, 'allocation.agreed'], [3, 'waterfall.agreed'], [3, 'rebalance.plan_set'],
    [3, 'transition.plan_set'],
    [4, 'dossier.generated'], [4, 'ips.signed'], [4, 'actions.recorded'],
];

async function main(): Promise<void> {
    const client = new Client({ connectionString: databaseUrl() });
    await client.connect();

    const q = (text: string, params: unknown[] = []) => client.query(text, params);

    try {
        await q('BEGIN');

        // ---- Bootstrap: system user needed for the organizations INSERT policy.
        await q(`SELECT set_tenant_context($1::uuid, $2::uuid)`, [ORG_DEMO, SYSTEM_USER]);
        await q(
            `INSERT INTO users (id, email, full_name, status)
             VALUES ($1, $2, $3, 'active')
             ON CONFLICT (id) DO NOTHING`,
            [SYSTEM_USER, 'system@soundthesis.example', 'System (Demo Seed)'],
        );

        // ===================== Org A: Sound Thesis Demo Practice =====================
        await q(`SELECT set_tenant_context($1::uuid, $2::uuid)`, [ORG_DEMO, SYSTEM_USER]);
        await q(
            `INSERT INTO organizations (id, name, slug, plan_tier, settings)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [
                ORG_DEMO,
                DEMO_ORG_NAME,
                'sound-thesis-demo-practice',
                'professional',
                JSON.stringify({ demo: true, demo_label: 'DEMO' }),
            ],
        );

        for (const p of PRACTITIONERS) {
            await q(
                `INSERT INTO users (id, email, full_name, status)
                 VALUES ($1, $2, $3, 'active')
                 ON CONFLICT (id) DO NOTHING`,
                [p.id, p.email, p.fullName],
            );
            await q(
                `INSERT INTO organization_memberships (id, organization_id, user_id, role)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (organization_id, user_id) DO NOTHING`,
                [uuid(0x0100 + PRACTITIONERS.indexOf(p)), ORG_DEMO, p.id, p.role],
            );
        }

        // Global assumption set + one practice override (spec section 24).
        await q(
            `INSERT INTO assumption_sets (id, organization_id, name, source, version, data, valid_from)
             VALUES ($1, NULL, $2, $3, $4, $5, $6)
             ON CONFLICT (id) DO NOTHING`,
            [
                uuid(0x0200),
                'India Market Assumptions 2026-Q2',
                'market',
                '2026.2',
                JSON.stringify({
                    equity_return: 0.12, debt_return: 0.07, inflation: 0.06,
                    gold_return: 0.09, real_estate_return: 0.08,
                }),
                '2026-04-01',
            ],
        );
        await q(
            `INSERT INTO assumption_sets (id, organization_id, name, source, version, data)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (organization_id, name, version) DO NOTHING`,
            [
                uuid(0x0201), ORG_DEMO, 'Conservative House View', 'conservative', '2026.1',
                JSON.stringify({ equity_return: 0.10, debt_return: 0.065, inflation: 0.06 }),
            ],
        );

        // ---- Households: 10 multi-member + the rest single-member.
        const clientSerialBase = 0x1000;
        const households: string[] = [];
        for (let h = 0; h < 10; h += 1) {
            const householdId = uuid(0x0300 + h);
            const ln = LAST_NAMES[(h * 2 + 1) % LAST_NAMES.length];
            await q(
                `INSERT INTO households (id, organization_id, name)
                 VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
                [householdId, ORG_DEMO, `The ${ln} Family`],
            );
            households.push(householdId);
        }

        // ---- Clients (25). Client 0 is the featured Raj Sharma (spec section 180).
        const clientIds: string[] = [];
        for (let i = 0; i < 25; i += 1) {
            const id = uuid(clientSerialBase + i);
            clientIds.push(id);
            const first = FIRST_NAMES[i];
            const last = LAST_NAMES[i];
            const householdId = i === 0 ? null : i < 20 ? households[i % 10] : null;
            const dob =
                i === 0
                    ? '1974-03-10' // Raj Sharma, age 52
                    : `19${60 + Math.floor(rand(i, 1) * 20)}-${String(1 + Math.floor(rand(i, 2) * 12)).padStart(2, '0')}-1${Math.floor(rand(i, 3) * 9)}`;
            await q(
                `INSERT INTO clients (id, organization_id, household_id, first_name, last_name,
                                      email, date_of_birth, marital_status, status, notes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    id, ORG_DEMO, householdId, first, last,
                    `${first.toLowerCase()}.${last.toLowerCase()}${i}@example.demo`,
                    dob,
                    rand(i, 4) > 0.3 ? 'married' : 'single',
                    'active',
                    i === 0 ? 'DEMO client (spec section 180)' : null,
                ],
            );

            // Assign each client to a practitioner (primary + some secondary).
            const primary = PRACTITIONERS[1 + (i % 3)]; // practitioners 1..3 carry clients
            await q(
                `INSERT INTO client_assignments (client_id, user_id, assignment_role)
                 VALUES ($1, $2, 'primary') ON CONFLICT DO NOTHING`,
                [id, primary.id],
            );
            if (i % 4 === 0) {
                await q(
                    `INSERT INTO client_assignments (client_id, user_id, assignment_role)
                     VALUES ($1, $2, 'secondary') ON CONFLICT DO NOTHING`,
                    [id, PRACTITIONERS[3].id],
                );
            }

            // ---- Assets: 3-5 per client. Raj Sharma nets ₹6.84 Cr (spec section 180).
            if (i === 0) {
                const rajAssets: Array<[string, string, string, number]> = [
                    ['Listed Equity Portfolio', 'equity', 'growth', 21_000_000],
                    ['Equity Mutual Funds', 'mutual_fund', 'growth', 16_000_000],
                    ['Residential Property', 'real_estate', 'alternative', 25_000_000],
                    ['Fixed Income Ladder', 'fixed_income', 'income', 6_400_000],
                ];
                for (let a = 0; a < rajAssets.length; a += 1) {
                    await q(
                        `INSERT INTO assets (id, organization_id, client_id, name, asset_type,
                                             asset_category, current_value, expected_return)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                         ON CONFLICT (id) DO NOTHING`,
                        [
                            uuid(0x2000 + a), ORG_DEMO, id,
                            rajAssets[a][0], rajAssets[a][1], rajAssets[a][2], rajAssets[a][3],
                            0.11,
                        ],
                    );
                }
            } else {
                const assetCount = 3 + Math.floor(rand(i, 5) * 3);
                for (let a = 0; a < assetCount; a += 1) {
                    const pool = ASSET_POOL[Math.floor(rand(i, 10 + a) * ASSET_POOL.length)];
                    const value = Math.round(pool.value * (0.5 + rand(i, 20 + a)));
                    await q(
                        `INSERT INTO assets (id, organization_id, client_id, name, asset_type,
                                             asset_category, current_value, expected_return)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                         ON CONFLICT (id) DO NOTHING`,
                        [
                            uuid(0x2000 + i * 8 + a), ORG_DEMO, id,
                            pool.name, pool.asset_type, pool.asset_category, value,
                            0.06 + rand(i, 30 + a) * 0.06,
                        ],
                    );
                }
            }

            // ---- Goals: retirement for everyone + 1-2 extras.
            const goalCount = 1 + Math.floor(rand(i, 6) * 3);
            for (let g = 0; g < goalCount; g += 1) {
                const goal = GOAL_POOL[g === 0 ? 0 : Math.floor(rand(i, 40 + g) * GOAL_POOL.length)];
                await q(
                    `INSERT INTO goals (id, organization_id, client_id, name, goal_type, priority,
                                        target_amount, target_date, years_to_goal, inflation_rate)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     ON CONFLICT (id) DO NOTHING`,
                    [
                        uuid(0x3000 + i * 8 + g), ORG_DEMO, id,
                        goal.name, goal.goal_type, goal.priority, goal.target,
                        i === 0 && g === 0 ? '2033-04-01' : null,
                        i === 0 && g === 0 ? 7 : goal.years,
                        0.06,
                    ],
                );
            }

            // ---- Risk assessment snapshot.
            const riskProfile = rand(i, 7) > 0.6 ? 'aggressive' : rand(i, 7) > 0.3 ? 'balanced' : 'conservative';
            await q(
                `INSERT INTO risk_assessments (id, organization_id, client_id, answers, raw_score,
                                               profile, dimension_scores, questionnaire_version,
                                               assessed_by, completed_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now() - interval '30 days')
                 ON CONFLICT (id) DO NOTHING`,
                [
                    uuid(0x4000 + i), ORG_DEMO, id,
                    JSON.stringify({ horizon: 'long', drawdown_tolerance: rand(i, 8) > 0.5 }),
                    40 + Math.round(rand(i, 9) * 60),
                    riskProfile,
                    JSON.stringify({
                        capacity: Math.round(rand(i, 11) * 100),
                        tolerance: Math.round(rand(i, 12) * 100),
                        knowledge: Math.round(rand(i, 13) * 100),
                    }),
                    'risk-v2',
                    primary.id,
                ],
            );

            // ---- Cashflow rules: salary income + a SIP.
            await q(
                `INSERT INTO cashflow_rules (id, organization_id, client_id, type, name,
                                             annual_amount, annual_growth_rate, start_date)
                 VALUES ($1, $2, $3, 'income', 'Salary', $4, 0.08, $5)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    uuid(0x5000 + i * 4), ORG_DEMO, id,
                    1_800_000 + Math.round(rand(i, 14) * 6_000_000),
                    '2015-04-01',
                ],
            );
            await q(
                `INSERT INTO cashflow_rules (id, organization_id, client_id, type, name, monthly_amount)
                 VALUES ($1, $2, $3, 'sip', 'Monthly SIP', $4)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    uuid(0x5000 + i * 4 + 1), ORG_DEMO, id,
                    50_000 + Math.round(rand(i, 15) * 100_000),
                ],
            );
        }

        // ---- Plans (6 clients incl. Raj Sharma), versions, scenarios, reports, tasks.
        const planClients = [0, 1, 2, 5, 8, 13];
        for (let p = 0; p < planClients.length; p += 1) {
            const clientId = clientIds[planClients[p]];
            const planId = uuid(0x6000 + p);
            const isRaj = planClients[p] === 0;
            const versionCount = isRaj ? 3 : 2;

            await q(
                `INSERT INTO retirement_plans (id, organization_id, client_id, name, status, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    planId, ORG_DEMO, clientId,
                    isRaj ? 'Retirement 2033 Plan' : `Retirement Plan ${p}`,
                    isRaj ? 'approved' : 'in_review',
                    PRACTITIONERS[1].id,
                ],
            );

            let currentVersionId = '';
            for (let v = 1; v <= versionCount; v += 1) {
                const versionId = uuid(0x6100 + p * 16 + v);
                currentVersionId = versionId;
                const inputSnapshot = {
                    current_age: isRaj ? 52 : 38 + p * 3,
                    retirement_age: isRaj ? 59 : 60,
                    life_expectancy: 85,
                    monthly_sip: 82_000 + v * 5_000,
                    ...(isRaj ? { retirement_year: 2033 } : {}),
                };
                const resultSnapshot = {
                    projected_surplus: 10_000_000 + p * 2_000_000 + v * 1_500_000,
                    plan_health: isRaj ? 82 : 65 + p * 4 + v, // Raj: health 82 (spec 180)
                };
                await q(
                    `INSERT INTO plan_versions (id, organization_id, plan_id, version_number,
                                                input_snapshot, assumptions_snapshot, result_snapshot,
                                                engine_version, created_by, change_summary)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                     ON CONFLICT (plan_id, version_number) DO NOTHING`,
                    [
                        versionId, ORG_DEMO, planId, v,
                        JSON.stringify(inputSnapshot),
                        JSON.stringify({ source: 'market', set: '2026-Q2' }),
                        JSON.stringify(resultSnapshot),
                        ENGINE_VERSION,
                        PRACTITIONERS[1].id,
                        v === 1 ? 'Initial plan' : `Adjustment v${v}`,
                    ],
                );
            }
            await q(
                `UPDATE retirement_plans SET current_version_id = $1 WHERE id = $2`,
                [currentVersionId, planId],
            );

            // Scenarios pinned to the previous version; one deliberately stale.
            const scenarioTypes = isRaj
                ? ['base', 'conservative', 'optimistic', 'stress']
                : ['base', 'conservative', 'optimistic'];
            for (let s = 0; s < scenarioTypes.length; s += 1) {
                const stale = isRaj && s === 3;
                await q(
                    `INSERT INTO plan_scenarios (id, organization_id, plan_id, name, scenario_type,
                                                 assumptions, result, result_status, base_version_id,
                                                 assumption_set_id, engine_version, created_by)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                     ON CONFLICT (id) DO NOTHING`,
                    [
                        uuid(0x6200 + p * 8 + s), ORG_DEMO, planId,
                        `${scenarioTypes[s][0].toUpperCase()}${scenarioTypes[s].slice(1)} scenario`,
                        scenarioTypes[s],
                        JSON.stringify({ equity_return_delta: s * -0.01 }),
                        JSON.stringify({ projected_surplus: 9_000_000 + s * 1_200_000 }),
                        stale ? 'stale' : 'calculated',
                        uuid(0x6100 + p * 16 + (stale ? 2 : versionCount)),
                        uuid(0x0200),
                        ENGINE_VERSION,
                        PRACTITIONERS[1].id,
                    ],
                );
            }

            // Report + tasks + decision/audit activity.
            await q(
                `INSERT INTO reports (id, organization_id, client_id, plan_id, report_type, status,
                                      plan_version_id, storage_key, created_by, completed_at)
                 VALUES ($1, $2, $3, $4, $5, 'ready', $6, $7, $8, now() - interval '7 days')
                 ON CONFLICT (id) DO NOTHING`,
                [
                    uuid(0x6300 + p), ORG_DEMO, clientId, planId,
                    isRaj ? 'retirement_plan' : 'plan_summary',
                    currentVersionId,
                    `demo/reports/${planId}.pdf`,
                    PRACTITIONERS[1].id,
                ],
            );
            await q(
                `INSERT INTO tasks (id, organization_id, client_id, plan_id, title, assigned_to,
                                    due_at, status, priority, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, now() + interval '14 days', 'open', 'high', $7)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    uuid(0x6400 + p), ORG_DEMO, clientId, planId,
                    isRaj ? 'Review retirement age change (55 → 57)' : `Follow up on plan ${p}`,
                    PRACTITIONERS[1 + (p % 3)].id,
                    PRACTITIONERS[1].id,
                ],
            );
            await q(
                `INSERT INTO decision_logs (id, organization_id, client_id, plan_id, actor_user_id,
                                            action, summary, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    uuid(0x6500 + p), ORG_DEMO, clientId, planId, PRACTITIONERS[1].id,
                    isRaj ? 'changed_retirement_age' : 'plan_created',
                    isRaj
                        ? 'Changed retirement age: 55 → 57. Projected surplus: ₹46L → ₹1.08Cr'
                        : `Created plan v${versionCount}`,
                    JSON.stringify({ demo: true }),
                ],
            );
            await q(
                `INSERT INTO audit_logs (id, organization_id, actor_user_id, action, entity_type,
                                         entity_id, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6, $7)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    uuid(0x6600 + p), ORG_DEMO, PRACTITIONERS[1].id,
                    'plan.created', 'retirement_plan', planId,
                    JSON.stringify({ demo: true }),
                ],
            );
        }

        // ---- Meetings with checklist + notes for the first 4 clients.
        for (let m = 0; m < 4; m += 1) {
            const clientId = clientIds[m];
            const meetingId = uuid(0x7000 + m);
            await q(
                `INSERT INTO meeting_sessions (id, organization_id, client_id, title, current_stage,
                                               status, started_at, created_by)
                 VALUES ($1, $2, $3, $4, $5, $6, now() - interval '3 days', $7)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    meetingId, ORG_DEMO, clientId,
                    m === 0 ? 'Annual review — Raj Sharma' : `Discovery meeting ${m}`,
                    m === 0 ? 3 : 1,
                    m === 0 ? 'in_progress' : 'open',
                    PRACTITIONERS[1].id,
                ],
            );
            for (let c = 0; c < CHECKLIST_KEYS.length; c += 1) {
                const done = m === 0 ? c < 10 : c < 5;
                await q(
                    `INSERT INTO meeting_checklist_items (id, organization_id, meeting_id, stage_id,
                                                          checklist_key, completed, completed_by,
                                                          completed_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                     ON CONFLICT (meeting_id, checklist_key) DO NOTHING`,
                    [
                        uuid(0x7100 + m * 32 + c), ORG_DEMO, meetingId,
                        CHECKLIST_KEYS[c][0], CHECKLIST_KEYS[c][1], done,
                        done ? PRACTITIONERS[1].id : null,
                        done ? new Date() : null,
                    ],
                );
            }
            await q(
                `INSERT INTO meeting_notes (id, organization_id, meeting_id, stage_id, body, author_id)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    uuid(0x7200 + m), ORG_DEMO, meetingId, m === 0 ? 2 : 1,
                    m === 0
                        ? 'Client is weighing early retirement at 57 versus 59. Equity allocation agreed at 55%. DEMO note.'
                        : `Discovery notes for client ${m}. DEMO note.`,
                    PRACTITIONERS[1].id,
                ],
            );
        }

        // ---- Notifications for every practitioner.
        for (let n = 0; n < PRACTITIONERS.length; n += 1) {
            await q(
                `INSERT INTO notifications (id, organization_id, user_id, type, title, body)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    uuid(0x7300 + n * 2), ORG_DEMO, PRACTITIONERS[n].id,
                    'task.due_soon',
                    'Task due soon',
                    'Review retirement age change (55 → 57) is due in 14 days.',
                ],
            );
            await q(
                `INSERT INTO notifications (id, organization_id, user_id, type, title, body)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    uuid(0x7300 + n * 2 + 1), ORG_DEMO, PRACTITIONERS[n].id,
                    'report.ready',
                    'Report ready',
                    'Retirement 2033 Plan report is ready to download.',
                ],
            );
        }

        // ===================== Org B: Northstar Wealth (Demo) =====================
        const northstarOwner = uuid(0x8000);
        const northstarClient = uuid(0x8100);
        await q(`SELECT set_tenant_context($1::uuid, $2::uuid)`, [ORG_NORTHSTAR, northstarOwner]);
        await q(
            `INSERT INTO users (id, email, full_name, status)
             VALUES ($1, $2, $3, 'active') ON CONFLICT (id) DO NOTHING`,
            [northstarOwner, 'nadia.demo@northstar.example', 'Nadia Fernandes'],
        );
        await q(
            `INSERT INTO organizations (id, name, slug, plan_tier, settings)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
            [
                ORG_NORTHSTAR, 'Northstar Wealth (Demo)', 'northstar-wealth-demo', 'standard',
                JSON.stringify({ demo: true, demo_label: 'DEMO' }),
            ],
        );
        await q(
            `INSERT INTO organization_memberships (id, organization_id, user_id, role)
             VALUES ($1, $2, $3, 'practice_owner') ON CONFLICT (organization_id, user_id) DO NOTHING`,
            [uuid(0x8010), ORG_NORTHSTAR, northstarOwner],
        );
        await q(
            `INSERT INTO clients (id, organization_id, first_name, last_name, email, status)
             VALUES ($1, $2, $3, $4, $5, 'active') ON CONFLICT (id) DO NOTHING`,
            [
                northstarClient, ORG_NORTHSTAR, 'Nadia', 'Client',
                'northstar.client@example.demo',
            ],
        );
        await q(
            `INSERT INTO client_assignments (client_id, user_id, assignment_role)
             VALUES ($1, $2, 'primary') ON CONFLICT DO NOTHING`,
            [northstarClient, northstarOwner],
        );
        await q(
            `INSERT INTO assets (id, organization_id, client_id, name, asset_type, asset_category,
                                 current_value)
             VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING`,
            [
                uuid(0x8200), ORG_NORTHSTAR, northstarClient,
                'Index Fund Portfolio', 'mutual_fund', 'growth', 4_200_000,
            ],
        );

        await q('COMMIT');
        console.log('seed complete: 2 demo organizations (Sound Thesis Demo Practice, Northstar Wealth (Demo))');
    } catch (err) {
        await q('ROLLBACK').catch(() => undefined);
        throw err;
    } finally {
        await client.end();
    }
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
