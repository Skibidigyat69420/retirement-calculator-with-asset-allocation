import type { AssetCategory, Asset, MasterPlanInputs, YearlySnapshot, AllocationScenario, RebalancingStrategy, GlidePathPoint } from '../types';
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
  return projectAllocationScenario(inputs, assumptions, { targetWeights, simulations });
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

// ---------------------------------------------------------------------------
// Scenario-driven allocation projection
// ---------------------------------------------------------------------------

export interface AllocationProjectOptions {
  targetWeights?: Record<AssetCategory, number>;
  glidePath?: GlidePathPoint[] | null;
  rebalancing?: { strategy: RebalancingStrategy; threshold: number };
  scenarioAssumptions?: AllocationScenario['assumptions'];
  simulations?: number;
}

function buildScenarioAssumptionSet(
  scenarioAssumptions: AllocationScenario['assumptions'],
  baseAssumptions: AssumptionSet,
  fallbackInflation: number,
): { assumptions: AssumptionSet; inflation: number } {
  if (scenarioAssumptions.useMasterPlanAssumptions) {
    return { assumptions: baseAssumptions, inflation: fallbackInflation };
  }

  const categories: AssumptionSet['categories'] = Object.fromEntries(
    CATEGORIES.map((c) => [c, { mean: scenarioAssumptions.categories[c].mean, std: scenarioAssumptions.categories[c].std }]),
  ) as AssumptionSet['categories'];

  const covariance: AssumptionSet['covariance'] = Object.fromEntries(
    CATEGORIES.map((i) => [
      i,
      Object.fromEntries(CATEGORIES.map((j) => [j, scenarioAssumptions.correlation[i][j] * categories[i].std * categories[j].std])) as Record<AssetCategory, number>,
    ]),
  ) as AssumptionSet['covariance'];

  return {
    assumptions: {
      ...baseAssumptions,
      categories,
      covariance,
    },
    inflation: scenarioAssumptions.inflation,
  };
}

function getGlideWeights(age: number, _retirementAge: number, glidePath: GlidePathPoint[] | null | undefined): Record<AssetCategory, number> | null {
  if (!glidePath || glidePath.length === 0) return null;
  const sorted = [...glidePath].sort((a, b) => a.age - b.age);
  if (age <= sorted[0].age) {
    return normalizeWeights({ equity: sorted[0].equity, debt: sorted[0].debt, gold: 0, realestate: 0, liquid: 0, other: 0 });
  }
  if (age >= sorted[sorted.length - 1].age) {
    const last = sorted[sorted.length - 1];
    return normalizeWeights({ equity: last.equity, debt: last.debt, gold: 0, realestate: 0, liquid: 0, other: 0 });
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (age >= a.age && age <= b.age) {
      const t = (age - a.age) / (b.age - a.age || 1);
      const equity = a.equity + (b.equity - a.equity) * t;
      const debt = a.debt + (b.debt - a.debt) * t;
      return normalizeWeights({ equity, debt, gold: 0, realestate: 0, liquid: 0, other: 0 });
    }
  }
  return null;
}

function resolveTargetWeights(
  age: number,
  retirementAge: number,
  fixedTargets: Record<AssetCategory, number> | undefined,
  glidePath: GlidePathPoint[] | null | undefined,
): Record<AssetCategory, number> {
  const glide = getGlideWeights(age, retirementAge, glidePath);
  if (glide) return glide;
  if (fixedTargets) return fixedTargets;
  return getTargetGlideAllocation(age, retirementAge);
}

function applyRebalance(
  values: Record<AssetCategory, number>,
  targetWeights: Record<AssetCategory, number>,
  strategy: RebalancingStrategy,
  threshold: number,
): { values: Record<AssetCategory, number>; rebalanced: boolean; trades: Record<AssetCategory, number> } {
  const total = Object.values(values).reduce((a, b) => a + b, 0);
  if (total <= 0) return { values, rebalanced: false, trades: zeroWeights() };

  const weights = normalizeWeights(values);
  const maxDrift = Math.max(...CATEGORIES.map((c) => Math.abs(weights[c] - targetWeights[c]) * 100));

  if (strategy === 'none') return { values, rebalanced: false, trades: zeroWeights() };
  if (strategy === 'threshold' && maxDrift < threshold) return { values, rebalanced: false, trades: zeroWeights() };

  const trades: Record<AssetCategory, number> = zeroWeights();
  CATEGORIES.forEach((c) => {
    const targetValue = total * targetWeights[c];
    trades[c] = targetValue - values[c];
    values[c] = targetValue;
  });
  return { values, rebalanced: true, trades };
}

export function projectAllocationScenario(
  inputs: MasterPlanInputs,
  assumptions: AssumptionSet,
  options: AllocationProjectOptions = {},
): ProjectionResult {
  const { currentAge, retirementAge, lifeExpectancy, inflation: inputInflation, assets, sip, stp, swp, goals } = inputs;
  const accYears = Math.max(0, retirementAge - currentAge);
  const distYears = Math.max(0, lifeExpectancy - retirementAge);

  const scenario = options.scenarioAssumptions
    ? buildScenarioAssumptionSet(options.scenarioAssumptions, assumptions, inputInflation)
    : { assumptions, inflation: inputInflation };

  const effectiveAssumptions = scenario.assumptions;
  const infl = (scenario.inflation ?? inputInflation) / 100;
  const means = CATEGORIES.map((c) => effectiveAssumptions.categories[c].mean);
  const covMatrix = CATEGORIES.map((i) => CATEGORIES.map((j) => effectiveAssumptions.covariance[i][j]));
  const L = choleskyL(covMatrix);
  const fxStats = buildCategoryFXStats(assets, effectiveAssumptions.fx);

  const sipWeightsArr = CATEGORIES.map((c) => (c === 'equity' ? sip.equitySplit / 100 : c === 'debt' ? sip.debtSplit / 100 : 0));
  const totalSipWeight = sipWeightsArr.reduce((a, b) => a + b, 0);
  const sipWeights = totalSipWeight > 0 ? sipWeightsArr.map((w) => w / totalSipWeight) : CATEGORIES.map(() => 1 / CATEGORIES.length);

  const rebalancing = options.rebalancing || { strategy: 'annual' as RebalancingStrategy, threshold: 5 };
  const fixedTargets = options.targetWeights
    ? (Object.fromEntries(CATEGORIES.map((c) => [c, options.targetWeights![c] / 100])) as Record<AssetCategory, number>)
    : undefined;

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

      const returns = generateCorrelatedReturns(L, means);
      const fxReturns = sampleFXReturn(fxStats);
      CATEGORIES.forEach((c, i) => {
        values[c] = values[c] * (1 + returns[i]) * (1 + fxReturns[i]);
      });

      if (phase === 'accumulation') {
        for (let m = 0; m < 12; m++) {
          CATEGORIES.forEach((c, i) => {
            values[c] += monthlySip * sipWeights[i];
          });
          contributions += monthlySip;
        }
        monthlySip = monthlySip * (1 + sip.stepUp / 100);

        if (stp.active && stpLiquid > 0) {
          for (let m = 0; m < 12; m++) {
            stpLiquid = stpLiquid * (1 + stp.liquidReturn / 100 / 12);
            const transfer = Math.min(stpLiquid, stp.monthlyTransfer);
            values.equity += transfer * (stp.equitySplit / 100);
            values.debt += transfer * (stp.debtSplit / 100);
            stpLiquid -= transfer;
            contributions += transfer;
          }
        }

        goalTargets.forEach((g) => {
          if (g.dueYear === y) {
            const total = Object.values(values).reduce((a, b) => a + b, 0);
            if (total >= g.futureValue) {
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

      // Rebalancing
      const age = currentAge + y;
      const targetWeights = resolveTargetWeights(age, retirementAge, fixedTargets, options.glidePath);
      const rebalanceResult = applyRebalance(values, targetWeights, rebalancing.strategy, rebalancing.threshold);
      values = rebalanceResult.values;
    }

    return { values, success, shortfall, contributions, consumption };
  };

  const simResults = Array.from({ length: options.simulations || 1000 }, runSimulation);
  const successCount = simResults.filter((r) => r.success).length;
  const probabilityOfSuccess = successCount / simResults.length;
  const shortfallRisk = simResults.reduce((sum, r) => sum + r.shortfall, 0) / simResults.length;

  // Deterministic median projection
  const yearly: YearlyCategoryProjection[] = [];
  let values: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
  assets.forEach((a) => (values[a.category] += a.value));

  let monthlySip = sip.amount;
  let stpLiquid = stp.active ? stp.lumpsum : 0;
  let totalContributions = 0;
  let totalGoalConsumption = 0;

  yearly.push({
    year: 0,
    age: currentAge,
    ...values,
    total: Object.values(values).reduce((a, b) => a + b, 0),
    weights: normalizeWeights(values),
    targetWeights: resolveTargetWeights(currentAge, retirementAge, fixedTargets, options.glidePath),
    drift: zeroWeights(),
    newInvestmentNeeded: 0,
    rebalancingNeeded: zeroWeights(),
    goalConsumption: 0,
    phase: 'accumulation',
  });

  for (let y = 1; y <= accYears + distYears; y++) {
    const phase: 'accumulation' | 'distribution' = y <= accYears ? 'accumulation' : 'distribution';

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

    const weights = normalizeWeights(values);
    const age = currentAge + y;
    const tgt = resolveTargetWeights(age, retirementAge, fixedTargets, options.glidePath);

    const rebalanceResult = applyRebalance(values, tgt, rebalancing.strategy, rebalancing.threshold);
    values = rebalanceResult.values;
    const postRebalanceTotal = Object.values(values).reduce((a, b) => a + b, 0);

    const drift: Record<AssetCategory, number> = zeroWeights();
    CATEGORIES.forEach((c) => {
      drift[c] = weights[c] - tgt[c];
    });

    yearly.push({
      year: y,
      age,
      equity: round2(values.equity),
      debt: round2(values.debt),
      gold: round2(values.gold),
      realestate: round2(values.realestate),
      liquid: round2(values.liquid),
      other: round2(values.other),
      total: round2(postRebalanceTotal),
      weights,
      targetWeights: tgt,
      drift,
      newInvestmentNeeded: round2(newInvestment),
      rebalancingNeeded: rebalanceResult.trades,
      goalConsumption: round2(goalConsumption),
      phase,
    });
  }

  const sorted = [...simResults].sort((a, b) =>
    Object.values(b.values).reduce((x, y) => x + y, 0) - Object.values(a.values).reduce((x, y) => x + y, 0),
  );
  const medianRun = sorted[Math.floor(sorted.length / 2)];
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
