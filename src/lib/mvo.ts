export interface Portfolio {
  weights: number[];
  expectedReturn: number; // annualized decimal
  volatility: number; // annualized decimal
  sharpe: number;
}

export interface ConstraintSet {
  minWeight?: number[]; // per asset
  maxWeight?: number[]; // per asset
  maxEquity?: number; // total equity weight cap (decimal)
  maxVolatility?: number; // optional volatility cap (decimal)
  equityMask?: boolean[]; // true for equity-like assets; used with maxEquity
}

export interface MVOResult {
  symbols: string[];
  means: number[];
  covariance: number[][];
  frontier: Portfolio[];
  maxSharpe: Portfolio;
  minVariance: Portfolio;
  equalWeight: Portfolio;
  riskParity: Portfolio;
  constrainedMaxSharpe?: Portfolio; // max Sharpe within risk-profile constraints
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, v, i) => sum + v * b[i], 0);
}

function matVec(mat: number[][], vec: number[]): number[] {
  return mat.map((row) => dot(row, vec));
}

function portfolioReturn(weights: number[], means: number[]): number {
  return dot(weights, means);
}

function portfolioVolatility(weights: number[], covariance: number[][]): number {
  return Math.sqrt(Math.max(0, dot(weights, matVec(covariance, weights))));
}

function evaluatePortfolio(
  weights: number[],
  means: number[],
  covariance: number[][],
  riskFreeRate = 0.06,
): Portfolio {
  const expectedReturn = portfolioReturn(weights, means);
  const volatility = portfolioVolatility(weights, covariance);
  const sharpe = volatility > 0 ? (expectedReturn - riskFreeRate) / volatility : 0;
  return { weights: [...weights], expectedReturn, volatility, sharpe };
}

function normalizeWeights(w: number[]): number[] {
  const sum = w.reduce((a, b) => a + b, 0);
  if (sum <= 0) return w.map(() => 1 / w.length);
  return w.map((v) => v / sum);
}

function clipWeights(w: number[], minW: number[], maxW: number[]): number[] {
  return w.map((v, i) => Math.max(minW[i], Math.min(maxW[i], v)));
}

function isFeasible(w: number[], constraints: Required<ConstraintSet>): boolean {
  const total = w.reduce((a, b) => a + b, 0);
  if (Math.abs(total - 1) > 1e-6) return false;
  for (let i = 0; i < w.length; i++) {
    if (w[i] < constraints.minWeight[i] - 1e-9 || w[i] > constraints.maxWeight[i] + 1e-9) return false;
  }
  return true;
}

function generateRandomWeights(n: number, minW: number[], maxW: number[]): number[] {
  // Generate a random point in the unit simplex, then project to [minW, maxW] box.
  let w = Array.from({ length: n }, () => Math.random());
  w = normalizeWeights(w);
  // Scale to box then re-normalize repeatedly until feasible.
  for (let iter = 0; iter < 20; iter++) {
    w = clipWeights(w, minW, maxW);
    w = normalizeWeights(w);
    if (isFeasible(w, { minWeight: minW, maxWeight: maxW, maxEquity: 1, maxVolatility: 1, equityMask: Array(n).fill(true) })) break;
  }
  return w;
}

function applyEquityCap(w: number[], equityMask: boolean[], maxEquity: number): number[] {
  if (maxEquity >= 1) return w;
  const equityWeight = w.reduce((sum, v, i) => sum + (equityMask[i] ? v : 0), 0);
  if (equityWeight <= maxEquity + 1e-9) return w;
  const scale = maxEquity / Math.max(equityWeight, 1e-9);
  const out = w.map((v, i) => (equityMask[i] ? v * scale : v));
  const nonEquityExcess = 1 - out.reduce((a, b) => a + b, 0);
  const nonEquityTotal = out.reduce((sum, v, i) => sum + (equityMask[i] ? 0 : v), 0);
  if (nonEquityTotal > 0) {
    return out.map((v, i) => (equityMask[i] ? v : v + (v / nonEquityTotal) * nonEquityExcess));
  }
  return normalizeWeights(out);
}

function buildConstraints(
  n: number,
  constraints: ConstraintSet,
): Required<ConstraintSet> {
  const minWeight = constraints.minWeight ?? Array(n).fill(0);
  const maxWeight = constraints.maxWeight ?? Array(n).fill(1);
  const maxEquity = constraints.maxEquity ?? 1;
  const maxVolatility = constraints.maxVolatility ?? 1;
  const equityMask = constraints.equityMask ?? Array(n).fill(true);
  return { minWeight, maxWeight, maxEquity, maxVolatility, equityMask };
}

function findMaxSharpe(samples: Portfolio[]): Portfolio {
  return samples.reduce((best, p) => (p.sharpe > best.sharpe ? p : best), samples[0]);
}

function findMinVariance(samples: Portfolio[]): Portfolio {
  return samples.reduce((best, p) => (p.volatility < best.volatility ? p : best), samples[0]);
}

/**
 * Refine a portfolio toward the minimum-variance portfolio subject to box constraints.
 */
function refineMinVariance(
  start: Portfolio,
  means: number[],
  covariance: number[][],
  constraints: Required<ConstraintSet>,
  riskFreeRate: number,
): Portfolio {
  let w = [...start.weights];
  const lr = 0.1;
  for (let iter = 0; iter < 200; iter++) {
    const grad = matVec(covariance, w).map((v) => 2 * v);
    const newW = w.map((v, i) => v - lr * grad[i]);
    w = clipWeights(newW, constraints.minWeight, constraints.maxWeight);
    w = normalizeWeights(w);
  }
  return evaluatePortfolio(w, means, covariance, riskFreeRate);
}

/**
 * Refine a portfolio toward the maximum-Sharpe portfolio subject to box constraints.
 */
function refineMaxSharpe(
  start: Portfolio,
  means: number[],
  covariance: number[][],
  constraints: Required<ConstraintSet>,
  riskFreeRate: number,
): Portfolio {
  let w = [...start.weights];
  const lr = 0.05;
  for (let iter = 0; iter < 300; iter++) {
    const vol = portfolioVolatility(w, covariance);
    if (vol <= 0) break;
    const covW = matVec(covariance, w);
    const ret = portfolioReturn(w, means);
    const dRet = means;
    const dVol = covW.map((v) => v / vol);
    const dSharpe = dRet.map((dr, i) => (dr - riskFreeRate) / vol - ((ret - riskFreeRate) / (vol * vol)) * dVol[i]);
    const newW = w.map((v, i) => v + lr * dSharpe[i]);
    w = clipWeights(newW, constraints.minWeight, constraints.maxWeight);
    w = normalizeWeights(w);
  }
  return evaluatePortfolio(w, means, covariance, riskFreeRate);
}

/**
 * Approximate the efficient frontier by generating many long-only random portfolios
 * that satisfy the constraints, keeping the lowest-volatility portfolio within each
 * return bucket. The result is a smooth Markowitz-style frontier.
 */
function buildFrontier(
  samples: Portfolio[],
  buckets = 60,
  maxVolatility = 1,
): Portfolio[] {
  const filtered = samples.filter((p) => p.volatility <= maxVolatility);
  if (filtered.length === 0) return [];

  const returns = filtered.map((p) => p.expectedReturn);
  const minR = Math.min(...returns);
  const maxR = Math.max(...returns);
  if (maxR <= minR) return [filtered[0]];

  const bucketSize = (maxR - minR) / buckets;
  const bucketsMap = new Map<number, Portfolio>();

  for (const p of filtered) {
    const idx = Math.min(Math.floor((p.expectedReturn - minR) / bucketSize), buckets - 1);
    const existing = bucketsMap.get(idx);
    if (!existing || p.volatility < existing.volatility) {
      bucketsMap.set(idx, p);
    }
  }

  return Array.from(bucketsMap.values()).sort((a, b) => a.expectedReturn - b.expectedReturn);
}

function inverseVolatilityWeights(stdDevs: number[]): number[] {
  const inv = stdDevs.map((s) => (s > 0 ? 1 / s : 0));
  const sum = inv.reduce((a, b) => a + b, 0);
  return inv.map((v) => (sum > 0 ? v / sum : 0));
}

/**
 * Run mean-variance optimization and return the efficient frontier plus key portfolios.
 *
 * @param symbols      Asset symbols in order.
 * @param means        Annualized expected returns (decimal).
 * @param covariance   Annualized covariance matrix.
 * @param options      samples, riskFreeRate, constraints.
 */
export function runMVO(
  symbols: string[],
  means: number[],
  covariance: number[][],
  options: { samples?: number; riskFreeRate?: number; constraints?: ConstraintSet } = {},
): MVOResult {
  const { samples = 25000, riskFreeRate = 0.06, constraints = {} } = options;
  const n = symbols.length;

  const stdDevs = means.map((_, i) => Math.sqrt(Math.max(0, covariance[i][i])));
  const equalWeights = Array.from({ length: n }, () => 1 / n);
  const riskParityWeights = inverseVolatilityWeights(stdDevs);

  const constraintSet = buildConstraints(n, constraints);
  const equityMask = constraints.equityMask ?? symbols.map(() => true);


  // Generate constrained random portfolios.
  const samplePortfolios: Portfolio[] = [];
  for (let i = 0; i < samples; i++) {
    let w = generateRandomWeights(n, constraintSet.minWeight, constraintSet.maxWeight);
    if (constraintSet.maxEquity < 1) {
      w = applyEquityCap(w, equityMask, constraintSet.maxEquity);
      w = clipWeights(w, constraintSet.minWeight, constraintSet.maxWeight);
      w = normalizeWeights(w);
    }
    samplePortfolios.push(evaluatePortfolio(w, means, covariance, riskFreeRate));
  }

  if (samplePortfolios.length === 0) {
    return {
      symbols,
      means,
      covariance,
      frontier: [],
      maxSharpe: evaluatePortfolio(equalWeights, means, covariance, riskFreeRate),
      minVariance: evaluatePortfolio(equalWeights, means, covariance, riskFreeRate),
      equalWeight: evaluatePortfolio(equalWeights, means, covariance, riskFreeRate),
      riskParity: evaluatePortfolio(riskParityWeights, means, covariance, riskFreeRate),
    };
  }

  const rawMaxSharpe = findMaxSharpe(samplePortfolios);
  const rawMinVariance = findMinVariance(samplePortfolios);

  const maxSharpe = refineMaxSharpe(rawMaxSharpe, means, covariance, constraintSet, riskFreeRate);
  const minVariance = refineMinVariance(rawMinVariance, means, covariance, constraintSet, riskFreeRate);

  return {
    symbols,
    means,
    covariance,
    frontier: buildFrontier(samplePortfolios, 60, constraintSet.maxVolatility),
    maxSharpe,
    minVariance,
    equalWeight: evaluatePortfolio(equalWeights, means, covariance, riskFreeRate),
    riskParity: evaluatePortfolio(riskParityWeights, means, covariance, riskFreeRate),
  };
}

export function formatWeight(weight: number): string {
  return `${(weight * 100).toFixed(1)}%`;
}
