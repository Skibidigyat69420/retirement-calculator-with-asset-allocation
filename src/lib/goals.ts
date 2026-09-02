import type { Goal, GoalProbabilityBin, AssetCategory } from '../types';
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

function generateCorrelatedReturns(
  L: number[][],
  means: number[],
  randomSource: () => number = Math.random,
): number[] {
  const boxMuller = createBoxMuller(randomSource);
  const z = means.map(() => boxMuller());
  return L.map((row, i) => means[i] + row.reduce((sum, l, k) => sum + l * z[k], 0));
}

export function calculateGoalPV(goal: Goal, discountRate: number): number {
  const futureValue = goal.targetAmount * Math.pow(1 + goal.inflation / 100, goal.yearsToGoal);
  const rate = discountRate / 100;
  return futureValue / Math.pow(1 + rate, goal.yearsToGoal);
}

export function requiredMonthlySIPForGoal(
  targetAmount: number,
  years: number,
  annualReturn: number,
): number {
  const r = (annualReturn / 100) / 12;
  const n = years * 12;
  if (r === 0) return targetAmount / n;
  return (targetAmount * r) / (Math.pow(1 + r, n) - 1);
}

export interface GoalSimulationResult {
  goal: Goal;
  futureValue: number;
  pvNeeded: number;
  successRate: number;
  requiredSIP: number;
  probabilityDistribution: GoalProbabilityBin[];
  outcomes: number[];
}

export function simulateGoal(
  goal: Goal,
  assumptions: AssumptionSet,
  currentPortfolioValue: number,
  monthlySIP: number,
  portfolioWeights: Record<AssetCategory, number>,
  simulations = 2000,
  seed?: string | number | null,
): GoalSimulationResult {
  const futureValue = goal.targetAmount * Math.pow(1 + goal.inflation / 100, goal.yearsToGoal);

  const seeded = createSeededRandom(seed);
  const randomSource = seeded ? seeded.random : Math.random;

  const means = CATEGORIES.map((c) => assumptions.categories[c].mean);
  const covMatrix = CATEGORIES.map((i) => CATEGORIES.map((j) => assumptions.covariance[i][j]));
  const L = choleskyL(covMatrix);

  const weightArr = CATEGORIES.map((c) => portfolioWeights[c] || 0);
  const totalWeight = weightArr.reduce((a, b) => a + b, 0);
  const normalizedWeights = totalWeight > 0 ? weightArr.map((w) => w / totalWeight) : weightArr.map(() => 1 / CATEGORIES.length);

  const portfolioMean = normalizedWeights.reduce((sum, w, i) => sum + w * means[i], 0);

  const outcomes: number[] = [];
  for (let s = 0; s < simulations; s++) {
    let corpus = currentPortfolioValue;
    for (let y = 0; y < goal.yearsToGoal; y++) {
      const returns = generateCorrelatedReturns(L, means, randomSource);
      const weightedReturn = normalizedWeights.reduce((sum, w, i) => sum + w * returns[i], 0);
      corpus = (corpus + monthlySIP * 12) * (1 + weightedReturn);
    }
    outcomes.push(corpus);
  }

  const successCount = outcomes.filter((o) => o >= futureValue).length;
  const successRate = successCount / simulations;

  // Build probability distribution histogram
  const sorted = [...outcomes].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const bins = 20;
  const binWidth = (max - min) / bins || 1;
  const distribution: GoalProbabilityBin[] = [];
  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = outcomes.filter((o) => o >= binStart && o < binEnd).length;
    distribution.push({
      binStart,
      binEnd,
      count,
      probability: count / simulations,
    });
  }

  const requiredSIP = requiredMonthlySIPForGoal(futureValue, goal.yearsToGoal, portfolioMean * 100);

  return {
    goal: { ...goal, futureValue },
    futureValue,
    pvNeeded: calculateGoalPV(goal, portfolioMean * 100),
    successRate,
    requiredSIP,
    probabilityDistribution: distribution,
    outcomes,
  };
}

export function simulateAllGoals(
  goals: Goal[],
  assumptions: AssumptionSet,
  currentPortfolioValue: number,
  monthlySIP: number,
  portfolioWeights: Record<AssetCategory, number>,
  seed?: string | number | null,
): GoalSimulationResult[] {
  return goals.map((goal) => simulateGoal(goal, assumptions, currentPortfolioValue, monthlySIP, portfolioWeights, 2000, seed));
}
