import type { AssetCategory, MonteCarloConfig, MonteCarloRun, MonteCarloOutcome, MonteCarloYearlyPercentile } from '../types';
import { mean } from './returns';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

function cholesky(matrix: number[][]): number[][] {
  const n = matrix.length;
  const L: number[][] = Array.from({ length: n }, () => new Array(n).fill(0) as number[]);

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= i; j++) {
      let sum = 0;
      for (let k = 0; k < j; k++) {
        sum += L[i][k] * L[j][k];
      }
      if (i === j) {
        const val = matrix[i][i] - sum;
        L[i][j] = val > 0 ? Math.sqrt(val) : 0;
      } else {
        L[i][j] = L[j][j] > 0 ? (matrix[i][j] - sum) / L[j][j] : 0;
      }
    }
  }
  return L;
}

function boxMuller(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

function generateCorrelatedReturns(L: number[][], means: number[]): number[] {
  const n = L.length;
  const z = Array.from({ length: n }, () => boxMuller());
  const correlated = L.map((row) => row.reduce((sum, l, k) => sum + l * z[k], 0));
  return correlated.map((r, i) => means[i] + r);
}

export interface RetirementSimParams {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  initialValues: Record<AssetCategory, number>;
  weights: Record<AssetCategory, number>;
  monthlySIP: number;
  sipStepUp: number;
  monthlyNeedAtRetirement: number;
  inflation: number;
  taxRate: number;
  simulations: number;
  means: Record<AssetCategory, number>;
  covariance: Record<AssetCategory, Record<AssetCategory, number>>;
}

function buildArrays<T>(record: Record<AssetCategory, T>): T[] {
  return CATEGORIES.map((c) => record[c]);
}

function recordFromArrays<T>(arr: T[]): Record<AssetCategory, T> {
  return Object.fromEntries(CATEGORIES.map((c, i) => [c, arr[i]])) as Record<AssetCategory, T>;
}

function normalizeWeights(weights: Record<AssetCategory, number>): Record<AssetCategory, number> {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) {
    return { equity: 0.6, debt: 0.3, gold: 0.05, realestate: 0, liquid: 0.05, other: 0 };
  }
  return recordFromArrays(buildArrays(weights).map((w) => w / total));
}

export function runRetirementMonteCarlo(params: RetirementSimParams): MonteCarloRun {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    initialValues,
    weights,
    monthlySIP,
    sipStepUp,
    monthlyNeedAtRetirement,
    inflation,
    taxRate,
    simulations,
    means,
    covariance,
  } = params;

  const accYears = Math.max(0, retirementAge - currentAge);
  const distYears = Math.max(0, lifeExpectancy - retirementAge);
  const inflFactor = 1 + inflation / 100;
  const taxFactor = 1 - taxRate / 100;
  const normWeights = normalizeWeights(weights);

  const meanArr = buildArrays(means);
  const stdArr = CATEGORIES.map((c) => Math.sqrt(covariance[c][c]));
  const covArr = CATEGORIES.map((i) => CATEGORIES.map((j) => covariance[i][j]));
  const L = cholesky(covArr);

  const yearlyPaths: number[][][] = []; // [simulation][year][category]
  const outcomes: MonteCarloOutcome[] = [];

  for (let sim = 0; sim < simulations; sim++) {
    let values = buildArrays(initialValues);
    let monthlyContribution = monthlySIP;
    const path: number[][] = [];

    // Accumulation phase
    for (let y = 1; y <= accYears; y++) {
      const returns = generateCorrelatedReturns(L, meanArr);
      const annualContribution = monthlyContribution * 12;
      const weightedReturn = CATEGORIES.reduce((sum, _, i) => sum + normWeights[CATEGORIES[i]] * returns[i], 0);

      const total = values.reduce((a, b) => a + b, 0) + annualContribution;
      const newTotal = total * (1 + weightedReturn);
      values = buildArrays(normWeights).map((w) => newTotal * w);

      path.push([...values]);
      monthlyContribution *= (1 + sipStepUp / 100);
    }

    // Distribution phase
    let monthlyNeed = monthlyNeedAtRetirement;
    let depletionAge: number | null = null;
    const terminalTotal = values.reduce((a, b) => a + b, 0);
    let corpus = terminalTotal;

    for (let y = 1; y <= distYears; y++) {
      const returns = generateCorrelatedReturns(L, meanArr);
      const grossAnnualNeed = (monthlyNeed * 12) / taxFactor;
      corpus -= grossAnnualNeed;

      if (corpus <= 0) {
        corpus = 0;
        if (depletionAge === null) depletionAge = retirementAge + y - 1;
      }

      const weightedReturn = CATEGORIES.reduce((sum, _, i) => sum + normWeights[CATEGORIES[i]] * returns[i], 0);
      corpus = corpus * (1 + weightedReturn);
      values = buildArrays(normWeights).map((w) => corpus * w);
      path.push([...values]);
      monthlyNeed *= inflFactor;
    }

    const finalTotal = path[path.length - 1]?.reduce((a, b) => a + b, 0) || 0;
    const sustainable = depletionAge === null || (depletionAge !== null && depletionAge > lifeExpectancy);

    outcomes.push({
      terminalCorpus: finalTotal,
      depletionAge,
      sustainable,
      finalMonthlyNeed: monthlyNeed,
    });

    yearlyPaths.push(path);
  }

  // Build yearly percentiles
  const totalYears = accYears + distYears;
  const yearlyPercentiles: MonteCarloYearlyPercentile[] = [];

  for (let y = 0; y < totalYears; y++) {
    const totals = yearlyPaths.map((path) => path[y]?.reduce((a, b) => a + b, 0) || 0).sort((a, b) => a - b);
    yearlyPercentiles.push({
      year: y + 1,
      age: currentAge + y + 1,
      p5: percentile(totals, 0.05),
      p25: percentile(totals, 0.25),
      p50: percentile(totals, 0.5),
      p75: percentile(totals, 0.75),
      p95: percentile(totals, 0.95),
    });
  }

  const terminalCorpusValues = outcomes.map((o) => o.terminalCorpus).sort((a, b) => a - b);
  const successRate = outcomes.filter((o) => o.sustainable).length / outcomes.length;
  const depletionAges = outcomes.map((o) => o.depletionAge).filter((a): a is number => a !== null);

  return {
    config: {
      simulations,
      equityReturnMean: means.equity,
      equityReturnStd: stdArr[CATEGORIES.indexOf('equity')],
      debtReturnMean: means.debt,
      debtReturnStd: stdArr[CATEGORIES.indexOf('debt')],
      goldReturnMean: means.gold,
      goldReturnStd: stdArr[CATEGORIES.indexOf('gold')],
      realEstateReturnMean: means.realestate,
      realEstateReturnStd: stdArr[CATEGORIES.indexOf('realestate')],
      liquidReturnMean: means.liquid,
      liquidReturnStd: stdArr[CATEGORIES.indexOf('liquid')],
      postRetirementReturnMean: means.equity * normWeights.equity + means.debt * normWeights.debt,
      postRetirementReturnStd: 0,
    } as MonteCarloConfig,
    successRate,
    medianTerminalCorpus: percentile(terminalCorpusValues, 0.5),
    meanTerminalCorpus: mean(terminalCorpusValues),
    percentile5: percentile(terminalCorpusValues, 0.05),
    percentile25: percentile(terminalCorpusValues, 0.25),
    percentile75: percentile(terminalCorpusValues, 0.75),
    percentile95: percentile(terminalCorpusValues, 0.95),
    medianDepletionAge: depletionAges.length > 0 ? median(depletionAges) : null,
    outcomes,
    yearlyPercentiles,
  };
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}
