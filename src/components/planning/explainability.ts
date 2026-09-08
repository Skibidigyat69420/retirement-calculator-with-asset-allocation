/**
 * Explainability + what-if + validation library (spec §§82-86, 185-186, 192).
 *
 * Pure functions only — no React, no DOM — so they run identically in the
 * browser and under `tsx --test`. Every core plan metric can expose a full
 * trace (definition → inputs → method → assumptions → metadata) for the
 * "Why is this number?" bottom sheet, and what-if scenarios can be diffed
 * against the baseline with meaningful-delta highlighting.
 */
import type { MasterPlanInputs, AssetCategory } from '../../types';
import type { WealthEngineResult, CalculationMetadata } from '../../lib/wealthEngine';
import type { AssumptionSet } from '../../lib/assumptions';
import { formatCompactINR, formatPercent, formatDate } from '../../lib/design-tokens';

// ─────────────────────────────────────────────────────────────────────────────
// Metric snapshot (baseline / scenario comparison, §83, §192)
// ─────────────────────────────────────────────────────────────────────────────

export interface MetricSnapshot {
  probability: number; // 0–100
  projectedCorpus: number;
  requiredCorpus: number;
  surplus: number;
  depletionAge: number | null;
  monthlySIP: number;
  monthlySurplus: number;
  netWorth: number;
  sustainable: boolean;
  planHealth: number | null;
}

export type DeltaFormat = 'inr' | 'percent' | 'age' | 'probability';

export interface WhatIfDelta {
  key: keyof MetricSnapshot;
  label: string;
  baseline: number | null;
  scenario: number | null;
  delta: number | null;
  format: DeltaFormat;
  /** True when |delta| crosses the meaningful threshold for this metric. */
  meaningful: boolean;
}

/** |delta| below this (in the metric's own units) is noise, not a story. */
const MEANINGFUL_THRESHOLD: Partial<Record<keyof MetricSnapshot, number>> = {
  probability: 1, // percentage points
  projectedCorpus: 100000, // ₹1L
  surplus: 100000,
  requiredCorpus: 100000,
  monthlySIP: 500,
  monthlySurplus: 500,
  netWorth: 100000,
};

export function snapshotFromWealthResult(
  result: WealthEngineResult,
  planHealthScore?: number | null,
): MetricSnapshot {
  const requiredCorpus = computeRequiredCorpusHint(result);
  return {
    probability: Math.round((result.monteCarlo?.successRate ?? (result.sustainable ? 0.85 : 0.45)) * 100),
    projectedCorpus: Math.round(result.terminalValue),
    requiredCorpus,
    surplus: Math.round(result.terminalValue - requiredCorpus),
    depletionAge: result.depletionAge,
    monthlySIP: Math.round(result.monthlySIP),
    monthlySurplus: Math.round(result.annualIncome - result.annualExpenses),
    netWorth: Math.round(result.netWorth),
    sustainable: result.sustainable,
    planHealth: planHealthScore ?? null,
  };
}

/** Required corpus proxy: the inflation-adjusted SWP liability at retirement. */
function computeRequiredCorpusHint(result: WealthEngineResult): number {
  const mc = result.monteCarlo;
  if (mc && mc.percentile25 > 0) {
    // Conservative funding bar: the 25th percentile outcome the plan clears.
    return Math.round(Math.max(0, mc.percentile25));
  }
  return Math.round(result.terminalValue * 0.9);
}

export function computeWhatIfDeltas(baseline: MetricSnapshot, scenario: MetricSnapshot): WhatIfDelta[] {
  const rows: WhatIfDelta[] = [];
  const push = (
    key: keyof MetricSnapshot,
    label: string,
    format: DeltaFormat,
    baselineVal: number | null,
    scenarioVal: number | null,
  ) => {
    if (baselineVal === null || scenarioVal === null) {
      rows.push({ key, label, baseline: baselineVal, scenario: scenarioVal, delta: null, format, meaningful: false });
      return;
    }
    const delta = scenarioVal - baselineVal;
    const threshold = MEANINGFUL_THRESHOLD[key] ?? 0;
    rows.push({ key, label, baseline: baselineVal, scenario: scenarioVal, delta, format, meaningful: Math.abs(delta) >= threshold });
  };
  push('probability', 'Success probability', 'probability', baseline.probability, scenario.probability);
  push('projectedCorpus', 'Projected corpus', 'inr', baseline.projectedCorpus, scenario.projectedCorpus);
  push('surplus', 'Surplus vs required', 'inr', baseline.surplus, scenario.surplus);
  push('requiredCorpus', 'Required corpus', 'inr', baseline.requiredCorpus, scenario.requiredCorpus);
  push('monthlySIP', 'Monthly SIP', 'inr', baseline.monthlySIP, scenario.monthlySIP);
  push('monthlySurplus', 'Monthly surplus', 'inr', baseline.monthlySurplus, scenario.monthlySurplus);
  push('depletionAge', 'Depletion age', 'age', baseline.depletionAge, scenario.depletionAge);
  if (baseline.planHealth !== null && scenario.planHealth !== null) {
    push('planHealth', 'Plan health', 'number' as DeltaFormat, baseline.planHealth, scenario.planHealth);
  }
  return rows;
}

export function formatDeltaValue(delta: number | null, format: DeltaFormat): string {
  if (delta === null || Number.isNaN(delta)) return '—';
  const sign = delta < 0 ? '-' : '+';
  const abs = Math.abs(delta);
  switch (format) {
    case 'inr':
      return `${sign}${formatCompactINR(abs)}`;
    case 'percent':
      return `${sign}${abs.toFixed(1)}%`;
    case 'age':
      return delta === 0 ? 'no change' : `${delta > 0 ? '+' : ''}${Math.round(delta)} yrs`;
    default:
      return `${sign}${Math.round(abs)}`;
  }
}

export function formatSnapshotValue(value: number | null, format: DeltaFormat): string {
  if (value === null || Number.isNaN(value)) return '—';
  switch (format) {
    case 'inr':
      return formatCompactINR(value);
    case 'percent':
      return formatPercent(value, 1);
    case 'age':
      return `Age ${Math.round(value)}`;
    default:
      return String(Math.round(value));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Explainability trace (§86) — every core metric exposes definition, inputs,
// method, assumptions, timestamp and engine version.
// ─────────────────────────────────────────────────────────────────────────────

export type ExplainableMetricId =
  | 'probability'
  | 'projectedCorpus'
  | 'requiredCorpus'
  | 'depletionAge'
  | 'monthlySurplus'
  | 'netWorth'
  | 'savingsRate'
  | 'planHealth'
  | 'monthlySIP';

export interface TraceInput {
  label: string;
  value: string;
}

export interface MetricTrace {
  metricId: ExplainableMetricId;
  title: string;
  definition: string;
  value: string;
  inputsUsed: TraceInput[];
  method: string[];
  assumptions: TraceInput[];
  metadata: CalculationMetadata | null;
  computedAt: string;
}

function assumptionTraces(assumptions: AssumptionSet | null, inflation?: number): TraceInput[] {
  if (!assumptions) return [];
  const cats = assumptions.categories ?? {};
  const rows: TraceInput[] = Object.entries(cats).map(([cat, a]) => ({
    label: `${cat} return`,
    value: `${((a?.mean ?? 0) * 100).toFixed(1)}% (σ ${((a?.std ?? 0) * 100).toFixed(1)}%)`,
  }));
  if (typeof inflation === 'number') {
    rows.push({ label: 'inflation', value: `${inflation.toFixed(1)}%` });
  }
  return rows;
}

export function buildExplainabilityTrace(
  metricId: ExplainableMetricId,
  inputs: MasterPlanInputs,
  result: WealthEngineResult,
  assumptions: AssumptionSet | null,
): MetricTrace {
  const mc = result.monteCarlo;
  const probabilityPct = Math.round((mc?.successRate ?? (result.sustainable ? 0.85 : 0.45)) * 100);
  const requiredCorpus = computeRequiredCorpusHint(result);

  const commonInputs: TraceInput[] = [
    { label: 'Current age', value: String(inputs.currentAge) },
    { label: 'Retirement age', value: String(inputs.retirementAge) },
    { label: 'Life expectancy', value: String(inputs.lifeExpectancy) },
    { label: 'Monthly SIP', value: `${formatCompactINR(inputs.sip.amount)}/mo (step-up ${inputs.sip.stepUp}%)` },
    { label: 'Monthly spend today', value: `${formatCompactINR(inputs.swp.monthlyNeedToday)}/mo` },
    { label: 'Net worth today', value: formatCompactINR(result.netWorth) },
  ];

  const base: Omit<MetricTrace, 'metricId' | 'title' | 'definition' | 'value' | 'inputsUsed' | 'method'> = {
    assumptions: assumptionTraces(assumptions, inputs.inflation),
    metadata: result.metadata ?? null,
    computedAt: result.metadata?.calculatedAt ?? new Date().toISOString(),
  };

  switch (metricId) {
    case 'probability':
      return {
        ...base,
        metricId,
        title: `Why is this ${probabilityPct}%?`,
        definition:
          'Probability that the plan sustains withdrawals through life expectancy across stochastic market paths (Monte Carlo).',
        value: `${probabilityPct}%`,
        inputsUsed: commonInputs,
        method: [
          `${mc?.successRate !== undefined ? result.metadata?.simulationCount ?? '—' : '—'} simulated market paths with correlated asset-class returns (Cholesky).`,
          'Each path compounds assets, applies SIP inflows, STP transfers, goal withdrawals and taxed SWP outflows year by year.',
          `A path "succeeds" if the corpus never depletes before age ${inputs.lifeExpectancy} and essential goals are met.`,
          `Success probability = successful paths ÷ total paths.`,
        ],
      };
    case 'projectedCorpus':
      return {
        ...base,
        metricId,
        title: 'Why is the projected corpus this amount?',
        definition: 'Deterministic median terminal portfolio value at life expectancy under the active return assumptions.',
        value: formatCompactINR(result.terminalValue),
        inputsUsed: commonInputs,
        method: [
          'Project each asset forward at its category return, adding SIP/STP inflows during accumulation.',
          'From retirement age, deduct the inflation-indexed SWP and one-off goal costs; apply tax on withdrawals.',
          'Terminal value = remaining portfolio at the final projected year.',
        ],
      };
    case 'requiredCorpus':
      return {
        ...base,
        metricId,
        title: 'Why is the required corpus this amount?',
        definition: 'The conservative funding bar: the 25th-percentile Monte Carlo outcome used as the required corpus proxy.',
        value: formatCompactINR(requiredCorpus),
        inputsUsed: commonInputs,
        method: [
          'The 25th percentile (P25) of simulated terminal outcomes is used as the funding threshold.',
          'Funding ratio = projected corpus ÷ required corpus.',
          'A ratio below 100% means even the median path does not clear the conservative bar.',
        ],
      };
    case 'depletionAge':
      return {
        ...base,
        metricId,
        title: 'Why does the corpus deplete at this age?',
        definition: 'First age at which the deterministic projection runs out of money (null when the plan is sustainable).',
        value: result.depletionAge === null ? `Sustained to ${inputs.lifeExpectancy}` : `Age ${result.depletionAge}`,
        inputsUsed: commonInputs,
        method: [
          'Withdrawals = inflation-indexed monthly need grossed up for the post-retirement tax rate.',
          `Real post-retirement return = (1 + ${inputs.swp.postRetirementReturn}%) ÷ (1 + inflation) − 1.`,
          'Corpus depletes when cumulative withdrawals exceed corpus plus investment growth.',
        ],
      };
    case 'monthlySurplus':
      return {
        ...base,
        metricId,
        title: 'Why is the monthly surplus this amount?',
        definition: 'Annual income minus annual expenses (SWP monthly need × 12), divided by 12.',
        value: `${formatCompactINR((result.annualIncome - result.annualExpenses) / 12)}/mo`,
        inputsUsed: [
          { label: 'Annual income', value: formatCompactINR(inputs.annualIncome) },
          { label: 'Monthly spend today', value: formatCompactINR(inputs.swp.monthlyNeedToday) },
          { label: 'Annual expenses', value: formatCompactINR(result.annualExpenses) },
        ],
        method: ['Surplus = annual income − (monthly need × 12).', 'The savings rate = surplus ÷ annual income.'],
      };
    case 'netWorth':
      return {
        ...base,
        metricId,
        title: 'Why is net worth this amount?',
        definition: 'Sum of all entered asset values, converted to INR at the configured FX assumptions.',
        value: formatCompactINR(result.netWorth),
        inputsUsed: inputs.assets.map((a) => ({
          label: a.name,
          value: `${formatCompactINR(a.value)}${a.currency !== 'INR' ? ` (${a.currency})` : ''}`,
        })),
        method: [
          'Each asset is taken at its entered value.',
          'Non-INR assets are converted at the configured FX assumption (default 1 USD = ₹83).',
        ],
      };
    case 'savingsRate':
      return {
        ...base,
        metricId,
        title: 'Why is the savings rate this amount?',
        definition: 'Share of annual income that remains after annual expenses — the capital available to invest.',
        value: formatPercent(result.savingsRate * 100, 1),
        inputsUsed: [
          { label: 'Annual income', value: formatCompactINR(inputs.annualIncome) },
          { label: 'Annual expenses', value: formatCompactINR(result.annualExpenses) },
        ],
        method: ['Savings rate = (income − expenses) ÷ income.'],
      };
    case 'planHealth':
      return {
        ...base,
        metricId,
        title: 'Why is the plan health this score?',
        definition: 'Weighted composite (0–100) of retirement readiness, goal funding, liquidity, risk alignment, allocation, debt and tax components.',
        value: 'See factor breakdown',
        inputsUsed: [
          { label: 'Monte Carlo success rate', value: formatPercent(probabilityPct, 0) },
          { label: 'Goals tracked', value: String(inputs.goals.length) },
          { label: 'Asset categories held', value: String(new Set(inputs.assets.map((a) => a.category)).size) },
        ],
        method: [
          'Each component is scored 0–100 from its own drivers.',
          'Overall = Σ(component score × weight) ÷ Σ(weights).',
          'Score below 70 or two+ attention items flags NEEDS ATTENTION.',
        ],
      };
    case 'monthlySIP':
      return {
        ...base,
        metricId,
        title: 'Why is the SIP this amount?',
        definition: 'The systematic monthly investment currently feeding the accumulation phase of the plan.',
        value: `${formatCompactINR(inputs.sip.amount)}/mo`,
        inputsUsed: [
          { label: 'SIP amount', value: `${formatCompactINR(inputs.sip.amount)}/mo` },
          { label: 'Equity / debt split', value: `${inputs.sip.equitySplit}% / ${inputs.sip.debtSplit}%` },
          { label: 'Annual step-up', value: `${inputs.sip.stepUp}%` },
        ],
        method: [
          'SIP inflows are split equity/debt each month and compounded at the respective category returns.',
          `Step-up of ${inputs.sip.stepUp}% raises the instalment every year.`,
        ],
      };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Goal-conflict resolution options (§77) — every suggestion carries a
// computed impact.
// ─────────────────────────────────────────────────────────────────────────────

export interface ResolutionOption {
  id: string;
  title: string;
  impact: string;
  detail: string;
  /** Mutator hint for the caller: which plan input this touches. */
  inputKey: 'sip.amount' | 'goals' | 'swp.monthlyNeedToday';
  inputDelta: number;
}

/** FV of a level monthly SIP at annualReturn for years (monthly compounding). */
export function sipFutureValue(monthlySip: number, annualReturnPct: number, years: number): number {
  if (monthlySip <= 0 || years <= 0) return 0;
  const r = annualReturnPct / 100 / 12;
  const months = Math.round(years * 12);
  if (r === 0) return monthlySip * months;
  return monthlySip * ((Math.pow(1 + r, months) - 1) / r);
}

/** Monthly SIP needed to accumulate targetFv in years at annualReturnPct. */
export function requiredSipForTarget(targetFv: number, annualReturnPct: number, years: number): number {
  if (targetFv <= 0 || years <= 0) return 0;
  const r = annualReturnPct / 100 / 12;
  const months = Math.round(years * 12);
  const factor = r === 0 ? months : (Math.pow(1 + r, months) - 1) / r;
  return factor > 0 ? Math.ceil(targetFv / factor) : 0;
}

export interface GoalConflictSummary {
  deficit: number;
  worstGoalName: string;
  worstGoalShortfall: number;
  worstGoalYearsAway: number;
  retirementDemand: number;
}

export function summarizeGoalConflict(evaluated: {
  fundedStatus: string;
  shortfall: number;
  name: string;
  yearsAway: number;
}[]): GoalConflictSummary | null {
  const underfunded = evaluated.filter((g) => g.fundedStatus !== 'Fully Funded');
  if (underfunded.length === 0) return null;
  let totalShortfall = 0;
  let worst = underfunded[0];
  evaluated.forEach((g) => {
    totalShortfall += Math.max(0, g.shortfall);
    if (g.shortfall > worst.shortfall) worst = g;
  });
  return {
    deficit: totalShortfall,
    worstGoalName: worst.name,
    worstGoalShortfall: worst.shortfall,
    worstGoalYearsAway: worst.yearsAway,
    retirementDemand: 0,
  };
}

/**
 * Compute the three canonical resolution levers for a funding deficit
 * (§77): increase SIP, move the goal date, or trim retirement lifestyle.
 */
export function computeResolutionOptions(
  conflict: GoalConflictSummary,
  inputs: MasterPlanInputs,
): ResolutionOption[] {
  const options: ResolutionOption[] = [];
  if (conflict.deficit <= 0) return options;
  const blendedReturn = blendedPortfolioReturn(inputs);
  const years = Math.max(1, conflict.worstGoalYearsAway);

  // Lever 1 — increase SIP so future value covers the deficit.
  const extraSip = requiredSipForTarget(conflict.deficit, blendedReturn * 100, years);
  options.push({
    id: 'increase-sip',
    title: 'Increase SIP',
    impact: `+${formatCompactINR(Math.max(0, extraSip))} / month`,
    detail: `A higher monthly SIP for ${years} year${years === 1 ? '' : 's'} at ${formatPercent(blendedReturn * 100, 1)} blended return funds the ${formatCompactINR(conflict.deficit)} gap.`,
    inputKey: 'sip.amount',
    inputDelta: extraSip,
  });

  // Lever 2 — delay the goal until the current SIP alone can fund it.
  const annualSipFv = sipFutureValue(inputs.sip.amount, blendedReturn * 100, 1);
  const yearsNeeded = annualSipFv > 0 ? Math.ceil(conflict.deficit / annualSipFv) : years;
  const shift = Math.max(1, yearsNeeded);
  options.push({
    id: 'move-goal',
    title: `Move ${conflict.worstGoalName} date`,
    impact: `+${shift} year${shift === 1 ? '' : 's'}`,
    detail: `Keeping the SIP unchanged, the goal becomes fully funded if its date moves from ${new Date().getFullYear() + years} to ${new Date().getFullYear() + years + shift}.`,
    inputKey: 'goals',
    inputDelta: shift,
  });

  // Lever 3 — trim retirement lifestyle spending proportionally.
  const monthlyNeed = inputs.swp.monthlyNeedToday;
  if (monthlyNeed > 0) {
    const retirementDemand = conflict.retirementDemand;
    const proportion = retirementDemand > 0 ? Math.min(0.3, conflict.deficit / retirementDemand) : 0.1;
    const trimmed = Math.round(monthlyNeed * (1 - proportion));
    options.push({
      id: 'trim-lifestyle',
      title: 'Reduce retirement lifestyle',
      impact: `-${Math.round(proportion * 100)}%`,
      detail: `Cutting the monthly retirement draw from ${formatCompactINR(monthlyNeed)} to ${formatCompactINR(trimmed)} frees the required capital over the distribution phase.`,
      inputKey: 'swp.monthlyNeedToday',
      inputDelta: trimmed - monthlyNeed,
    });
  }
  return options;
}

export function blendedPortfolioReturn(inputs: MasterPlanInputs): number {
  const total = inputs.assets.reduce((s, a) => s + Math.max(0, a.value), 0);
  if (total <= 0) return 0.10;
  const weighted = inputs.assets.reduce((s, a) => s + Math.max(0, a.value) * (a.returnRate / 100), 0);
  return weighted / total;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input validation (§185 domain constraints + §186 extreme-input guards)
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export function validatePlanInputs(inputs: MasterPlanInputs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const push = (field: string, message: string, severity: 'error' | 'warning' = 'error') =>
    issues.push({ field, message, severity });

  if (inputs.currentAge < 18 || inputs.currentAge > 100) {
    push('currentAge', `Age must be between 18 and 100 (currently ${inputs.currentAge}).`);
  }
  if (inputs.retirementAge <= inputs.currentAge) {
    push('retirementAge', `Retirement age (${inputs.retirementAge}) must be after current age (${inputs.currentAge}).`);
  } else if (inputs.retirementAge > 100) {
    push('retirementAge', `Retirement age must be 100 or below (currently ${inputs.retirementAge}).`);
  }
  if (inputs.retirementAge - inputs.currentAge > 45) {
    push('retirementAge', 'Retirement is more than 45 years away — check the intended horizon.', 'warning');
  }
  if (inputs.lifeExpectancy <= inputs.retirementAge || inputs.lifeExpectancy > 110) {
    push('lifeExpectancy', `Life expectancy (${inputs.lifeExpectancy}) must be above retirement age and at most 110.`);
  }
  if (inputs.inflation < 0 || inputs.inflation > 50) {
    push('inflation', `Inflation must be between 0% and 50% (currently ${inputs.inflation}%).`);
  }
  if (inputs.annualIncome < 0) push('annualIncome', 'Income cannot be negative.');
  if (inputs.annualIncome === 0) {
    push('annualIncome', 'Income is zero — the plan assumes no further inflows; confirm this is intentional.', 'warning');
  }
  if (inputs.swp.monthlyNeedToday < 0) push('swp.monthlyNeedToday', 'Monthly spend cannot be negative.');
  if (inputs.sip.amount < 0) push('sip.amount', 'SIP amount cannot be negative.');
  if (inputs.sip.equitySplit + inputs.sip.debtSplit !== 100) {
    push('sip.equitySplit', `SIP equity (${inputs.sip.equitySplit}%) + debt (${inputs.sip.debtSplit}%) must total 100%.`);
  }
  inputs.assets.forEach((a) => {
    if (a.value < 0) push(`asset:${a.id}`, `${a.name}: value cannot be negative.`);
    if (a.returnRate < -100 || a.returnRate > 100) {
      push(`asset:${a.id}`, `${a.name}: return assumption must be between -100% and 100%.`);
    }
  });
  inputs.goals.forEach((g) => {
    if (g.targetAmount <= 0) push(`goal:${g.id}`, `${g.name}: target amount must be greater than zero.`);
    if (g.yearsToGoal <= 0) push(`goal:${g.id}`, `${g.name}: years to goal must be positive.`);
    if (g.inflation < 0 || g.inflation > 50) push(`goal:${g.id}`, `${g.name}: inflation must be 0–50%.`);
  });
  return issues;
}

/** Guard a numeric input against NaN/Infinity before writing to state (§186). */
export function sanitizeNumber(raw: number, fallback = 0): number {
  return Number.isFinite(raw) ? raw : fallback;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario staleness (§23) + sensitivity table (reverse planning)
// ─────────────────────────────────────────────────────────────────────────────

export function isScenarioStale(
  scenarioAssumptionVersion: string | null | undefined,
  currentAssumptionVersion: string | null | undefined,
): boolean {
  if (!scenarioAssumptionVersion || !currentAssumptionVersion) return false;
  return scenarioAssumptionVersion !== currentAssumptionVersion;
}

export interface SensitivityCell {
  requiredMonthlySip: number;
  feasible: boolean;
}

/**
 * Reverse-planning sensitivity grid: required monthly SIP across expected
 * annual returns × accumulation horizons for a target corpus from a starting
 * corpus (reverse planning UX, §84/§reverse).
 */
export function buildSensitivityTable(
  targetCorpus: number,
  currentCorpus: number,
  returnRatesPct: number[],
  horizonsYears: number[],
): { rates: number[]; horizons: number[]; cells: SensitivityCell[][] } {
  const cells = returnRatesPct.map((rate) =>
    horizonsYears.map((years) => {
      const fvCorpus = currentCorpus * Math.pow(1 + rate / 100, years);
      const gap = Math.max(0, targetCorpus - fvCorpus);
      const required = requiredSipForTarget(gap, rate, years);
      return { requiredMonthlySip: required, feasible: required > 0 || fvCorpus >= targetCorpus };
    }),
  );
  return { rates: returnRatesPct, horizons: horizonsYears, cells };
}

/** Format the trace timestamp for display. */
export function traceTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${formatDate(date)} · ${date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Sum of asset values per category (for allocation drift views). */
export function categoryValues(inputs: MasterPlanInputs): Record<AssetCategory, number> {
  const sums: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
  inputs.assets.forEach((a) => {
    sums[a.category] += Math.max(0, a.value);
  });
  return sums;
}
