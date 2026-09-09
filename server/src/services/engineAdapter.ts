import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type {
  AssetCategory,
  MasterPlanInputs,
  RiskProfile,
} from '../../../src/types/index.js';
import type {
  AssumptionSet,
  CategoryAssumptions,
} from '../../../src/lib/assumptions.js';
import type {
  GoalResult,
  TaxSummary,
  CurrencyExposure,
  WealthEngineResult,
} from '../../../src/lib/wealthEngine.js';

/**
 * Engine adapter (spec §50, §188–§190).
 *
 * Bridges the platform's persisted plan-input JSONB (the frontend
 * `MasterPlanInputs` shape, stored verbatim in plan_versions.input_snapshot)
 * and the existing wealth engine (`src/lib/wealthEngine.ts`). The engine is
 * reused as-is — nothing here reimplements projection math.
 *
 * FIELD MAPPING (plan input_snapshot → engine MasterPlanInputs):
 *   currentAge / retirementAge / lifeExpectancy / inflation /
 *   annualIncome / monthlyExpenditure → 1:1 by the same names.
 *   assets[] → engine Asset { id, name, value, returnRate, category,
 *     currency, liquidateAtRetirement, source? }. The DB asset_category
 *     vocabulary ('mutual_fund', 'property', 'epf', 'cash', …) is normalized
 *     onto the engine's six categories via mapAssetCategory(); unknown
 *     categories fall back to 'other'.
 *   sip { amount, equitySplit, debtSplit, stepUp, equityReturn, debtReturn }
 *     → 1:1. Defaults: amount 0, splits 60/40, stepUp 0.
 *   stp → 1:1; default inactive.
 *   swp { monthlyNeedToday, postRetirementReturn, taxRate, startAge, endAge }
 *     → 1:1. NOTE: the engine's deterministic/Monte-Carlo paths currently
 *     apply the same category means in both phases (swp.postRetirementReturn
 *     is accepted but not consumed by the engine); postRetirementReturn IS
 *     used server-side to compute the requiredCorpus annuity figure.
 *   goals[] → engine Goal { id, name, targetAmount, yearsToGoal, priority,
 *     inflation, recurring, priorityRank? } 1:1.
 *   client → ClientProfile 1:1 (cosmetic inside the engine).
 * Missing sub-objects are filled with documented defaults, so a `{}`
 * input_snapshot (fresh plan v1) still runs with zeroed assumptions.
 *
 * Numbers must be finite (spec §186): the zod schema rejects NaN/Infinity
 * inputs, and mapEngineResult/assertFiniteOutput guard the outputs.
 */

const ENGINE_CATEGORIES: AssetCategory[] = [
  'equity',
  'debt',
  'gold',
  'realestate',
  'liquid',
  'other',
];

const CATEGORY_SYNONYMS: Record<string, AssetCategory> = {
  equity: 'equity',
  stock: 'equity',
  stocks: 'equity',
  shares: 'equity',
  mutual_fund: 'equity',
  mutualfund: 'equity',
  mf: 'equity',
  index_fund: 'equity',
  elss: 'equity',
  debt: 'debt',
  bond: 'debt',
  bonds: 'debt',
  fd: 'debt',
  fixed_deposit: 'debt',
  ppf: 'debt',
  epf: 'debt',
  nps: 'debt',
  gold: 'gold',
  commodity: 'gold',
  commodities: 'gold',
  silver: 'gold',
  property: 'realestate',
  realestate: 'realestate',
  real_estate: 'realestate',
  realty: 'realestate',
  house: 'realestate',
  land: 'realestate',
  cash: 'liquid',
  liquid: 'liquid',
  savings: 'liquid',
  bank: 'liquid',
  other: 'other',
  crypto: 'other',
};

export function mapAssetCategory(raw: string | null | undefined): AssetCategory {
  if (!raw) return 'other';
  const hit = CATEGORY_SYNONYMS[raw.trim().toLowerCase()];
  return hit ?? 'other';
}

const finiteNumber = z.number().finite();

const clientProfileSchema = z.object({
  name: z.string().default(''),
  email: z.string().optional(),
  advisor: z.string().default(''),
  reviewDate: z.string().default(''),
  notes: z.string().optional(),
});

const engineAssetSchema = z.object({
  id: z.string().default(() => randomUUID()),
  name: z.string().default('Asset'),
  value: finiteNumber.nonnegative(),
  returnRate: finiteNumber.default(10),
  category: z
    .string()
    .transform((c) => mapAssetCategory(c))
    .default('other'),
  currency: z.string().default('INR'),
  liquidateAtRetirement: z.boolean().default(false),
  source: z.string().optional(),
});

const sipSchema = z.object({
  amount: finiteNumber.nonnegative().default(0),
  equitySplit: finiteNumber.min(0).max(100).default(60),
  debtSplit: finiteNumber.min(0).max(100).default(40),
  stepUp: finiteNumber.min(0).default(0),
  equityReturn: finiteNumber.default(12),
  debtReturn: finiteNumber.default(8),
});

const stpSchema = z.object({
  active: z.boolean().default(false),
  source: z.enum(['idle-cash', 'land-sale', 'custom']).default('custom'),
  lumpsum: finiteNumber.nonnegative().default(0),
  monthlyTransfer: finiteNumber.nonnegative().default(0),
  liquidReturn: finiteNumber.default(7),
  equitySplit: finiteNumber.min(0).max(100).default(50),
  debtSplit: finiteNumber.min(0).max(100).default(50),
  liquidCap: finiteNumber.nonnegative().default(0),
});

const swpSchema = z.object({
  monthlyNeedToday: finiteNumber.nonnegative().default(0),
  postRetirementReturn: finiteNumber.min(0).max(30).default(8),
  taxRate: finiteNumber.min(0).max(100).default(0),
  startAge: finiteNumber.default(60),
  endAge: finiteNumber.default(85),
});

const goalSchema = z.object({
  id: z.string().default(() => randomUUID()),
  name: z.string().default('Goal'),
  targetAmount: finiteNumber.nonnegative().default(0),
  yearsToGoal: finiteNumber.nonnegative().default(1),
  priority: z.enum(['essential', 'important', 'aspirational']).default('important'),
  inflation: finiteNumber.min(0).max(30).default(6),
  recurring: z.boolean().default(false),
  priorityRank: finiteNumber.optional(),
});

export const planInputSchema = z
  .object({
    client: clientProfileSchema.prefault({}),
    currentAge: finiteNumber.min(0).max(120).default(35),
    retirementAge: finiteNumber.min(0).max(120).default(60),
    lifeExpectancy: finiteNumber.min(0).max(130).default(85),
    inflation: finiteNumber.min(0).max(30).default(6),
    annualIncome: finiteNumber.nonnegative().default(0),
    monthlyExpenditure: finiteNumber.nonnegative().default(0),
    assets: z.array(engineAssetSchema).default([]),
    sip: sipSchema.prefault({}),
    stp: stpSchema.prefault({}),
    swp: swpSchema.prefault({}),
    goals: z.array(goalSchema).default([]),
  })
  .refine((v) => v.retirementAge > v.currentAge, {
    message: 'retirementAge must be greater than currentAge',
    path: ['retirementAge'],
  })
  .refine((v) => v.lifeExpectancy >= v.retirementAge, {
    message: 'lifeExpectancy must be >= retirementAge',
    path: ['lifeExpectancy'],
  });

export type ValidatedPlanInput = z.infer<typeof planInputSchema>;

/** Validate a persisted input_snapshot and map it onto the engine input type. */
export function mapPlanInputToEngineInput(raw: unknown): MasterPlanInputs {
  return planInputSchema.parse(raw ?? {}) as MasterPlanInputs;
}

// ---------------------------------------------------------------------------
// Assumptions
// ---------------------------------------------------------------------------

/**
 * Schema-default assumption set, mirroring `getDefaultAssumptions()` in
 * src/lib/assumptions.ts. It is redeclared here (rather than imported)
 * because that module's value-import graph reaches browser-only market-data
 * code; keeping a server-side copy of the defaults keeps the runtime import
 * graph limited to wealthEngine/random/returns. If no assumption_sets row
 * exists (global or org override), THIS is what the engine runs with.
 */
export function getSchemaDefaultAssumptions(): AssumptionSet {
  const categories: Record<AssetCategory, CategoryAssumptions> = {
    equity: { mean: 0.135, std: 0.182 },
    debt: { mean: 0.065, std: 0.052 },
    gold: { mean: 0.136, std: 0.161 },
    realestate: { mean: 0.103, std: 0.18 },
    liquid: { mean: 0.055, std: 0.011 },
    other: { mean: 0.08, std: 0.18 },
  };
  const covariance: AssumptionSet['covariance'] = {
    equity: { equity: 0.0331, debt: 0.0014, gold: -0.0004, realestate: 0.0115, liquid: 0.00005, other: 0.0098 },
    debt: { equity: 0.0014, debt: 0.0027, gold: 0.0008, realestate: 0.0014, liquid: 0.0001, other: 0.0014 },
    gold: { equity: -0.0004, debt: 0.0008, gold: 0.0259, realestate: 0.0014, liquid: -0.00003, other: 0.0029 },
    realestate: { equity: 0.0115, debt: 0.0014, gold: 0.0014, realestate: 0.0324, liquid: 0.0001, other: 0.0065 },
    liquid: { equity: 0.00005, debt: 0.0001, gold: -0.00003, realestate: 0.0001, liquid: 0.00012, other: 0.0001 },
    other: { equity: 0.0098, debt: 0.0014, gold: 0.0029, realestate: 0.0065, liquid: 0.0001, other: 0.0324 },
  };
  const correlation: AssumptionSet['correlation'] = {
    equity: { equity: 1, debt: 0.15, gold: -0.016, realestate: 0.35, liquid: 0.025, other: 0.3 },
    debt: { equity: 0.15, debt: 1, gold: 0.1, realestate: 0.15, liquid: 0.18, other: 0.15 },
    gold: { equity: -0.016, debt: 0.1, gold: 1, realestate: 0.05, liquid: -0.017, other: 0.1 },
    realestate: { equity: 0.35, debt: 0.15, gold: 0.05, realestate: 1, liquid: 0.05, other: 0.2 },
    liquid: { equity: 0.025, debt: 0.18, gold: -0.017, realestate: 0.05, liquid: 1, other: 0.05 },
    other: { equity: 0.3, debt: 0.15, gold: 0.1, realestate: 0.2, liquid: 0.05, other: 1 },
  };
  return {
    categories,
    covariance,
    correlation,
    fx: {},
    fetchedAt: new Date().toISOString(),
    source: 'default',
  };
}

/**
 * Merge an org assumption-set override (assumption_sets.data JSONB) on top of
 * a base set. Recognized keys: `categories` (per-category {mean, std} —
 * `mean` may be given either as a decimal (≤ 1) or a percentage (> 1, then
 * divided by 100)), `fx` ({ [currency]: { mean, std } }) and `inflationHint`
 * (metadata only — engine inflation comes from the plan input). Unknown keys
 * are ignored so a stored global set can carry extra metadata.
 */
export function mergeAssumptionOverride(
  base: AssumptionSet,
  override: unknown,
): AssumptionSet {
  if (!override || typeof override !== 'object') return base;
  const data = override as Record<string, unknown>;
  const merged: AssumptionSet = {
    ...base,
    categories: { ...base.categories },
    covariance: base.covariance,
    correlation: base.correlation,
    fx: { ...base.fx },
  };
  const cats = data['categories'];
  if (cats && typeof cats === 'object') {
    for (const cat of ENGINE_CATEGORIES) {
      const entry = (cats as Record<string, unknown>)[cat];
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Record<string, unknown>;
      const out = { ...merged.categories[cat] };
      if (typeof e['mean'] === 'number' && Number.isFinite(e['mean'])) {
        const m = e['mean'] as number;
        out.mean = m > 1 ? m / 100 : m;
      }
      if (typeof e['std'] === 'number' && Number.isFinite(e['std'])) {
        const s = e['std'] as number;
        out.std = s > 1 ? s / 100 : s;
      }
      merged.categories[cat] = out;
    }
  }
  const fx = data['fx'];
  if (fx && typeof fx === 'object') {
    for (const [currency, stats] of Object.entries(fx as Record<string, unknown>)) {
      if (!stats || typeof stats !== 'object') continue;
      const s = stats as Record<string, unknown>;
      if (typeof s['mean'] === 'number' && typeof s['std'] === 'number') {
        merged.fx[currency] = { mean: s['mean'] as number, std: s['std'] as number };
      }
    }
  }
  return merged;
}

// ---------------------------------------------------------------------------
// Required corpus (§188) — growing-annuity PV of retirement withdrawals
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Corpus required AT retirement to fund the SWP stream: the present value at
 * retirement of annual withdrawals G_t = 12 · monthlyNeedToday ·
 * (1+inflation)^(accYears + t − 1) / (1 − taxRate), discounted at the
 * post-retirement return (growing-annuity closed form). Hand-computable, so
 * the §145 test can assert it independently.
 */
export function computeRequiredCorpus(input: MasterPlanInputs): number {
  const accYears = Math.max(0, input.retirementAge - input.currentAge);
  const distYears = Math.max(0, input.lifeExpectancy - input.retirementAge);
  const monthly = input.swp.monthlyNeedToday;
  if (monthly <= 0 || distYears <= 0) return 0;
  const infl = input.inflation / 100;
  const tax = input.swp.taxRate / 100;
  const r = input.swp.postRetirementReturn / 100;
  const g1 = (monthly * 12 * Math.pow(1 + infl, accYears)) / (1 - tax);
  if (Math.abs(r - infl) < 1e-9) return round2(g1 * distYears);
  const pv = (g1 / (r - infl)) * (1 - Math.pow((1 + infl) / (1 + r), distYears));
  return round2(Math.max(0, pv));
}

// ---------------------------------------------------------------------------
// Engine output → §188 RetirementPlanResult
// ---------------------------------------------------------------------------

export interface YearlyProjectionRow {
  year: number;
  age: number;
  nominal: number;
  real: number;
  invested: number;
  withdrawn: number;
  goalsFunded: number;
  phase: 'accumulation' | 'distribution';
}

export interface MonteCarloSummary {
  successRate: number;
  medianTerminal: number;
  meanTerminal: number;
  percentile5: number;
  percentile25: number;
  percentile75: number;
  percentile95: number;
  medianDepletionAge: number | null;
  yearlyPercentiles: WealthEngineResult['monteCarlo']['yearlyPercentiles'];
}

export interface AllocationBreakdown {
  current: Record<AssetCategory, number>;
  target: Record<AssetCategory, number>;
  projected: Record<AssetCategory, number>;
}

/** §188 RetirementPlanResult contract. */
export interface RetirementPlanResult {
  requiredCorpus: number;
  projectedCorpus: number;
  fundingRatio: number;
  corpusGap: number;
  probabilityOfSuccess: number;
  depletionAge: number | null;
  terminalNominalValue: number;
  terminalRealValue: number;
  yearlyProjection: YearlyProjectionRow[];
  goalResults: GoalResult[];
  allocation: AllocationBreakdown | null;
  taxSummary: TaxSummary;
  currencyExposure: CurrencyExposure[];
  monteCarlo: MonteCarloSummary;
  metadata: {
    engineVersion: string;
    assumptionVersion: string;
    simulationCount: number;
    seed: number | null;
    calculatedAt: string;
    source: 'server';
  };
}

/**
 * True when every numeric leaf of the value is finite (spec §186 — stored
 * results must never contain NaN/Infinity).
 */
export function isFiniteDeep(value: unknown, depth = 0): boolean {
  if (depth > 40) return false;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every((v) => isFiniteDeep(v, depth + 1));
  if (value !== null && typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every((v) =>
      isFiniteDeep(v, depth + 1),
    );
  }
  return true;
}

export function mapEngineResult(params: {
  engine: WealthEngineResult;
  input: MasterPlanInputs;
  requiredCorpus: number;
  engineVersion: string;
  assumptionVersion: string;
  simulationCount: number;
  seed: number | null;
}): RetirementPlanResult {
  const { engine, input, requiredCorpus } = params;
  const accYears = Math.max(0, input.retirementAge - input.currentAge);
  const corpusAtRetirement =
    engine.snapshots.find((s) => s.year === accYears)?.total ??
    engine.snapshots[0]?.total ??
    0;
  const projectedCorpus = round2(corpusAtRetirement);
  const rawRatio = requiredCorpus > 0 ? projectedCorpus / requiredCorpus : 0;
  // fundingRatio is clamped to [0, 10] (spec §145 test bound); requiredCorpus
  // of 0 means no withdrawal need — report full funding.
  const fundingRatio =
    requiredCorpus > 0 ? round2(Math.min(10, Math.max(0, rawRatio))) : 10;

  return {
    requiredCorpus,
    projectedCorpus,
    fundingRatio,
    corpusGap: round2(requiredCorpus - projectedCorpus),
    probabilityOfSuccess: engine.monteCarlo.successRate,
    depletionAge: engine.depletionAge,
    terminalNominalValue: engine.terminalValue,
    terminalRealValue: engine.terminalRealValue,
    yearlyProjection: engine.snapshots.map((s) => ({
      year: s.year,
      age: s.age,
      nominal: s.total,
      real: s.realTotal,
      invested: s.invested,
      withdrawn: s.withdrawn,
      goalsFunded: s.goalsFunded,
      phase: s.phase,
    })),
    goalResults: engine.goalResults,
    // The engine always produces allocation breakdowns; the stored shape is
    // percentages (0–1). When the plan has no assets at all, current/target
    // are still defined by the engine — we keep them and document that.
    allocation: {
      current: engine.currentAllocation,
      target: engine.targetAllocation,
      projected: engine.projectedAllocation,
    },
    taxSummary: engine.taxSummary,
    currencyExposure: engine.currencyExposure,
    monteCarlo: {
      successRate: engine.monteCarlo.successRate,
      medianTerminal: engine.monteCarlo.medianTerminal,
      meanTerminal: engine.monteCarlo.meanTerminal,
      percentile5: engine.monteCarlo.percentile5,
      percentile25: engine.monteCarlo.percentile25,
      percentile75: engine.monteCarlo.percentile75,
      percentile95: engine.monteCarlo.percentile95,
      medianDepletionAge: engine.monteCarlo.medianDepletionAge,
      yearlyPercentiles: engine.monteCarlo.yearlyPercentiles,
    },
    metadata: {
      engineVersion: params.engineVersion,
      assumptionVersion: params.assumptionVersion,
      simulationCount: params.simulationCount,
      seed: params.seed,
      calculatedAt: new Date().toISOString(),
      source: 'server',
    },
  };
}

/** Strip per-outcome simulation paths before persisting (bounded JSONB). */
export function trimEngineResultForStorage(result: RetirementPlanResult): RetirementPlanResult {
  return result; // outcomes are already excluded by mapEngineResult (monteCarloSummary only)
}

export type { RiskProfile };
