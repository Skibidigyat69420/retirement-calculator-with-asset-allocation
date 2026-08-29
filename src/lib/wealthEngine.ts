import type { AssetCategory, MasterPlanInputs, Goal, Asset } from '../types';
import type { AssumptionSet } from './assumptions';
import type { RiskProfile } from '../types';

export interface CurrencyExposure {
  currency: string;
  amount: number;
  percentage: number;
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
  netWorth: number;
  totalInvested: number;
  annualIncome: number;
  annualSavings: number;
  savingsRate: number;
  annualInvested: number;
  investmentRate: number;
  monthlySIP: number;
  annualExpenses: number;
  snapshots: WealthSnapshot[];
  terminalValue: number;
  terminalRealValue: number;
  depletionAge: number | null;
  sustainable: boolean;
  cagrNominal: number;
  cagrReal: number;
  goalResults: GoalResult[];
  essentialSuccessRate: number;
  overallGoalSuccessRate: number;
  goalsAtRisk: GoalResult[];
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
  currentAllocation: Record<AssetCategory, number>;
  targetAllocation: Record<AssetCategory, number>;
  projectedAllocation: Record<AssetCategory, number>;
  rebalancingTrades: { category: AssetCategory; current: number; target: number; trade: number }[];
  taxSummary: TaxSummary;
  currencyExposure: CurrencyExposure[];
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
  const slabs = [
    { min: 0, max: 400000, rate: 0 },
    { min: 400000, max: 800000, rate: 0.05 },
    { min: 800000, max: 1200000, rate: 0.10 },
    { min: 1200000, max: 1600000, rate: 0.15 },
    { min: 1600000, max: 2000000, rate: 0.20 },
    { min: 2000000, max: 2400000, rate: 0.25 },
    { min: 2400000, max: null as number | null, rate: 0.30 },
  ];

  let tax = 0;
  for (const slab of slabs) {
    if (income > slab.min) {
      const taxableInSlab = Math.min(income, slab.max ?? Infinity) - slab.min;
      if (taxableInSlab > 0) tax += taxableInSlab * slab.rate;
    }
  }
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
  const total = assets.reduce((sum, a) => sum + a.value, 0);
  if (total <= 0) return [{ currency: baseCurrency, amount: 0, percentage: 100 }];

  const byCurrency: Record<string, number> = { [baseCurrency]: 0 };
  assets.forEach((a) => {
    const currency = a.currency || baseCurrency;
    byCurrency[currency] = (byCurrency[currency] || 0) + a.value;
  });

  return Object.entries(byCurrency).map(([currency, amount]) => ({
    currency,
    amount: round2(amount),
    percentage: round2((amount / total) * 100),
  }));
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

function buildSipWeights(sip: MasterPlanInputs['sip']): number[] {
  const arr = CATEGORIES.map((c) => {
    if (c === 'equity') return sip.equitySplit / 100;
    if (c === 'debt') return sip.debtSplit / 100;
    return 0;
  });
  const total = arr.reduce((a, b) => a + b, 0);
  return total > 0 ? arr.map((w) => w / total) : arr.map(() => 1 / CATEGORIES.length);
}

function buildStpWeights(stp: MasterPlanInputs['stp']): { equity: number; debt: number } {
  const total = (stp.equitySplit + stp.debtSplit) / 100;
  return total > 0
    ? { equity: stp.equitySplit / 100 / total, debt: stp.debtSplit / 100 / total }
    : { equity: 0.5, debt: 0.5 };
}

interface SimulationState {
  values: Record<AssetCategory, number>;
  monthlySip: number;
  stpLiquid: number;
  totalInvested: number;
  totalWithdrawn: number;
  totalGoalsFunded: number;
  totalTaxes: number;
  goalSuccess: boolean[];
  cashFlows: CashFlowEvent[];
  yearlyValues: number[];
  depletionAge: number | null;
}

function simulateOnePath(
  inputs: MasterPlanInputs,
  L: number[][],
  means: number[],
  fxStats: Record<AssetCategory, CategoryFXStats>,
  useMeanReturns: boolean,
): SimulationState {
  const { currentAge, retirementAge, lifeExpectancy, inflation, assets, sip, stp, swp, goals, annualIncome } = inputs;
  const accYears = Math.max(0, retirementAge - currentAge);
  const distYears = Math.max(0, lifeExpectancy - retirementAge);
  const infl = inflation / 100;

  const state: SimulationState = {
    values: { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 },
    monthlySip: sip.amount,
    stpLiquid: stp.active ? stp.lumpsum : 0,
    totalInvested: 0,
    totalWithdrawn: 0,
    totalGoalsFunded: 0,
    totalTaxes: 0,
    goalSuccess: new Array(goals.length).fill(false),
    cashFlows: [],
    yearlyValues: [],
    depletionAge: null,
  };

  assets.forEach((a) => (state.values[a.category] += a.value));
  const sipWeights = buildSipWeights(sip);
  const stpWeights = buildStpWeights(stp);

  const sortedGoals = goals
    .map((g, idx) => ({ goal: g, idx, futureValue: g.targetAmount * Math.pow(1 + g.inflation / 100, g.yearsToGoal) }))
    .sort((a, b) => a.goal.yearsToGoal - b.goal.yearsToGoal);

  for (let y = 1; y <= accYears + distYears; y++) {
    const phase: 'accumulation' | 'distribution' = y <= accYears ? 'accumulation' : 'distribution';

    const returns = useMeanReturns
      ? means
      : correlatedReturns(L, means);
    const fxReturns = useMeanReturns
      ? CATEGORIES.map((cat) => fxStats[cat].mean)
      : sampleFXReturn(fxStats);
    CATEGORIES.forEach((c, i) => {
      state.values[c] = state.values[c] * (1 + returns[i]) * (1 + fxReturns[i]);
    });

    if (phase === 'accumulation') {
      let annualSip = 0;
      for (let m = 0; m < 12; m++) {
        CATEGORIES.forEach((c, i) => {
          state.values[c] += state.monthlySip * sipWeights[i];
        });
        annualSip += state.monthlySip;
      }
      state.totalInvested += annualSip;
      state.cashFlows.push({ year: y, age: currentAge + y, type: 'sip', amount: annualSip, description: 'Annual SIP contributions' });
      state.monthlySip = state.monthlySip * (1 + sip.stepUp / 100);

      if (stp.active && state.stpLiquid > 0) {
        let annualStp = 0;
        for (let m = 0; m < 12; m++) {
          state.stpLiquid = state.stpLiquid * (1 + stp.liquidReturn / 100 / 12);
          const transfer = Math.min(state.stpLiquid, stp.monthlyTransfer);
          state.values.equity += transfer * stpWeights.equity;
          state.values.debt += transfer * stpWeights.debt;
          state.stpLiquid -= transfer;
          annualStp += transfer;
        }
        state.totalInvested += annualStp;
        state.cashFlows.push({ year: y, age: currentAge + y, type: 'stp', amount: annualStp, description: 'STP deployment' });
      }

      sortedGoals.forEach(({ goal, idx, futureValue }) => {
        if (goal.yearsToGoal === y) {
          const total = Object.values(state.values).reduce((a, b) => a + b, 0);
          if (total >= futureValue) {
            const ratio = futureValue / total;
            CATEGORIES.forEach((c) => (state.values[c] *= 1 - ratio));
            state.totalGoalsFunded += futureValue;
            state.goalSuccess[idx] = true;
            state.cashFlows.push({ year: y, age: currentAge + y, type: 'goal', amount: futureValue, description: `Goal: ${goal.name}` });
          } else {
            CATEGORIES.forEach((c) => (state.values[c] = 0));
            state.cashFlows.push({ year: y, age: currentAge + y, type: 'goal', amount: total, description: `Goal shortfall: ${goal.name}` });
          }
        }
      });

      const tax = annualIncome * calculateTax(annualIncome).effectiveRate;
      state.totalTaxes += tax;
      state.cashFlows.push({ year: y, age: currentAge + y, type: 'tax', amount: tax, description: 'Estimated income tax' });
    } else {
      const yearsSinceRetirement = y - accYears;
      const monthlyNeed = swp.monthlyNeedToday * Math.pow(1 + infl, accYears + yearsSinceRetirement - 1);
      const grossAnnual = (monthlyNeed * 12) / (1 - swp.taxRate / 100);
      const total = Object.values(state.values).reduce((a, b) => a + b, 0);
      if (total >= grossAnnual) {
        const ratio = grossAnnual / total;
        CATEGORIES.forEach((c) => (state.values[c] *= 1 - ratio));
        state.totalWithdrawn += grossAnnual;
        state.cashFlows.push({ year: y, age: currentAge + y, type: 'withdrawal', amount: grossAnnual, description: 'Annual SWP withdrawal' });
      } else {
        if (state.depletionAge === null) state.depletionAge = currentAge + y - 1;
        CATEGORIES.forEach((c) => (state.values[c] = 0));
        state.cashFlows.push({ year: y, age: currentAge + y, type: 'withdrawal', amount: total, description: 'SWP shortfall' });
      }
    }

    state.yearlyValues.push(Object.values(state.values).reduce((a, b) => a + b, 0));
  }

  return state;
}

function buildSnapshots(inputs: MasterPlanInputs, assumptions: AssumptionSet): WealthSnapshot[] {
  const { currentAge } = inputs;
  const means = CATEGORIES.map((c) => assumptions.categories[c].mean);
  const fxStats = buildCategoryFXStats(inputs.assets, assumptions.fx);
  const state = simulateOnePath(inputs, [], means, fxStats, true);
  const snapshots: WealthSnapshot[] = [];
  const infl = inputs.inflation / 100;

  const initialValues = sumByCategory(inputs.assets);
  snapshots.push({
    year: 0,
    age: currentAge,
    values: initialValues,
    total: Object.values(initialValues).reduce((a, b) => a + b, 0),
    realTotal: Object.values(initialValues).reduce((a, b) => a + b, 0),
    invested: 0,
    withdrawn: 0,
    goalsFunded: 0,
    taxesPaid: 0,
    phase: 'accumulation',
    cashFlows: [],
  });

  const accYears = Math.max(0, inputs.retirementAge - inputs.currentAge);

  for (let y = 1; y <= state.yearlyValues.length; y++) {
    const phase: 'accumulation' | 'distribution' = y <= accYears ? 'accumulation' : 'distribution';
    const yearCashFlows = state.cashFlows.filter((cf) => cf.year === y);
    snapshots.push({
      year: y,
      age: currentAge + y,
      values: { ...state.values },
      total: round2(state.yearlyValues[y - 1]),
      realTotal: round2(state.yearlyValues[y - 1] / Math.pow(1 + infl, y)),
      invested: round2(state.totalInvested),
      withdrawn: round2(state.totalWithdrawn),
      goalsFunded: round2(state.totalGoalsFunded),
      taxesPaid: round2(state.totalTaxes),
      phase,
      cashFlows: yearCashFlows,
    });
  }

  return snapshots;
}

function buildGoalDistribution(
  goal: Goal,
  inputs: MasterPlanInputs,
  assumptions: AssumptionSet,
  simulations: number,
): GoalResult {
  const futureValue = goal.targetAmount * Math.pow(1 + goal.inflation / 100, goal.yearsToGoal);
  const cov = CATEGORIES.map((i) => CATEGORIES.map((j) => assumptions.covariance[i][j]));
  const L = choleskyL(cov);
  const means = CATEGORIES.map((c) => assumptions.categories[c].mean);
  const fxStats = buildCategoryFXStats(inputs.assets, assumptions.fx);
  const outcomes: number[] = [];

  for (let s = 0; s < simulations; s++) {
    const state = simulateOnePath(inputs, L, means, fxStats, false);
    outcomes.push(state.yearlyValues[goal.yearsToGoal - 1] || 0);
  }

  const successCount = outcomes.filter((o) => o >= futureValue).length;
  const successRate = successCount / simulations;

  const sorted = [...outcomes].sort((a, b) => a - b);
  const min = sorted[0] || 0;
  const max = sorted[sorted.length - 1] || 0;
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

  const sipWeights = buildSipWeights(inputs.sip);
  const portfolioMean = sipWeights.reduce((sum, w, i) => sum + w * means[i], 0);
  const realReturn = (1 + portfolioMean) / (1 + goal.inflation / 100) - 1;
  const r = realReturn / 12;
  const n = goal.yearsToGoal * 12;
  const requiredSIP = r === 0 ? futureValue / n : (futureValue * r) / (Math.pow(1 + r, n) - 1);
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

function buildMonteCarlo(
  inputs: MasterPlanInputs,
  assumptions: AssumptionSet,
  simulations: number,
): WealthEngineResult['monteCarlo'] {
  const { currentAge, lifeExpectancy } = inputs;
  const cov = CATEGORIES.map((i) => CATEGORIES.map((j) => assumptions.covariance[i][j]));
  const L = choleskyL(cov);
  const means = CATEGORIES.map((c) => assumptions.categories[c].mean);
  const fxStats = buildCategoryFXStats(inputs.assets, assumptions.fx);

  const outcomes: MonteCarloOutcome[] = [];
  for (let s = 0; s < simulations; s++) {
    const state = simulateOnePath(inputs, L, means, fxStats, false);
    outcomes.push({
      terminalValue: state.yearlyValues[state.yearlyValues.length - 1] || 0,
      depletionAge: state.depletionAge,
      sustainable: state.depletionAge === null || (state.depletionAge !== null && state.depletionAge > lifeExpectancy),
      goalSuccess: state.goalSuccess,
      yearlyValues: state.yearlyValues,
    });
  }

  const successful = outcomes.filter((o) => o.sustainable && o.goalSuccess.every(Boolean));
  const terminalValues = outcomes.map((o) => o.terminalValue).sort((a, b) => a - b);
  const depletionAges = outcomes.map((o) => o.depletionAge).filter((a): a is number => a !== null).sort((a, b) => a - b);

  const totalYears = Math.max(0, lifeExpectancy - currentAge);
  const yearlyPercentiles = [];
  for (let y = 0; y < totalYears; y++) {
    const values = outcomes.map((o) => o.yearlyValues[y] || 0).sort((a, b) => a - b);
    yearlyPercentiles.push({
      year: y + 1,
      age: currentAge + y + 1,
      p5: values[Math.floor(values.length * 0.05)] || 0,
      p25: values[Math.floor(values.length * 0.25)] || 0,
      p50: values[Math.floor(values.length * 0.5)] || 0,
      p75: values[Math.floor(values.length * 0.75)] || 0,
      p95: values[Math.floor(values.length * 0.95)] || 0,
    });
  }

  return {
    successRate: round2(successful.length / outcomes.length),
    medianTerminal: round2(terminalValues[Math.floor(terminalValues.length / 2)] || 0),
    meanTerminal: round2(terminalValues.reduce((a, b) => a + b, 0) / terminalValues.length || 0),
    percentile5: round2(terminalValues[Math.floor(terminalValues.length * 0.05)] || 0),
    percentile25: round2(terminalValues[Math.floor(terminalValues.length * 0.25)] || 0),
    percentile75: round2(terminalValues[Math.floor(terminalValues.length * 0.75)] || 0),
    percentile95: round2(terminalValues[Math.floor(terminalValues.length * 0.95)] || 0),
    medianDepletionAge: depletionAges.length > 0 ? depletionAges[Math.floor(depletionAges.length / 2)] : null,
    outcomes,
    yearlyPercentiles,
  };
}

export function runWealthEngine(
  inputs: MasterPlanInputs,
  assumptions: AssumptionSet,
  riskProfile?: { profile?: RiskProfile; score?: number },
): WealthEngineResult {
  const { lifeExpectancy, assets, sip, stp, goals, annualIncome, monthlyExpenditure } = inputs;
  const netWorth = assets.reduce((sum, a) => sum + a.value, 0);
  const annualExpenses = monthlyExpenditure * 12;
  const annualSavings = Math.max(0, annualIncome - annualExpenses);
  const savingsRate = annualIncome > 0 ? (annualSavings / annualIncome) * 100 : 0;
  const annualInvested = sip.amount * 12 + (stp.active ? stp.monthlyTransfer * 12 : 0);

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

  const snapshots = buildSnapshots(inputs, assumptions);
  const terminalSnapshot = snapshots[snapshots.length - 1];
  const terminalValue = terminalSnapshot?.total || 0;
  const terminalRealValue = terminalSnapshot?.realTotal || 0;
  const initialValue = snapshots[0]?.total || 1;
  const years = snapshots.length - 1;
  const cagrNominal = years > 0 ? (Math.pow(terminalValue / initialValue, 1 / years) - 1) * 100 : 0;
  const cagrReal = years > 0 ? (Math.pow(terminalRealValue / initialValue, 1 / years) - 1) * 100 : 0;

  let depletionAge: number | null = null;
  for (let i = snapshots.length - 1; i >= 0; i--) {
    if (snapshots[i].phase === 'distribution' && snapshots[i].total <= 0 && depletionAge === null) {
      depletionAge = snapshots[i].age;
    }
  }
  const sustainable = depletionAge === null || (depletionAge !== null && depletionAge > lifeExpectancy);

  const simCount = riskProfile?.profile?.monteCarloSimulations || 2000;
  const goalResults = goals.map((g) => buildGoalDistribution(g, inputs, assumptions, Math.max(500, Math.floor(simCount / 4))));

  const essentialGoals = goalResults.filter((g) => g.goal.priority === 'essential');
  const essentialSuccessRate = essentialGoals.length > 0
    ? essentialGoals.reduce((sum, g) => sum + g.successRate, 0) / essentialGoals.length
    : 1;
  const overallGoalSuccessRate = goalResults.length > 0
    ? goalResults.reduce((sum, g) => sum + g.successRate, 0) / goalResults.length
    : 1;
  const goalsAtRisk = goalResults.filter((g) => g.successRate < (riskProfile?.profile?.goalSuccessThreshold || 70) / 100);

  const monteCarlo = buildMonteCarlo(inputs, assumptions, simCount);

  let maxDrawdownCount = 0;
  monteCarlo.outcomes.forEach((o) => {
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
    annualInvested: round2(annualInvested),
    investmentRate: round2(annualIncome > 0 ? (annualInvested / annualIncome) * 100 : 0),
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
    monteCarlo,
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
    maxDrawdownProbability: round2(maxDrawdownCount / monteCarlo.outcomes.length),
  };
}
