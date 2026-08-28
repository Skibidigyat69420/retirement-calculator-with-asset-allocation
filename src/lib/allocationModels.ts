import type { AssetCategory, AllocationModelResult, BlackLittermanView } from '../types';
import { GLIDE_PATH_PRESETS } from './constants';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const DEFAULT_MEANS: Record<AssetCategory, number> = {
  equity: 0.12,
  debt: 0.07,
  gold: 0.08,
  realestate: 0.06,
  liquid: 0.05,
  other: 0.06,
};

const DEFAULT_SIGMAS: Record<AssetCategory, number> = {
  equity: 0.15,
  debt: 0.05,
  gold: 0.18,
  realestate: 0.12,
  liquid: 0.01,
  other: 0.2,
};

const DEFAULT_CORR: Record<AssetCategory, Record<AssetCategory, number>> = {
  equity: { equity: 1, debt: 0.2, gold: 0.1, realestate: 0.4, liquid: 0.05, other: 0.3 },
  debt: { equity: 0.2, debt: 1, gold: 0.15, realestate: 0.1, liquid: 0.1, other: 0.1 },
  gold: { equity: 0.1, debt: 0.15, gold: 1, realestate: 0.05, liquid: 0, other: 0.05 },
  realestate: { equity: 0.4, debt: 0.1, gold: 0.05, realestate: 1, liquid: 0.05, other: 0.2 },
  liquid: { equity: 0.05, debt: 0.1, gold: 0, realestate: 0.05, liquid: 1, other: 0.05 },
  other: { equity: 0.3, debt: 0.1, gold: 0.05, realestate: 0.2, liquid: 0.05, other: 1 },
};

function buildCovariance(sigmas: Record<AssetCategory, number>, corr: Record<AssetCategory, Record<AssetCategory, number>>): number[][] {
  return CATEGORIES.map((i) =>
    CATEGORIES.map((j) => sigmas[i] * sigmas[j] * corr[i][j]),
  );
}

function normalize(weights: Record<AssetCategory, number>): Record<AssetCategory, number> {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return { equity: 1 / CATEGORIES.length, debt: 1 / CATEGORIES.length, gold: 1 / CATEGORIES.length, realestate: 1 / CATEGORIES.length, liquid: 1 / CATEGORIES.length, other: 1 / CATEGORIES.length };
  return Object.fromEntries(Object.entries(weights).map(([k, v]) => [k, v / total])) as Record<AssetCategory, number>;
}

function portfolioStats(weights: Record<AssetCategory, number>, means: Record<AssetCategory, number>, cov: number[][], riskFree = 0.06) {
  const w = CATEGORIES.map((c) => weights[c]);
  const expReturn = CATEGORIES.reduce((sum, c, i) => sum + w[i] * means[c], 0);
  let variance = 0;
  for (let i = 0; i < CATEGORIES.length; i++) {
    for (let j = 0; j < CATEGORIES.length; j++) {
      variance += w[i] * w[j] * cov[i][j];
    }
  }
  const vol = Math.sqrt(variance);
  const sharpe = vol > 0 ? (expReturn - riskFree) / vol : 0;
  return { expectedReturn: expReturn, volatility: vol, sharpe };
}

function riskContributions(weights: Record<AssetCategory, number>, cov: number[][]): Record<AssetCategory, number> {
  const w = CATEGORIES.map((c) => weights[c]);
  const portfolioVar = w.reduce((sum, wi, i) => sum + wi * w.reduce((s, wj, j) => s + wj * cov[i][j], 0), 0);
  const totalVol = Math.sqrt(portfolioVar);
  const result: Record<string, number> = {};
  CATEGORIES.forEach((c, i) => {
    const marginal = w.reduce((sum, wj, j) => sum + wj * cov[i][j], 0);
    result[c] = totalVol > 0 ? (w[i] * marginal) / totalVol : 0;
  });
  return result as Record<AssetCategory, number>;
}

/**
 * Black-Litterman: reverse-optimize market weights into implied returns,
 * then blend with investor views using confidence-weighted Bayesian updating.
 */
export function blackLitterman(
  marketWeights: Record<AssetCategory, number>,
  views: BlackLittermanView[],
  tau = 0.05,
  riskAversion = 2.5,
): AllocationModelResult {
  const cov = buildCovariance(DEFAULT_SIGMAS, DEFAULT_CORR);
  const pi = CATEGORIES.map((_, i) => riskAversion * cov[i].reduce((sum, cij, j) => sum + cij * marketWeights[CATEGORIES[j]], 0));

  // Build view matrices
  const P: number[][] = views.map((v) => CATEGORIES.map((cat) => (cat === v.asset ? 1 : 0)));
  const Q = views.map((v) => v.return);
  const omega = views.map((v) => Math.pow((1 - v.confidence / 100) * DEFAULT_SIGMAS[v.asset], 2));

  // Posterior returns: (tau*Sigma)^-1 + P' * Omega^-1 * P
  const tauCov = cov.map((row) => row.map((v) => v * tau));
  const invTauCov = invertMatrix(tauCov);

  const Pt = transpose(P);
  const omegaInv = omega.map((o) => 1 / o);
  const middle = Pt.map((row) => row.map((_, j) => row.reduce((sum, val, k) => sum + val * omegaInv[k] * P[k][j], 0)));
  const left = addMatrices(invTauCov, middle);
  const invLeft = invertMatrix(left);

  const rightPi = invTauCov.map((row) => row.reduce((sum, v, j) => sum + v * pi[j], 0));
  const rightQ = Pt.map((row) => row.reduce((sum, val, k) => sum + val * omegaInv[k] * Q[k], 0));
  const right = rightPi.map((v, i) => v + rightQ[i]);
  const blended = invLeft.map((row) => row.reduce((sum, v, j) => sum + v * right[j], 0));

  const blendedMeans: Record<AssetCategory, number> = Object.fromEntries(
    CATEGORIES.map((c, i) => [c, blended[i]]),
  ) as Record<AssetCategory, number>;

  // Optimize weights for max Sharpe using blended returns
  let bestSharpe = -Infinity;
  let bestWeights = { ...marketWeights };
  for (let i = 0; i < 5000; i++) {
    const rand = randomWeights();
    const stats = portfolioStats(rand, blendedMeans, cov);
    if (stats.sharpe > bestSharpe) {
      bestSharpe = stats.sharpe;
      bestWeights = rand;
    }
  }

  const stats = portfolioStats(bestWeights, blendedMeans, cov);
  return {
    model: 'black-litterman',
    weights: normalize(bestWeights),
    expectedReturn: stats.expectedReturn,
    volatility: stats.volatility,
    sharpe: stats.sharpe,
    riskContributions: riskContributions(bestWeights, cov),
  };
}

/**
 * Risk parity: equalize risk contributions across asset classes.
 */
export function riskParityAllocation(): AllocationModelResult {
  const cov = buildCovariance(DEFAULT_SIGMAS, DEFAULT_CORR);
  let weights = normalize({ equity: 0.2, debt: 0.3, gold: 0.1, realestate: 0.1, liquid: 0.2, other: 0.1 });

  // Iterative risk budgeting
  for (let iter = 0; iter < 50; iter++) {
    const rc = riskContributions(weights, cov);
    const target = 1 / CATEGORIES.length;
    const adjustments: Record<AssetCategory, number> = {} as Record<AssetCategory, number>;
    CATEGORIES.forEach((c) => {
      const current = rc[c];
      adjustments[c] = weights[c] * (target / (current || target));
    });
    weights = normalize(adjustments);
  }

  const stats = portfolioStats(weights, DEFAULT_MEANS, cov);
  return {
    model: 'risk-parity',
    weights,
    expectedReturn: stats.expectedReturn,
    volatility: stats.volatility,
    sharpe: stats.sharpe,
    riskContributions: riskContributions(weights, cov),
  };
}

/**
 * Glide path: interpolate equity/debt allocation based on current age.
 */
export function glidePathAllocation(currentAge: number, preset: keyof typeof GLIDE_PATH_PRESETS = 'moderate'): AllocationModelResult {
  const path = GLIDE_PATH_PRESETS[preset];
  let equity = path[0].equity;
  let debt = path[0].debt;

  for (let i = 0; i < path.length - 1; i++) {
    const a = path[i];
    const b = path[i + 1];
    if (currentAge >= a.age && currentAge <= b.age) {
      const t = (currentAge - a.age) / (b.age - a.age);
      equity = a.equity + (b.equity - a.equity) * t;
      debt = a.debt + (b.debt - a.debt) * t;
      break;
    }
    if (currentAge > b.age) {
      equity = b.equity;
      debt = b.debt;
    }
  }

  const weights = normalize({ equity: equity / 100, debt: debt / 100, gold: 0.1, realestate: 0.05, liquid: 0.05, other: 0 });
  const cov = buildCovariance(DEFAULT_SIGMAS, DEFAULT_CORR);
  const stats = portfolioStats(weights, DEFAULT_MEANS, cov);
  return {
    model: 'glide-path',
    weights,
    expectedReturn: stats.expectedReturn,
    volatility: stats.volatility,
    sharpe: stats.sharpe,
    glidePath: path,
  };
}

/**
 * Tactical signals: momentum-based over/underweight relative to strategic benchmark.
 */
export function tacticalAllocation(returns: Record<AssetCategory, number>): AllocationModelResult {
  const cov = buildCovariance(DEFAULT_SIGMAS, DEFAULT_CORR);
  const benchmark = { equity: 0.5, debt: 0.3, gold: 0.1, realestate: 0.05, liquid: 0.05, other: 0 };

  // Rank assets by recent return and tilt
  const ranked = [...CATEGORIES].sort((a, b) => (returns[b] || 0) - (returns[a] || 0));
  const tilts: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
  ranked.forEach((c, i) => {
    tilts[c] = (CATEGORIES.length - i - 1 - CATEGORIES.length / 2) * 0.03;
  });

  const weights = normalize(
    Object.fromEntries(CATEGORIES.map((c) => [c, benchmark[c] + tilts[c]])) as Record<AssetCategory, number>,
  );
  const stats = portfolioStats(weights, DEFAULT_MEANS, cov);
  return {
    model: 'tactical',
    weights,
    expectedReturn: stats.expectedReturn,
    volatility: stats.volatility,
    sharpe: stats.sharpe,
    tacticalSignals: tilts,
  };
}

function randomWeights(): Record<AssetCategory, number> {
  const raw = CATEGORIES.map(() => Math.random());
  const sum = raw.reduce((a, b) => a + b, 0);
  return Object.fromEntries(CATEGORIES.map((c, i) => [c, raw[i] / sum])) as Record<AssetCategory, number>;
}

function transpose(matrix: number[][]): number[][] {
  return matrix[0].map((_, i) => matrix.map((row) => row[i]));
}

function addMatrices(a: number[][], b: number[][]): number[][] {
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

function invertMatrix(matrix: number[][]): number[][] {
  const n = matrix.length;
  const A = matrix.map((row) => [...row]);
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

  for (let i = 0; i < n; i++) {
    let pivot = A[i][i];
    if (Math.abs(pivot) < 1e-10) {
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > Math.abs(pivot)) {
          [A[i], A[k]] = [A[k], A[i]];
          [I[i], I[k]] = [I[k], I[i]];
          pivot = A[i][i];
          break;
        }
      }
    }

    for (let j = 0; j < n; j++) {
      A[i][j] /= pivot;
      I[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = 0; j < n; j++) {
          A[k][j] -= factor * A[i][j];
          I[k][j] -= factor * I[i][j];
        }
      }
    }
  }

  return I;
}
