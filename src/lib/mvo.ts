export interface Portfolio {
  weights: number[];
  expectedReturn: number; // annualized decimal
  volatility: number; // annualized decimal
  sharpe: number;
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
  return Math.sqrt(dot(weights, matVec(covariance, weights)));
}

function generateRandomWeights(n: number): number[] {
  const raw = Array.from({ length: n }, () => Math.random());
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => v / sum);
}

function evaluatePortfolio(weights: number[], means: number[], covariance: number[][], riskFreeRate = 0.06): Portfolio {
  const expectedReturn = portfolioReturn(weights, means);
  const volatility = portfolioVolatility(weights, covariance);
  const sharpe = volatility > 0 ? (expectedReturn - riskFreeRate) / volatility : 0;
  return { weights: [...weights], expectedReturn, volatility, sharpe };
}

function findMaxSharpe(samples: Portfolio[]): Portfolio {
  return samples.reduce((best, p) => (p.sharpe > best.sharpe ? p : best), samples[0]);
}

function findMinVariance(samples: Portfolio[]): Portfolio {
  return samples.reduce((best, p) => (p.volatility < best.volatility ? p : best), samples[0]);
}

/**
 * Approximate the efficient frontier by generating many long-only random portfolios
 * and keeping the lowest-volatility portfolio within each return bucket.
 */
function buildFrontier(samples: Portfolio[], buckets = 40): Portfolio[] {
  if (samples.length === 0) return [];
  const returns = samples.map((p) => p.expectedReturn);
  const minR = Math.min(...returns);
  const maxR = Math.max(...returns);
  if (maxR <= minR) return [samples[0]];

  const bucketSize = (maxR - minR) / buckets;
  const bucketsMap = new Map<number, Portfolio>();

  for (const p of samples) {
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

export function runMVO(
  symbols: string[],
  means: number[],
  covariance: number[][],
  options: { samples?: number; riskFreeRate?: number } = {},
): MVOResult {
  const { samples = 8000, riskFreeRate = 0.06 } = options;
  const n = symbols.length;

  const samplePortfolios: Portfolio[] = [];
  for (let i = 0; i < samples; i++) {
    const w = generateRandomWeights(n);
    samplePortfolios.push(evaluatePortfolio(w, means, covariance, riskFreeRate));
  }

  const stdDevs = means.map((_, i) => Math.sqrt(covariance[i][i]));
  const equalWeights = Array.from({ length: n }, () => 1 / n);
  const riskParityWeights = inverseVolatilityWeights(stdDevs);

  return {
    symbols,
    means,
    covariance,
    frontier: buildFrontier(samplePortfolios),
    maxSharpe: findMaxSharpe(samplePortfolios),
    minVariance: findMinVariance(samplePortfolios),
    equalWeight: evaluatePortfolio(equalWeights, means, covariance, riskFreeRate),
    riskParity: evaluatePortfolio(riskParityWeights, means, covariance, riskFreeRate),
  };
}

export function formatWeight(weight: number): string {
  return `${(weight * 100).toFixed(1)}%`;
}
