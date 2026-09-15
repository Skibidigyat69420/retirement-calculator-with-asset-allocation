import type { AssetCategory, Goal, GoalPriority, GoalProbabilityBin } from '../types';
import type { AssumptionSet } from './assumptions';
import { createBoxMuller, createSeededRandom } from './random';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

function choleskyL(cov: number[][]): number[][] {
  const n = cov.length;
  const L: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) sum += L[i][k] * L[j][k];
      if (i === j) {
        const val = cov[i][i] - sum;
        L[i][j] = val > 0 ? Math.sqrt(val) : 0;
      } else {
        L[i][j] = L[j][j] > 0 ? (cov[i][j] - sum) / L[j][j] : 0;
      }
    }
  }
  return L;
}

export interface GoalPlanSimParams {
  goals: Goal[];
  /** Current investable corpus (INR). */
  currentPortfolioValue: number;
  /** Shared monthly SIP funding the goal pool (INR). */
  monthlySIP: number;
  /** Annual SIP step-up, percent. */
  sipStepUp?: number;
  portfolioWeights: Record<AssetCategory, number>;
  assumptions: AssumptionSet;
  simulations?: number;
  seed?: string | number | null;
  /** Confidence target for the required-SIP solve. */
  targetConfidence?: number;
}

export interface GoalYearlyPercentile {
  year: number;
  p5: number;
  p25: number;
  p50: number;
  p75: number;
  p95: number;
}

export interface GoalSimOutcome {
  goalId: string;
  name: string;
  priority: GoalPriority;
  horizonYear: number;
  /** Inflated cost at the horizon, INR. */
  costAtHorizon: number;
  /** Fraction of paths where corpus at horizon covered the cost. */
  successRate: number;
  /** Median corpus in the year of the goal, before deduction. */
  medianCorpusAtHorizon: number;
  /** Mean (cost − corpus) across failing paths; 0 when fully funded. */
  expectedShortfall: number;
  corpusAtHorizon: { p5: number; p25: number; p50: number; p75: number; p95: number };
  histogram: GoalProbabilityBin[];
}

export interface GoalPlanSimResult {
  simulations: number;
  years: number;
  /** Fraction of paths where every goal was funded. */
  planSuccessRate: number;
  fundedGoalCount: number;
  /** Corpus fan after goal deductions, per year. */
  yearlyCorpus: GoalYearlyPercentile[];
  /** Per-goal outcomes, ordered by horizon. */
  goals: GoalSimOutcome[];
  /** Monthly SIP needed for the plan to hit targetConfidence (simulated). */
  requiredSIP: number;
  requiredSIPConfidence: number;
  /** Median-path cumulative goal cost at the final horizon. */
  totalCostAtFinalHorizon: number;
}

interface InternalGoal {
  goal: Goal;
  horizon: number;
  cost: number;
}

function normalizeWeights(weights: Record<AssetCategory, number>): number[] {
  const arr = CATEGORIES.map((c) => weights[c] || 0);
  const total = arr.reduce((a, b) => a + b, 0);
  return total > 0 ? arr.map((w) => w / total) : arr.map(() => 1 / CATEGORIES.length);
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  return sorted[base];
}

interface RunStats {
  planSuccesses: number;
  yearlyTotals: number[][];
  goalCorpus: number[][];
  goalShortfalls: number[][];
}

function runPaths(
  sims: number,
  seed: string | number | null | undefined,
  years: number,
  goalsAtHorizon: Map<number, InternalGoal[]>,
  internalGoals: InternalGoal[],
  startCorpus: number,
  monthlySIP: number,
  sipStepUp: number,
  L: number[][],
  means: number[],
  weightsArr: number[],
): RunStats {
  const seeded = createSeededRandom(seed);
  const randomSource = seeded ? seeded.random : Math.random;

  const yearlyTotals: number[][] = Array.from({ length: years }, () => []);
  const goalCorpus: number[][] = internalGoals.map(() => []);
  const goalShortfalls: number[][] = internalGoals.map(() => []);
  let planSuccesses = 0;

  for (let s = 0; s < sims; s++) {
    const boxMuller = createBoxMuller(randomSource);
    let corpus = startCorpus;
    let annualContribution = monthlySIP * 12;
    let failed = false;

    for (let y = 1; y <= years; y++) {
      const z = CATEGORIES.map(() => boxMuller());
      const returns = L.map((row, i) => means[i] + row.reduce((sum, l, k) => sum + l * z[k], 0));
      const weightedReturn = weightsArr.reduce((sum, w, i) => sum + w * returns[i], 0);
      corpus = (corpus + annualContribution) * (1 + weightedReturn);

      const due = goalsAtHorizon.get(y);
      if (due) {
        for (const g of due) {
          const idx = internalGoals.indexOf(g);
          goalCorpus[idx].push(corpus);
          const shortfall = Math.max(0, g.cost - corpus);
          goalShortfalls[idx].push(shortfall);
          if (shortfall > 0) failed = true;
          corpus -= g.cost;
        }
      }

      yearlyTotals[y - 1].push(corpus);
      annualContribution *= 1 + sipStepUp / 100;
    }

    if (!failed) planSuccesses += 1;
  }

  return { planSuccesses, yearlyTotals, goalCorpus, goalShortfalls };
}

function buildHistogram(values: number[], bins = 20): GoalProbabilityBin[] {
  if (values.length === 0) return [];
  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const binWidth = (max - min) / bins || 1;
  const histogram: GoalProbabilityBin[] = [];
  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = i === bins - 1 ? max + 1e-9 : binStart + binWidth;
    const count = sorted.filter((o) => o >= binStart && o < binEnd).length;
    histogram.push({ binStart, binEnd, count, probability: count / values.length });
  }
  return histogram;
}

function summarizeGoals(
  sims: number,
  internalGoals: InternalGoal[],
  goalCorpus: number[][],
  goalShortfalls: number[][],
): GoalSimOutcome[] {
  return internalGoals.map((g, idx) => {
    const corpusSorted = [...goalCorpus[idx]].sort((a, b) => a - b);
    const shortfalls = goalShortfalls[idx];
    const failures = shortfalls.filter((sf) => sf > 0);
    return {
      goalId: g.goal.id,
      name: g.goal.name,
      priority: g.goal.priority,
      horizonYear: g.horizon,
      costAtHorizon: g.cost,
      successRate: (sims - failures.length) / sims,
      medianCorpusAtHorizon: percentile(corpusSorted, 0.5),
      expectedShortfall: failures.length > 0 ? failures.reduce((a, b) => a + b, 0) / failures.length : 0,
      corpusAtHorizon: {
        p5: percentile(corpusSorted, 0.05),
        p25: percentile(corpusSorted, 0.25),
        p50: percentile(corpusSorted, 0.5),
        p75: percentile(corpusSorted, 0.75),
        p95: percentile(corpusSorted, 0.95),
      },
      histogram: buildHistogram(goalCorpus[idx]),
    };
  });
}

/**
 * Monte Carlo over the shared household corpus with a goal waterfall:
 * goals are deducted at their horizon (nearest first) and a goal counts as
 * funded when the corpus covers its inflated cost in that path. Later goals
 * inherit earlier shortfalls, so the plan success rate is the fraction of
 * paths where the whole waterfall completed without a shortfall.
 */
export function simulateGoalPlan(params: GoalPlanSimParams): GoalPlanSimResult {
  const {
    goals,
    currentPortfolioValue,
    monthlySIP,
    sipStepUp = 0,
    portfolioWeights,
    assumptions,
    simulations = 1000,
    seed = null,
    targetConfidence = 0.8,
  } = params;

  const internalGoals: InternalGoal[] = goals
    .filter((g) => g.yearsToGoal > 0 && g.targetAmount > 0)
    .map((g) => ({
      goal: g,
      horizon: Math.max(1, Math.round(g.yearsToGoal)),
      cost: g.targetAmount * Math.pow(1 + (g.inflation || 0) / 100, g.yearsToGoal),
    }))
    .sort((a, b) => a.horizon - b.horizon);

  const years = internalGoals.reduce((m, g) => Math.max(m, g.horizon), 0);

  if (internalGoals.length === 0 || years === 0 || simulations <= 0) {
    return {
      simulations: Math.max(0, simulations),
      years,
      planSuccessRate: internalGoals.length === 0 ? 1 : 0,
      fundedGoalCount: 0,
      yearlyCorpus: [],
      goals: [],
      requiredSIP: monthlySIP,
      requiredSIPConfidence: targetConfidence,
      totalCostAtFinalHorizon: 0,
    };
  }

  const goalsAtHorizon = new Map<number, InternalGoal[]>();
  for (const g of internalGoals) {
    const list = goalsAtHorizon.get(g.horizon) || [];
    list.push(g);
    goalsAtHorizon.set(g.horizon, list);
  }

  const means = CATEGORIES.map((c) => assumptions.categories[c].mean);
  const cov = CATEGORIES.map((i) => CATEGORIES.map((j) => assumptions.covariance[i][j]));
  const L = choleskyL(cov);
  const weightsArr = normalizeWeights(portfolioWeights);

  const run = runPaths(
    simulations, seed, years, goalsAtHorizon, internalGoals,
    currentPortfolioValue, monthlySIP, sipStepUp, L, means, weightsArr,
  );

  const yearlyCorpus: GoalYearlyPercentile[] = run.yearlyTotals.map((totals, i) => {
    const sorted = [...totals].sort((a, b) => a - b);
    return {
      year: i + 1,
      p5: percentile(sorted, 0.05),
      p25: percentile(sorted, 0.25),
      p50: percentile(sorted, 0.5),
      p75: percentile(sorted, 0.75),
      p95: percentile(sorted, 0.95),
    };
  });

  const goalOutcomes = summarizeGoals(simulations, internalGoals, run.goalCorpus, run.goalShortfalls);

  // Solve the monthly SIP that lifts the plan to the target confidence.
  // Binary search on a SIP scale factor, reusing the same seed family so the
  // comparison is apples-to-apples across iterations.
  let requiredSIP = monthlySIP;
  const planSuccessRate = run.planSuccesses / simulations;
  if (planSuccessRate < targetConfidence && monthlySIP >= 0) {
    const solveSims = Math.min(simulations, 800);
    let lo = 1;
    let hi = Math.max(2, 4);
    const successAt = (scale: number): number => {
      const r = runPaths(
        solveSims, seed == null ? null : `${String(seed)}:sip:${scale.toFixed(4)}`,
        years, goalsAtHorizon, internalGoals,
        currentPortfolioValue, monthlySIP * scale, sipStepUp, L, means, weightsArr,
      );
      return r.planSuccesses / solveSims;
    };
    let guard = 0;
    while (successAt(hi) < targetConfidence && hi < 1024 && guard < 10) {
      hi *= 2;
      guard += 1;
    }
    for (let i = 0; i < 7 && hi - lo > 0.01; i++) {
      const mid = (lo + hi) / 2;
      if (successAt(mid) >= targetConfidence) hi = mid;
      else lo = mid;
    }
    requiredSIP = monthlySIP * hi;
  }

  return {
    simulations,
    years,
    planSuccessRate,
    fundedGoalCount: goalOutcomes.filter((g) => g.successRate >= targetConfidence).length,
    yearlyCorpus,
    goals: goalOutcomes,
    requiredSIP,
    requiredSIPConfidence: targetConfidence,
    totalCostAtFinalHorizon: internalGoals.reduce((sum, g) => sum + g.cost, 0),
  };
}
