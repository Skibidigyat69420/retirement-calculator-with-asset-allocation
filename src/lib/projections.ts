import type { AssetCategory, Asset, MasterPlanInputs, YearlySnapshot } from '../types';
import type { AssumptionSet } from './assumptions';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

export interface YearlyCategoryProjection {
  year: number;
  age: number;
  equity: number;
  debt: number;
  gold: number;
  realestate: number;
  liquid: number;
  other: number;
  total: number;
  weights: Record<AssetCategory, number>;
  targetWeights: Record<AssetCategory, number>;
  drift: Record<AssetCategory, number>; // actual - target
  newInvestmentNeeded: number;
  rebalancingNeeded: Record<AssetCategory, number>; // positive = buy, negative = sell
  goalConsumption: number;
  phase: 'accumulation' | 'distribution';
}

export interface ProjectionResult {
  years: YearlyCategoryProjection[];
  terminalValue: number;
  terminalWeights: Record<AssetCategory, number>;
  totalContributions: number;
  totalGoalConsumption: number;
  probabilityOfSuccess: number; // against all goals
  shortfallRisk: number;
}

function boxMuller(): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

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

function generateCorrelatedReturns(L: number[][], means: number[]): number[] {
  const z = means.map(() => boxMuller());
  return L.map((row, i) => means[i] + row.reduce((sum, l, k) => sum + l * z[k], 0));
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

interface CategoryFXStats {
  mean: number;
  std: number;
}

function buildCategoryFXStats(assets: Asset[], fxAssumptions: Record<string, { mean: number; std: number }>): Record<AssetCategory, CategoryFXStats> {
  const stats: Record<AssetCategory, CategoryFXStats> = {
    equity: { mean: 0, std: 0 },
    debt: { mean: 0, std: 0 },
    gold: { mean: 0, std: 0 },
    realestate: { mean: 0, std: 0 },
    liquid: { mean: 0, std: 0 },
    other: { mean: 0, std: 0 },
  };

  const byCat: Record<AssetCategory, { total: number; weightedMean: number; weightedVar: number }> = {
    equity: { total: 0, weightedMean: 0, weightedVar: 0 },
    debt: { total: 0, weightedMean: 0, weightedVar: 0 },
    gold: { total: 0, weightedMean: 0, weightedVar: 0 },
    realestate: { total: 0, weightedMean: 0, weightedVar: 0 },
    liquid: { total: 0, weightedMean: 0, weightedVar: 0 },
    other: { total: 0, weightedMean: 0, weightedVar: 0 },
  };

  assets.forEach((a) => {
    const fx = fxAssumptions[a.currency || 'INR'] || { mean: 0, std: 0 };
    const entry = byCat[a.category];
    entry.total += a.value;
    entry.weightedMean += a.value * fx.mean;
    entry.weightedVar += a.value * fx.std * fx.std;
  });

  (Object.keys(byCat) as AssetCategory[]).forEach((cat) => {
    const entry = byCat[cat];
    if (entry.total > 0) {
      stats[cat].mean = entry.weightedMean / entry.total;
      stats[cat].std = Math.sqrt(entry.weightedVar / entry.total);
    }
  });

  return stats;
}

function sampleFXReturn(stats: Record<AssetCategory, CategoryFXStats>): number[] {
  return CATEGORIES.map((cat) => {
    const s = stats[cat];
    if (s.std <= 0) return s.mean;
    return s.mean + s.std * boxMuller();
  });
}

export function getTargetGlideAllocation(age: number, retirementAge: number): Record<AssetCategory, number> {
  // Aggressive glide path: equity tapers from ~75% at young age to 40% at retirement, then 30%
  const yearsToRetirement = Math.max(0, retirementAge - age);
  const baseEquity = yearsToRetirement > 20 ? 0.75 : yearsToRetirement > 10 ? 0.6 : yearsToRetirement > 5 ? 0.5 : 0.4;
  const equity = Math.max(0.3, baseEquity);
  const debt = 0.9 - equity;
  const gold = 0.05;
  const realEstate = 0.03;
  const liquid = Math.max(0.02, 1 - equity - debt - gold - realEstate);
  const other = Math.max(0, 1 - equity - debt - gold - realEstate - liquid);
  const total = equity + debt + gold + realEstate + liquid + other;
  return {
    equity: equity / total,
    debt: debt / total,
    gold: gold / total,
    realestate: realEstate / total,
    liquid: liquid / total,
    other: other / total,
  };
}

export function projectAssetAllocation(
  inputs: MasterPlanInputs,
  assumptions: AssumptionSet,
  targetWeights?: Record<AssetCategory, number>,
  simulations = 1000,
): ProjectionResult {
  const { currentAge, retirementAge, lifeExpectancy, inflation, assets, sip, stp, swp, goals } = inputs;
  const accYears = Math.max(0, retirementAge - currentAge);
  const distYears = Math.max(0, lifeExpectancy - retirementAge);
  const infl = inflation / 100;

  const means = CATEGORIES.map((c) => assumptions.categories[c].mean);
  const covMatrix = CATEGORIES.map((i) => CATEGORIES.map((j) => assumptions.covariance[i][j]));
  const L = choleskyL(covMatrix);
  const fxStats = buildCategoryFXStats(assets, assumptions.fx);

  const weights = CATEGORIES.map((c) => {
    if (c === 'equity') return sip.equitySplit / 100;
    if (c === 'debt') return sip.debtSplit / 100;
    return 0;
  });
  const totalSipWeight = weights.reduce((a, b) => a + b, 0);
  const sipWeights = totalSipWeight > 0 ? weights.map((w) => w / totalSipWeight) : CATEGORIES.map(() => 1 / CATEGORIES.length);

  let totalContributions = 0;
  let totalGoalConsumption = 0;

  // Track goal future values
  const goalTargets = goals.map((g) => ({
    ...g,
    futureValue: g.targetAmount * Math.pow(1 + g.inflation / 100, g.yearsToGoal),
    dueYear: g.yearsToGoal,
  }));

  const runSimulation = (): { values: Record<AssetCategory, number>; success: boolean; shortfall: number; contributions: number; consumption: number } => {
    let values: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
    assets.forEach((a) => (values[a.category] += a.value));

    let contributions = 0;
    let consumption = 0;
    let monthlySip = sip.amount;
    let stpLiquid = stp.active ? stp.lumpsum : 0;
    let success = true;
    let shortfall = 0;

    for (let y = 1; y <= accYears + distYears; y++) {
      const phase: 'accumulation' | 'distribution' = y <= accYears ? 'accumulation' : 'distribution';

      // Apply annual correlated returns plus FX return for foreign-currency assets
      const returns = generateCorrelatedReturns(L, means);
      const fxReturns = sampleFXReturn(fxStats);
      CATEGORIES.forEach((c, i) => {
        values[c] = values[c] * (1 + returns[i]) * (1 + fxReturns[i]);
      });

      if (phase === 'accumulation') {
        // SIP contributions
        for (let m = 0; m < 12; m++) {
          CATEGORIES.forEach((c, i) => {
            values[c] += monthlySip * sipWeights[i];
          });
          contributions += monthlySip;
        }
        monthlySip = monthlySip * (1 + sip.stepUp / 100);

        // STP deployment
        if (stp.active && stpLiquid > 0) {
          for (let m = 0; m < 12; m++) {
            stpLiquid = stpLiquid * (1 + stp.liquidReturn / 100 / 12);
            const transfer = Math.min(stpLiquid, stp.monthlyTransfer);
            values.equity += transfer * (stp.equitySplit / 100);
            values.debt += transfer * (stp.debtSplit / 100);
            stpLiquid -= transfer;
          }
        }

        // Goal consumption as due
        goalTargets.forEach((g) => {
          if (g.dueYear === y) {
            const total = Object.values(values).reduce((a, b) => a + b, 0);
            if (total >= g.futureValue) {
              // Deduct proportionally
              const ratio = g.futureValue / total;
              CATEGORIES.forEach((c) => (values[c] *= 1 - ratio));
              consumption += g.futureValue;
            } else {
              success = false;
              shortfall += g.futureValue - total;
              CATEGORIES.forEach((c) => (values[c] = 0));
            }
          }
        });
      } else {
        // Distribution: SWP
        const yearsSinceRetirement = y - accYears;
        const monthlyNeed = swp.monthlyNeedToday * Math.pow(1 + infl, accYears + yearsSinceRetirement - 1);
        const grossAnnual = (monthlyNeed * 12) / (1 - swp.taxRate / 100);
        const total = Object.values(values).reduce((a, b) => a + b, 0);
        if (total >= grossAnnual) {
          const ratio = grossAnnual / total;
          CATEGORIES.forEach((c) => (values[c] *= 1 - ratio));
          consumption += grossAnnual;
        } else {
          success = false;
          shortfall += grossAnnual - total;
          CATEGORIES.forEach((c) => (values[c] = 0));
        }
      }
    }

    return { values, success, shortfall, contributions, consumption };
  };

  const simResults = Array.from({ length: simulations }, runSimulation);
  const successCount = simResults.filter((r) => r.success).length;
  const probabilityOfSuccess = successCount / simulations;
  const shortfallRisk = simResults.reduce((sum, r) => sum + r.shortfall, 0) / simulations;

  // Deterministic median projection for yearly display
  const medianRun = simResults.sort((a, b) =>
    Object.values(b.values).reduce((x, y) => x + y, 0) - Object.values(a.values).reduce((x, y) => x + y, 0),
  )[Math.floor(simulations / 2)];

  // Build yearly projection from a single deterministic run using assumptions means
  const yearly: YearlyCategoryProjection[] = [];
  let values: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
  assets.forEach((a) => (values[a.category] += a.value));

  let monthlySip = sip.amount;
  let stpLiquid = stp.active ? stp.lumpsum : 0;

  yearly.push({
    year: 0,
    age: currentAge,
    ...values,
    total: Object.values(values).reduce((a, b) => a + b, 0),
    weights: normalizeWeights(values),
    targetWeights: targetWeights || getTargetGlideAllocation(currentAge, retirementAge),
    drift: zeroWeights(),
    newInvestmentNeeded: 0,
    rebalancingNeeded: zeroWeights(),
    goalConsumption: 0,
    phase: 'accumulation',
  });

  for (let y = 1; y <= accYears + distYears; y++) {
    const phase: 'accumulation' | 'distribution' = y <= accYears ? 'accumulation' : 'distribution';

    // Apply mean returns plus mean FX return for foreign-currency assets
    CATEGORIES.forEach((c, i) => {
      values[c] = values[c] * (1 + means[i]) * (1 + fxStats[c].mean);
    });

    let goalConsumption = 0;
    let newInvestment = 0;

    if (phase === 'accumulation') {
      for (let m = 0; m < 12; m++) {
        CATEGORIES.forEach((c, i) => {
          values[c] += monthlySip * sipWeights[i];
        });
        newInvestment += monthlySip;
        totalContributions += monthlySip;
      }
      monthlySip = monthlySip * (1 + sip.stepUp / 100);

      if (stp.active && stpLiquid > 0) {
        for (let m = 0; m < 12; m++) {
          stpLiquid = stpLiquid * (1 + stp.liquidReturn / 100 / 12);
          const transfer = Math.min(stpLiquid, stp.monthlyTransfer);
          values.equity += transfer * (stp.equitySplit / 100);
          values.debt += transfer * (stp.debtSplit / 100);
          stpLiquid -= transfer;
          newInvestment += transfer;
          totalContributions += transfer;
        }
      }

      goalTargets.forEach((g) => {
        if (g.dueYear === y) {
          const total = Object.values(values).reduce((a, b) => a + b, 0);
          const draw = Math.min(total, g.futureValue);
          const ratio = total > 0 ? draw / total : 0;
          CATEGORIES.forEach((c) => (values[c] *= 1 - ratio));
          goalConsumption = draw;
          totalGoalConsumption += draw;
        }
      });
    } else {
      const yearsSinceRetirement = y - accYears;
      const monthlyNeed = swp.monthlyNeedToday * Math.pow(1 + infl, accYears + yearsSinceRetirement - 1);
      const grossAnnual = (monthlyNeed * 12) / (1 - swp.taxRate / 100);
      const total = Object.values(values).reduce((a, b) => a + b, 0);
      const draw = Math.min(total, grossAnnual);
      const ratio = total > 0 ? draw / total : 0;
      CATEGORIES.forEach((c) => (values[c] *= 1 - ratio));
      goalConsumption = draw;
      totalGoalConsumption += draw;
    }

    const total = Object.values(values).reduce((a, b) => a + b, 0);
    const weights = normalizeWeights(values);
    const tgt = targetWeights || getTargetGlideAllocation(currentAge + y, retirementAge);
    const drift: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
    const rebalance: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
    CATEGORIES.forEach((c) => {
      drift[c] = weights[c] - tgt[c];
      rebalance[c] = total * (tgt[c] - weights[c]);
    });

    yearly.push({
      year: y,
      age: currentAge + y,
      equity: round2(values.equity),
      debt: round2(values.debt),
      gold: round2(values.gold),
      realestate: round2(values.realestate),
      liquid: round2(values.liquid),
      other: round2(values.other),
      total: round2(total),
      weights,
      targetWeights: tgt,
      drift,
      newInvestmentNeeded: round2(newInvestment),
      rebalancingNeeded: rebalance,
      goalConsumption: round2(goalConsumption),
      phase,
    });
  }

  const terminalValue = Object.values(medianRun.values).reduce((a, b) => a + b, 0);

  return {
    years: yearly,
    terminalValue: round2(terminalValue),
    terminalWeights: normalizeWeights(medianRun.values),
    totalContributions: round2(totalContributions),
    totalGoalConsumption: round2(totalGoalConsumption),
    probabilityOfSuccess: round2(probabilityOfSuccess * 100),
    shortfallRisk: round2(shortfallRisk),
  };
}

function normalizeWeights(values: Record<AssetCategory, number>): Record<AssetCategory, number> {
  const total = Object.values(values).reduce((a, b) => a + b, 0);
  if (total <= 0) return { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
  const out: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
  CATEGORIES.forEach((c) => (out[c] = (values[c] || 0) / total));
  return out;
}

function zeroWeights(): Record<AssetCategory, number> {
  return { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
}

export function convertSnapshotsToAllocationProjection(snapshots: YearlySnapshot[]): YearlyCategoryProjection[] {
  return snapshots.map((s) => {
    const values: Record<AssetCategory, number> = {
      equity: s.equity,
      debt: s.debt,
      gold: s.gold,
      realestate: s.realEstate,
      liquid: s.liquid,
      other: s.other,
    };
    const weights = normalizeWeights(values);
    const tgt = getTargetGlideAllocation(s.age, s.age + 1);
    const drift: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
    const rebalance: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
    CATEGORIES.forEach((c) => {
      drift[c] = weights[c] - tgt[c];
      rebalance[c] = s.nominal * (tgt[c] - weights[c]);
    });
    return {
      year: s.year,
      age: s.age,
      ...values,
      total: s.nominal,
      weights,
      targetWeights: tgt,
      drift,
      newInvestmentNeeded: 0,
      rebalancingNeeded: rebalance,
      goalConsumption: s.annualWithdrawal || 0,
      phase: s.phase,
    };
  });
}
