import type { AssetCategory, MasterPlanInputs, Goal, Asset } from '../types';
import type { AssumptionSet } from './assumptions';
import type { RiskProfile } from '../types';

export interface CurrencyExposure {
  currency: string;
  amount: number;
  percentage: number;
}

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

export interface TaxSummary {
  effectiveRate: number;
  annualTax: number;
  postTaxIncome: number;
  recommendedTaxSaving: number;
}

export interface GoalResult {
  goal: Goal;
  futureValue: number;
  pvNeeded: number;
  successRate: number;
  requiredSIP: number;
  probabilityDistribution: { binStart: number; binEnd: number; count: number; probability: number }[];
  shortfallProbability: number;
  expectedShortfall: number;
}

export interface CashFlowEvent {
  year: number;
  age: number;
  type: 'income' | 'sip' | 'stp' | 'withdrawal' | 'goal' | 'tax' | 'other';
  amount: number;
  description: string;
}

export interface WealthSnapshot {
  year: number;
  age: number;
  values: Record<AssetCategory, number>;
  total: number;
  realTotal: number;
  invested: number;
  withdrawn: number;
  goalsFunded: number;
  taxesPaid: number;
  phase: 'accumulation' | 'distribution';
  cashFlows: CashFlowEvent[];
}

export interface MonteCarloOutcome {
  terminalValue: number;
  depletionAge: number | null;
  sustainable: boolean;
  goalSuccess: boolean[];
  yearlyValues: number[];
}

export interface WealthEngineResult {
  // Core metrics
  netWorth: number;
  totalInvested: number;
  annualIncome: number;
  annualSavings: number;
  savingsRate: number;
  monthlySIP: number;
  annualExpenses: number;

  // Projections
  snapshots: WealthSnapshot[];
  terminalValue: number;
  terminalRealValue: number;
  depletionAge: number | null;
  sustainable: boolean;
  cagrNominal: number;
  cagrReal: number;

  // Goals
  goalResults: GoalResult[];
  essentialSuccessRate: number;
  overallGoalSuccessRate: number;
  goalsAtRisk: GoalResult[];

  // Monte Carlo
  monteCarlo: {
    successRate: number;
    medianTerminal: number;
    meanTerminal: number;
    percentile5: number;
    percentile25: number;
    percentile75: number;
    percentile95: number;
    medianDepletionAge: number | null;
    outcomes: MonteCarloOutcome[];
    yearlyPercentiles: {
      year: number;
      age: number;
      p5: number;
      p25: number;
      p50: number;
      p75: number;
      p95: number;
    }[];
  };

  // Allocation
  currentAllocation: Record<AssetCategory, number>;
  targetAllocation: Record<AssetCategory, number>;
  projectedAllocation: Record<AssetCategory, number>;
  rebalancingTrades: { category: AssetCategory; current: number; target: number; trade: number }[];

  // Tax
  taxSummary: TaxSummary;

  // Currency
  currencyExposure: CurrencyExposure[];

  // Risk
  riskProfile?: RiskProfile;
  riskScore: number;
  maxDrawdownProbability: number;
}

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

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

function correlatedReturns(L: number[][], means: number[]): number[] {
  const z = means.map(() => boxMuller());
  return L.map((row, i) => means[i] + row.reduce((sum, l, k) => sum + l * z[k], 0));
}

function sumByCategory(assets: Asset[]): Record<AssetCategory, number> {
  const sums: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
  assets.forEach((a) => (sums[a.category] += a.value));
  return sums;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function calculateTax(income: number): TaxSummary {
  // Simplified Indian tax slabs for FY 2025-26 (new regime approx)
  const slabs: TaxBracket[] = [
    { min: 0, max: 400000, rate: 0 },
    { min: 400000, max: 800000, rate: 0.05 },
    { min: 800000, max: 1200000, rate: 0.10 },
    { min: 1200000, max: 1600000, rate: 0.15 },
    { min: 1600000, max: 2000000, rate: 0.20 },
    { min: 2000000, max: 2400000, rate: 0.25 },
    { min: 2400000, max: null, rate: 0.30 },
  ];

  let tax = 0;
  for (const slab of slabs) {
    if (income > slab.min) {
      const taxableInSlab = Math.min(income, slab.max ?? Infinity) - slab.min;
      if (taxableInSlab > 0) tax += taxableInSlab * slab.rate;
    }
  }
  // Add 4% cess
  tax = tax * 1.04;
  const effectiveRate = income > 0 ? tax / income : 0;

  return {
    effectiveRate,
    annualTax: round2(tax),
    postTaxIncome: round2(income - tax),
    recommendedTaxSaving: round2(Math.min(income * 0.1, 150000)),
  };
}

function calculateCurrencyExposure(assets: Asset[], baseCurrency = 'INR'): CurrencyExposure[] {
  // Simplified: assume all assets are INR unless category or name suggests foreign
  const total = assets.reduce((sum, a) => sum + a.value, 0);
  if (total <= 0) return [{ currency: baseCurrency, amount: 0, percentage: 100 }];

  const byCurrency: Record<string, number> = { [baseCurrency]: 0 };
  assets.forEach((a) => {
    const name = a.name.toLowerCase();
    const isForeign = name.includes('us') || name.includes('global') || name.includes('international') || name.includes('nasdaq') || name.includes('sp500');
    const currency = isForeign ? 'USD' : baseCurrency;
    byCurrency[currency] = (byCurrency[currency] || 0) + a.value;
  });

  return Object.entries(byCurrency).map(([currency, amount]) => ({
    currency,
    amount: round2(amount),
    percentage: round2((amount / total) * 100),
  }));
}

function buildGoalResult(goal: Goal, assumptions: AssumptionSet, currentPortfolio: number, monthlySIP: number, weights: Record<AssetCategory, number>, simulations: number): GoalResult {
  const futureValue = goal.targetAmount * Math.pow(1 + goal.inflation / 100, goal.yearsToGoal);
  const means = CATEGORIES.map((c) => assumptions.categories[c].mean);
  const cov = CATEGORIES.map((i) => CATEGORIES.map((j) => assumptions.covariance[i][j]));
  const L = choleskyL(cov);
  const weightArr = CATEGORIES.map((c) => weights[c] || 0);
  const totalWeight = weightArr.reduce((a, b) => a + b, 0);
  const normalized = totalWeight > 0 ? weightArr.map((w) => w / totalWeight) : weightArr.map(() => 1 / CATEGORIES.length);
  const portfolioMean = normalized.reduce((sum, w, i) => sum + w * means[i], 0);

  const outcomes: number[] = [];
  for (let s = 0; s < simulations; s++) {
    let corpus = currentPortfolio;
    for (let y = 0; y < goal.yearsToGoal; y++) {
      const returns = correlatedReturns(L, means);
      const weightedReturn = normalized.reduce((sum, w, i) => sum + w * returns[i], 0);
      corpus = (corpus + monthlySIP * 12) * (1 + weightedReturn);
    }
    outcomes.push(corpus);
  }

  const successCount = outcomes.filter((o) => o >= futureValue).length;
  const successRate = successCount / simulations;
  const sorted = [...outcomes].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const bins = 20;
  const binWidth = (max - min) / bins || 1;
  const distribution = [];
  for (let i = 0; i < bins; i++) {
    const binStart = min + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = outcomes.filter((o) => o >= binStart && o < binEnd).length;
    distribution.push({ binStart, binEnd, count, probability: count / simulations });
  }

  const shortfalls = outcomes.filter((o) => o < futureValue).map((o) => futureValue - o);
  const expectedShortfall = shortfalls.length > 0 ? shortfalls.reduce((a, b) => a + b, 0) / shortfalls.length : 0;

  // Required SIP for goal using real return
  const realReturn = (1 + portfolioMean) / (1 + goal.inflation / 100) - 1;
  const r = realReturn / 12;
  const n = goal.yearsToGoal * 12;
  let requiredSIP = 0;
  if (r === 0) {
    requiredSIP = futureValue / n;
  } else {
    requiredSIP = (futureValue * r) / (Math.pow(1 + r, n) - 1);
  }

  // PV needed
  const pvNeeded = futureValue / Math.pow(1 + portfolioMean, goal.yearsToGoal);

  return {
    goal: { ...goal, futureValue },
    futureValue: round2(futureValue),
    pvNeeded: round2(pvNeeded),
    successRate: round2(successRate),
    requiredSIP: round2(requiredSIP),
    probabilityDistribution: distribution,
    shortfallProbability: round2(1 - successRate),
    expectedShortfall: round2(expectedShortfall),
  };
}

function runWealthMonteCarlo(
  inputs: MasterPlanInputs,
  assumptions: AssumptionSet,
  simulations: number,
): MonteCarloOutcome[] {
  const { currentAge, retirementAge, lifeExpectancy, inflation, assets, sip, stp, swp, goals } = inputs;
  const accYears = Math.max(0, retirementAge - currentAge);
  const distYears = Math.max(0, lifeExpectancy - retirementAge);
  const infl = inflation / 100;

  const means = CATEGORIES.map((c) => assumptions.categories[c].mean);
  const cov = CATEGORIES.map((i) => CATEGORIES.map((j) => assumptions.covariance[i][j]));
  const L = choleskyL(cov);

  const sipWeightArr = CATEGORIES.map((c) => {
    if (c === 'equity') return sip.equitySplit / 100;
    if (c === 'debt') return sip.debtSplit / 100;
    return 0;
  });
  const sipTotal = sipWeightArr.reduce((a, b) => a + b, 0);
  const sipWeights = sipTotal > 0 ? sipWeightArr.map((w) => w / sipTotal) : sipWeightArr.map(() => 1 / CATEGORIES.length);

  const outcomes: MonteCarloOutcome[] = [];

  for (let s = 0; s < simulations; s++) {
    let values: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
    assets.forEach((a) => (values[a.category] += a.value));

    let monthlySip = sip.amount;
    let stpLiquid = stp.active ? stp.lumpsum : 0;
    const goalTargets = goals.map((g) => ({
      ...g,
      futureValue: g.targetAmount * Math.pow(1 + g.inflation / 100, g.yearsToGoal),
      dueYear: g.yearsToGoal,
    }));
    const goalSuccess = new Array(goals.length).fill(false);
    const yearlyValues: number[] = [];
    let depletionAge: number | null = null;

    for (let y = 1; y <= accYears + distYears; y++) {
      const returns = correlatedReturns(L, means);
      CATEGORIES.forEach((c, i) => {
        values[c] = values[c] * (1 + returns[i]);
      });

      if (y <= accYears) {
        for (let m = 0; m < 12; m++) {
          CATEGORIES.forEach((c, i) => {
            values[c] += monthlySip * sipWeights[i];
          });
        }
        monthlySip = monthlySip * (1 + sip.stepUp / 100);

        if (stp.active && stpLiquid > 0) {
          for (let m = 0; m < 12; m++) {
            stpLiquid = stpLiquid * (1 + stp.liquidReturn / 100 / 12);
            const transfer = Math.min(stpLiquid, stp.monthlyTransfer);
            values.equity += transfer * (stp.equitySplit / 100);
            values.debt += transfer * (stp.debtSplit / 100);
            stpLiquid -= transfer;
          }
        }

        goalTargets.forEach((g, idx) => {
          if (g.dueYear === y) {
            const total = Object.values(values).reduce((a, b) => a + b, 0);
            if (total >= g.futureValue) {
              const ratio = g.futureValue / total;
              CATEGORIES.forEach((c) => (values[c] *= 1 - ratio));
              goalSuccess[idx] = true;
            } else {
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
        } else {
          if (depletionAge === null) depletionAge = currentAge + y - 1;
          CATEGORIES.forEach((c) => (values[c] = 0));
        }
      }

      yearlyValues.push(Object.values(values).reduce((a, b) => a + b, 0));
    }

    const terminalValue = Object.values(values).reduce((a, b) => a + b, 0);
    outcomes.push({
      terminalValue,
      depletionAge,
      sustainable: depletionAge === null || (depletionAge !== null && depletionAge > lifeExpectancy),
      goalSuccess,
      yearlyValues,
    });
  }

  return outcomes;
}

function buildYearlyPercentiles(outcomes: MonteCarloOutcome[], currentAge: number, retirementAge: number, lifeExpectancy: number) {
  const accYears = Math.max(0, retirementAge - currentAge);
  const distYears = Math.max(0, lifeExpectancy - retirementAge);
  const totalYears = accYears + distYears;
  const percentiles = [];
  for (let y = 0; y < totalYears; y++) {
    const values = outcomes.map((o) => o.yearlyValues[y] || 0).sort((a, b) => a - b);
    percentiles.push({
      year: y + 1,
      age: currentAge + y + 1,
      p5: values[Math.floor(values.length * 0.05)] || 0,
      p25: values[Math.floor(values.length * 0.25)] || 0,
      p50: values[Math.floor(values.length * 0.5)] || 0,
      p75: values[Math.floor(values.length * 0.75)] || 0,
      p95: values[Math.floor(values.length * 0.95)] || 0,
    });
  }
  return percentiles;
}

function buildDeterministicSnapshots(
  inputs: MasterPlanInputs,
  assumptions: AssumptionSet,
): WealthSnapshot[] {
  const { currentAge, retirementAge, lifeExpectancy, inflation, assets, sip, stp, swp, goals, annualIncome } = inputs;
  const accYears = Math.max(0, retirementAge - currentAge);
  const distYears = Math.max(0, lifeExpectancy - retirementAge);
  const infl = inflation / 100;

  const means = CATEGORIES.map((c) => assumptions.categories[c].mean);
  const sipWeightArr = CATEGORIES.map((c) => {
    if (c === 'equity') return sip.equitySplit / 100;
    if (c === 'debt') return sip.debtSplit / 100;
    return 0;
  });
  const sipTotal = sipWeightArr.reduce((a, b) => a + b, 0);
  const sipWeights = sipTotal > 0 ? sipWeightArr.map((w) => w / sipTotal) : sipWeightArr.map(() => 1 / CATEGORIES.length);

  const snapshots: WealthSnapshot[] = [];
  let values: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
  assets.forEach((a) => (values[a.category] += a.value));

  let monthlySip = sip.amount;
  let stpLiquid = stp.active ? stp.lumpsum : 0;
  let totalInvested = 0;
  let totalWithdrawn = 0;
  let totalGoalsFunded = 0;
  let totalTaxes = 0;

  snapshots.push({
    year: 0,
    age: currentAge,
    values: { ...values },
    total: Object.values(values).reduce((a, b) => a + b, 0),
    realTotal: Object.values(values).reduce((a, b) => a + b, 0),
    invested: 0,
    withdrawn: 0,
    goalsFunded: 0,
    taxesPaid: 0,
    phase: 'accumulation',
    cashFlows: [],
  });

  for (let y = 1; y <= accYears + distYears; y++) {
    const phase: 'accumulation' | 'distribution' = y <= accYears ? 'accumulation' : 'distribution';
    const cashFlows: CashFlowEvent[] = [];

    CATEGORIES.forEach((c, i) => {
      values[c] = values[c] * (1 + means[i]);
    });

    if (phase === 'accumulation') {
      let annualSip = 0;
      for (let m = 0; m < 12; m++) {
        CATEGORIES.forEach((c, i) => {
          values[c] += monthlySip * sipWeights[i];
        });
        annualSip += monthlySip;
      }
      totalInvested += annualSip;
      cashFlows.push({ year: y, age: currentAge + y, type: 'sip', amount: annualSip, description: 'Annual SIP contributions' });
      monthlySip = monthlySip * (1 + sip.stepUp / 100);

      if (stp.active && stpLiquid > 0) {
        let annualStp = 0;
        for (let m = 0; m < 12; m++) {
          stpLiquid = stpLiquid * (1 + stp.liquidReturn / 100 / 12);
          const transfer = Math.min(stpLiquid, stp.monthlyTransfer);
          values.equity += transfer * (stp.equitySplit / 100);
          values.debt += transfer * (stp.debtSplit / 100);
          stpLiquid -= transfer;
          annualStp += transfer;
        }
        totalInvested += annualStp;
        cashFlows.push({ year: y, age: currentAge + y, type: 'stp', amount: annualStp, description: 'STP deployment' });
      }

      goals.forEach((g) => {
        if (g.yearsToGoal === y) {
          const futureValue = g.targetAmount * Math.pow(1 + g.inflation / 100, g.yearsToGoal);
          const total = Object.values(values).reduce((a, b) => a + b, 0);
          const draw = Math.min(total, futureValue);
          const ratio = total > 0 ? draw / total : 0;
          CATEGORIES.forEach((c) => (values[c] *= 1 - ratio));
          totalGoalsFunded += draw;
          cashFlows.push({ year: y, age: currentAge + y, type: 'goal', amount: draw, description: `Goal: ${g.name}` });
        }
      });

      const tax = annualIncome * calculateTax(annualIncome).effectiveRate;
      totalTaxes += tax;
      cashFlows.push({ year: y, age: currentAge + y, type: 'tax', amount: tax, description: 'Estimated income tax' });
    } else {
      const yearsSinceRetirement = y - accYears;
      const monthlyNeed = swp.monthlyNeedToday * Math.pow(1 + infl, accYears + yearsSinceRetirement - 1);
      const grossAnnual = (monthlyNeed * 12) / (1 - swp.taxRate / 100);
      const total = Object.values(values).reduce((a, b) => a + b, 0);
      const draw = Math.min(total, grossAnnual);
      const ratio = total > 0 ? draw / total : 0;
      CATEGORIES.forEach((c) => (values[c] *= 1 - ratio));
      totalWithdrawn += draw;
      cashFlows.push({ year: y, age: currentAge + y, type: 'withdrawal', amount: draw, description: 'Annual SWP withdrawal' });
    }

    const total = Object.values(values).reduce((a, b) => a + b, 0);
    snapshots.push({
      year: y,
      age: currentAge + y,
      values: { ...values },
      total: round2(total),
      realTotal: round2(total / Math.pow(1 + infl, y)),
      invested: round2(totalInvested),
      withdrawn: round2(totalWithdrawn),
      goalsFunded: round2(totalGoalsFunded),
      taxesPaid: round2(totalTaxes),
      phase,
      cashFlows,
    });
  }

  return snapshots;
}

export function runWealthEngine(inputs: MasterPlanInputs, assumptions: AssumptionSet, riskProfile?: { profile?: RiskProfile; score?: number }): WealthEngineResult {
  const { currentAge, retirementAge, lifeExpectancy, assets, sip, stp, swp, goals, annualIncome } = inputs;
  const netWorth = assets.reduce((sum, a) => sum + a.value, 0);
  const annualSavings = sip.amount * 12 + (stp.active ? stp.monthlyTransfer * 12 : 0);
  const savingsRate = annualIncome > 0 ? (annualSavings / annualIncome) * 100 : 0;
  const annualExpenses = swp.monthlyNeedToday * 12;

  const currentAllocation = sumByCategory(assets);
  const totalValue = Object.values(currentAllocation).reduce((a, b) => a + b, 0);
  const currentAllocationPct: Record<AssetCategory, number> = {
    equity: totalValue > 0 ? currentAllocation.equity / totalValue : 0,
    debt: totalValue > 0 ? currentAllocation.debt / totalValue : 0,
    gold: totalValue > 0 ? currentAllocation.gold / totalValue : 0,
    realestate: totalValue > 0 ? currentAllocation.realestate / totalValue : 0,
    liquid: totalValue > 0 ? currentAllocation.liquid / totalValue : 0,
    other: totalValue > 0 ? currentAllocation.other / totalValue : 0,
  };

  const targetAllocation: Record<AssetCategory, number> = riskProfile?.profile
    ? {
        equity: riskProfile.profile.targets.equity / 100,
        debt: riskProfile.profile.targets.debt / 100,
        gold: riskProfile.profile.targets.gold / 100,
        realestate: riskProfile.profile.targets.realestate / 100,
        liquid: riskProfile.profile.targets.liquid / 100,
        other: riskProfile.profile.targets.other / 100,
      }
    : { equity: 0.55, debt: 0.25, gold: 0.1, realestate: 0.05, liquid: 0.05, other: 0 };

  const rebalancingTrades = CATEGORIES.map((c) => ({
    category: c,
    current: currentAllocation[c],
    target: totalValue * targetAllocation[c],
    trade: totalValue * targetAllocation[c] - currentAllocation[c],
  }));

  const snapshots = buildDeterministicSnapshots(inputs, assumptions);
  const terminalSnapshot = snapshots[snapshots.length - 1];
  const terminalValue = terminalSnapshot?.total || 0;
  const terminalRealValue = terminalSnapshot?.realTotal || 0;
  const initialValue = snapshots[0]?.total || 1;
  const years = snapshots.length - 1;
  const cagrNominal = years > 0 ? (Math.pow(terminalValue / initialValue, 1 / years) - 1) * 100 : 0;
  const cagrReal = years > 0 ? (Math.pow(terminalRealValue / initialValue, 1 / years) - 1) * 100 : 0;

  // Find depletion age from deterministic path
  let depletionAge: number | null = null;
  for (let i = snapshots.length - 1; i >= 0; i--) {
    if (snapshots[i].phase === 'distribution' && snapshots[i].total <= 0 && depletionAge === null) {
      depletionAge = snapshots[i].age;
    }
  }
  const sustainable = depletionAge === null || (depletionAge !== null && depletionAge > lifeExpectancy);

  // Goal results
  const weights: Record<AssetCategory, number> = {
    equity: sip.equitySplit / 100,
    debt: sip.debtSplit / 100,
    gold: 0,
    realestate: 0,
    liquid: 0,
    other: 0,
  };
  const simCount = riskProfile?.profile?.monteCarloSimulations || 2000;
  const goalResults = goals.map((g) => buildGoalResult(g, assumptions, netWorth, sip.amount, weights, simCount));

  const essentialGoals = goalResults.filter((g) => g.goal.priority === 'essential');
  const essentialSuccessRate = essentialGoals.length > 0
    ? essentialGoals.reduce((sum, g) => sum + g.successRate, 0) / essentialGoals.length
    : 1;
  const overallGoalSuccessRate = goalResults.length > 0
    ? goalResults.reduce((sum, g) => sum + g.successRate, 0) / goalResults.length
    : 1;
  const goalsAtRisk = goalResults.filter((g) => g.successRate < (riskProfile?.profile?.goalSuccessThreshold || 70) / 100);

  // Monte Carlo for overall plan
  const mcOutcomes = runWealthMonteCarlo(inputs, assumptions, simCount);
  const successfulOutcomes = mcOutcomes.filter((o) => o.sustainable && o.goalSuccess.every(Boolean));
  const terminalValues = mcOutcomes.map((o) => o.terminalValue).sort((a, b) => a - b);
  const depletionAges = mcOutcomes.map((o) => o.depletionAge).filter((a): a is number => a !== null).sort((a, b) => a - b);

  const yearlyPercentiles = buildYearlyPercentiles(mcOutcomes, currentAge, retirementAge, lifeExpectancy);

  // Max drawdown probability
  let maxDrawdownCount = 0;
  mcOutcomes.forEach((o) => {
    let peak = 0;
    let maxDD = 0;
    o.yearlyValues.forEach((v) => {
      if (v > peak) peak = v;
      const dd = peak > 0 ? (peak - v) / peak : 0;
      if (dd > maxDD) maxDD = dd;
    });
    if (maxDD > (riskProfile?.profile?.maxDrawdown || 20) / 100) maxDrawdownCount++;
  });

  return {
    netWorth: round2(netWorth),
    totalInvested: round2(terminalSnapshot?.invested || 0),
    annualIncome: round2(annualIncome),
    annualSavings: round2(annualSavings),
    savingsRate: round2(savingsRate),
    monthlySIP: sip.amount,
    annualExpenses: round2(annualExpenses),
    snapshots,
    terminalValue: round2(terminalValue),
    terminalRealValue: round2(terminalRealValue),
    depletionAge,
    sustainable,
    cagrNominal: round2(cagrNominal),
    cagrReal: round2(cagrReal),
    goalResults,
    essentialSuccessRate: round2(essentialSuccessRate),
    overallGoalSuccessRate: round2(overallGoalSuccessRate),
    goalsAtRisk,
    monteCarlo: {
      successRate: round2(successfulOutcomes.length / mcOutcomes.length),
      medianTerminal: round2(terminalValues[Math.floor(terminalValues.length / 2)] || 0),
      meanTerminal: round2(terminalValues.reduce((a, b) => a + b, 0) / terminalValues.length || 0),
      percentile5: round2(terminalValues[Math.floor(terminalValues.length * 0.05)] || 0),
      percentile25: round2(terminalValues[Math.floor(terminalValues.length * 0.25)] || 0),
      percentile75: round2(terminalValues[Math.floor(terminalValues.length * 0.75)] || 0),
      percentile95: round2(terminalValues[Math.floor(terminalValues.length * 0.95)] || 0),
      medianDepletionAge: depletionAges.length > 0 ? depletionAges[Math.floor(depletionAges.length / 2)] : null,
      outcomes: mcOutcomes,
      yearlyPercentiles,
    },
    currentAllocation: currentAllocationPct,
    targetAllocation,
    projectedAllocation: {
      equity: terminalSnapshot?.values.equity / Math.max(terminalSnapshot?.total, 1) || 0,
      debt: terminalSnapshot?.values.debt / Math.max(terminalSnapshot?.total, 1) || 0,
      gold: terminalSnapshot?.values.gold / Math.max(terminalSnapshot?.total, 1) || 0,
      realestate: terminalSnapshot?.values.realestate / Math.max(terminalSnapshot?.total, 1) || 0,
      liquid: terminalSnapshot?.values.liquid / Math.max(terminalSnapshot?.total, 1) || 0,
      other: terminalSnapshot?.values.other / Math.max(terminalSnapshot?.total, 1) || 0,
    },
    rebalancingTrades,
    taxSummary: calculateTax(annualIncome),
    currencyExposure: calculateCurrencyExposure(assets),
    riskProfile: riskProfile?.profile,
    riskScore: riskProfile?.score || 50,
    maxDrawdownProbability: round2(maxDrawdownCount / mcOutcomes.length),
  };
}
