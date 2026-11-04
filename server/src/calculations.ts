import type { Profile } from './types.js';
import { createEmptyPlan } from '../../src/lib/scenarios.js';
import { runWealthEngine } from '../../src/lib/wealthEngine.js';

type EngineAssumptions = Parameters<typeof runWealthEngine>[1];

type JsonObject = Record<string, unknown>;

export interface PlanCalculationResult {
  calculationVersion: 'wealth-engine-v1';
  isConfigured: boolean;
  netWorth: number;
  investableAssets: number;
  totalLiabilities: number;
  projectedCorpus: number;
  requiredCorpus: number;
  fundingRatio: number;
  probabilityOfSuccess: number;
  annualIncome: number;
  annualExpenses: number;
  yearsToRetirement: number;
  warnings: string[];
  wealthEngine: {
    terminalValue: number;
    terminalRealValue: number;
    sustainable: boolean;
    depletionAge: number | null;
    overallGoalSuccessRate: number;
    monteCarlo: {
      successRate: number;
      medianTerminal: number;
      percentile5: number;
      percentile95: number;
      medianDepletionAge: number | null;
      yearlyPercentiles: Array<{ year: number; age: number; p5: number; p25: number; p50: number; p75: number; p95: number }>;
    };
  };
}

const DEFAULT_RETURN = 0.085;
const DEFAULT_INFLATION = 0.06;

function record(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

function number(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** Accepts both percentage-point values (6) and decimal values (0.06). */
function rate(value: unknown, fallback: number): number {
  const parsed = number(value, fallback);
  return parsed > 1 ? parsed / 100 : parsed;
}

function amount(item: JsonObject): number {
  return Math.max(0, number(item.currentValue ?? item.amount ?? item.balance));
}

function active(items: JsonObject[]): JsonObject[] {
  return items.filter((item) => item.status !== 'archived');
}

function futureValue(principal: number, annualContribution: number, annualRate: number, years: number): number {
  if (years <= 0) return principal;
  const growth = Math.pow(1 + annualRate, years);
  const contributionValue = annualRate === 0
    ? annualContribution * years
    : annualContribution * ((growth - 1) / annualRate);
  return principal * growth + contributionValue;
}

function snapshotInputs(snapshot: JsonObject): JsonObject {
  return record(snapshot.inputs ?? snapshot);
}

function annualAmount(item: JsonObject): number {
  const direct = number(item.annualAmount);
  if (direct > 0) return direct;
  return Math.max(0, number(item.monthlyAmount)) * 12;
}

function toEngineInputs(snapshot: JsonObject, profile: Profile) {
  const saved = snapshotInputs(snapshot);
  const defaults = createEmptyPlan();
  const cashflows = active(profile.cashflows.map(record));
  const findCashflow = (type: string) => cashflows.find((item) => item.type === type);
  const income = findCashflow('income');
  const expense = findCashflow('expense');
  const sip = findCashflow('sip');
  const swp = findCashflow('swp');
  const savedClient = record(saved.client);

  return {
    ...defaults,
    ...saved,
    client: { ...defaults.client, ...savedClient },
    annualIncome: number(saved.annualIncome, income ? annualAmount(income) : defaults.annualIncome),
    monthlyLivingExpenses: number(saved.monthlyLivingExpenses ?? saved.monthlyExpenditure, expense ? number(expense.monthlyAmount) : defaults.monthlyLivingExpenses),
    assets: active(profile.assets.map(record)) as unknown as typeof defaults.assets,
    liabilities: active(profile.liabilities.map(record)) as unknown as typeof defaults.liabilities,
    goals: active(profile.goals.map(record)) as unknown as typeof defaults.goals,
    sip: { ...defaults.sip, ...record(saved.sip), amount: number(record(saved.sip).amount, sip ? number(sip.monthlyAmount) : defaults.sip.amount) },
    swp: { ...defaults.swp, ...record(saved.swp), monthlyNeedToday: number(record(saved.swp).monthlyNeedToday, swp ? number(swp.monthlyAmount) : defaults.swp.monthlyNeedToday) },
  };
}

function defaultAssumptions(): EngineAssumptions {
  const categories = {
    equity: { mean: 0.135, std: 0.182 }, debt: { mean: 0.065, std: 0.052 }, gold: { mean: 0.136, std: 0.161 },
    realestate: { mean: 0.103, std: 0.18 }, liquid: { mean: 0.055, std: 0.011 }, other: { mean: 0.08, std: 0.18 },
  };
  const keys = Object.keys(categories) as Array<keyof typeof categories>;
  const covariance = {} as EngineAssumptions['covariance'];
  const correlation = {} as EngineAssumptions['correlation'];
  for (const left of keys) {
    covariance[left] = {} as EngineAssumptions['covariance'][typeof left];
    correlation[left] = {} as EngineAssumptions['correlation'][typeof left];
    for (const right of keys) {
      covariance[left][right] = left === right ? categories[left].std ** 2 : categories[left].std * categories[right].std * 0.2;
      correlation[left][right] = left === right ? 1 : 0.2;
    }
  }
  return {
    categories,
    covariance,
    correlation,
    fx: { INR: { mean: 0, std: 0, spotRate: 1 }, USD: { mean: 0, std: 0.1, spotRate: 83.2 }, EUR: { mean: 0, std: 0.1, spotRate: 90.1 }, GBP: { mean: 0, std: 0.1, spotRate: 105.5 } },
    fetchedAt: new Date().toISOString(),
    source: 'default',
  };
}

function toAssumptions(snapshot: JsonObject): EngineAssumptions {
  const candidate = record(snapshot);
  if (candidate.categories && candidate.covariance && candidate.correlation && candidate.fx) {
    return candidate as unknown as EngineAssumptions;
  }
  return defaultAssumptions();
}

function annualIncome(inputs: JsonObject): number {
  const client = record(inputs.client);
  const sources = Array.isArray(client.incomeSources) ? client.incomeSources.map(record) : [];
  if (sources.length > 0) {
    return sources.reduce((total, source) => total + Math.max(0, number(source.amount)) * (source.frequency === 'monthly' ? 12 : 1), 0);
  }
  return Math.max(0, number(inputs.annualIncome));
}

export function calculatePlan(snapshot: JsonObject, assumptionsSnapshot: JsonObject, profile: Profile, seed: string): PlanCalculationResult {
  const inputs = snapshotInputs(snapshot);
  const assets = active(profile.assets.map(record));
  const liabilities = active(profile.liabilities.map(record));
  const investableAssets = assets.reduce((total, item) => total + amount(item), 0);
  const totalLiabilities = liabilities.reduce((total, item) => total + amount(item), 0);
  const netWorth = investableAssets - totalLiabilities;
  const currentAge = number(inputs.currentAge);
  const retirementAge = number(inputs.retirementAge);
  const lifeExpectancy = number(inputs.lifeExpectancy);
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const sip = record(inputs.sip);
  const swp = record(inputs.swp);
  const annualContribution = Math.max(0, number(sip.amount)) * 12;
  const inflation = rate(inputs.inflation, DEFAULT_INFLATION);
  const postRetirementReturn = rate(swp.postRetirementReturn, DEFAULT_RETURN);
  const assumedReturn = rate(sip.equityReturn, DEFAULT_RETURN);
  const annualExpenses = Math.max(0, number(inputs.monthlyLivingExpenses ?? inputs.monthlyExpenditure)) * 12;
  const monthlyNeed = Math.max(0, number(swp.monthlyNeedToday, annualExpenses / 12));
  const retirementYears = Math.max(0, lifeExpectancy - retirementAge);
  const warnings: string[] = [];

  const hasTimeline = currentAge > 0 && retirementAge > currentAge && lifeExpectancy > retirementAge;
  if (!hasTimeline) warnings.push('Set current age, retirement age, and life expectancy to calculate retirement funding.');
  if (monthlyNeed === 0) warnings.push('Add retirement spending or living expenses to calculate the required corpus.');

  const projectedCorpus = hasTimeline
    ? futureValue(Math.max(0, netWorth), annualContribution, assumedReturn, yearsToRetirement)
    : Math.max(0, netWorth);
  const annualNeedAtRetirement = monthlyNeed * 12 * Math.pow(1 + inflation, yearsToRetirement);
  const realReturn = ((1 + postRetirementReturn) / (1 + inflation)) - 1;
  const requiredCorpus = hasTimeline && annualNeedAtRetirement > 0
    ? realReturn > 0
      ? annualNeedAtRetirement * (1 - Math.pow(1 + realReturn, -retirementYears)) / realReturn
      : annualNeedAtRetirement * retirementYears
    : 0;
  const fundingRatio = requiredCorpus > 0 ? projectedCorpus / requiredCorpus : projectedCorpus > 0 ? 1 : 0;
  const engineInputs = toEngineInputs(snapshot, profile);
  const wealthResult = runWealthEngine(engineInputs, toAssumptions(assumptionsSnapshot), undefined, null, seed);
  const retirementSnapshot = wealthResult.snapshots.find((item) => item.age === retirementAge);
  const wealthProjectedCorpus = retirementSnapshot?.total ?? projectedCorpus;
  const wealthFundingRatio = requiredCorpus > 0 ? wealthProjectedCorpus / requiredCorpus : wealthProjectedCorpus > 0 ? 1 : 0;

  return {
    calculationVersion: 'wealth-engine-v1',
    isConfigured: hasTimeline && (investableAssets > 0 || annualContribution > 0),
    netWorth,
    investableAssets,
    totalLiabilities,
    projectedCorpus: Math.round(wealthProjectedCorpus),
    requiredCorpus: Math.round(requiredCorpus),
    fundingRatio: Number(Math.max(0, wealthFundingRatio).toFixed(4)),
    probabilityOfSuccess: wealthResult.isConfigured
      ? wealthResult.monteCarlo.successRate
      : Number(Math.min(1, Math.max(0, fundingRatio)).toFixed(4)),
    annualIncome: annualIncome(inputs),
    annualExpenses,
    yearsToRetirement,
    warnings,
    wealthEngine: {
      terminalValue: wealthResult.terminalValue,
      terminalRealValue: wealthResult.terminalRealValue,
      sustainable: wealthResult.sustainable,
      depletionAge: wealthResult.depletionAge,
      overallGoalSuccessRate: wealthResult.overallGoalSuccessRate,
      monteCarlo: {
        successRate: wealthResult.monteCarlo.successRate,
        medianTerminal: wealthResult.monteCarlo.medianTerminal,
        percentile5: wealthResult.monteCarlo.percentile5,
        percentile95: wealthResult.monteCarlo.percentile95,
        medianDepletionAge: wealthResult.monteCarlo.medianDepletionAge,
        yearlyPercentiles: wealthResult.monteCarlo.yearlyPercentiles,
      },
    },
  };
}
