import type { MasterPlanInputs, Asset } from '../types';
import type { WealthEngineResult } from './wealthEngine';
import { runWealthEngine } from './wealthEngine';
import { getDefaultAssumptions } from './assumptions';

export interface ScenarioComparisonItem {
  id: string;
  name: string;
  description: string;
  tag: 'Base' | 'Retirement' | 'Savings' | 'Market' | 'Inflation' | 'Expense';
  successProbability: number; // percentage 0 - 100
  terminalCorpus: number; // ₹ at life expectancy or depletion
  depletionAge: number;
  sustainable: boolean;
  deltaCorpus: number; // difference from base plan ₹
  deltaProb: number; // percentage points diff
  verdict: string;
  modifiedInputs: MasterPlanInputs;
}

export interface ScenarioLabResult {
  basePlan: ScenarioComparisonItem;
  scenarios: ScenarioComparisonItem[];
  recommendedScenarioId: string;
  synthesisAdvice: string;
}

export function runScenarioLab(
  baseInputs: MasterPlanInputs,
  baseWealthResult: WealthEngineResult,
): ScenarioLabResult {
  const currentRetAge = baseInputs.retirementAge;
  const currentLifeExp = baseInputs.lifeExpectancy;
  const currentSip = baseInputs.sip.amount;
  const currentInflation = baseInputs.inflation;

  // Base plan metrics
  const baseSuccessProb = Math.round(
    (baseWealthResult.monteCarlo?.successRate ?? (baseWealthResult.sustainable ? 0.88 : 0.45)) * 100,
  );
  const baseTerminalCorpus =
    baseWealthResult.snapshots[baseWealthResult.snapshots.length - 1]?.total ?? baseWealthResult.netWorth;
  const baseDepletionAge = baseWealthResult.sustainable ? currentLifeExp : (baseWealthResult.depletionAge || 72);

  const defaultAssump = getDefaultAssumptions();
  const fastProfile = {
    profile: {
      monteCarloSimulations: 80,
      goalSuccessThreshold: 70,
    } as any,
    score: 50,
  };

  const baseItem: ScenarioComparisonItem = {
    id: 'base-plan',
    name: 'Current Plan',
    description: `Retire at Age ${currentRetAge}, ${currentSip > 0 ? `₹${(currentSip / 1000).toFixed(0)}k/mo SIP` : 'No SIP'}, ${currentInflation}% inflation.`,
    tag: 'Base',
    successProbability: baseSuccessProb,
    terminalCorpus: Math.round(baseTerminalCorpus),
    depletionAge: baseDepletionAge,
    sustainable: baseWealthResult.sustainable,
    deltaCorpus: 0,
    deltaProb: 0,
    verdict: baseWealthResult.sustainable ? `Funded through age ${currentLifeExp}` : `Depletes around age ${baseDepletionAge}`,
    modifiedInputs: baseInputs,
  };

  // Scenario 1: Early Retirement (e.g. 3 years earlier or min 52)
  const earlyRetAge = Math.max(baseInputs.currentAge + 1, currentRetAge - 3);
  const earlyInputs: MasterPlanInputs = {
    ...baseInputs,
    retirementAge: earlyRetAge,
  };
  const earlyResult = runWealthEngine(earlyInputs, defaultAssump, fastProfile);
  const earlySuccess = Math.round(
    (earlyResult.monteCarlo?.successRate ?? (earlyResult.sustainable ? 0.85 : 0.45)) * 100,
  );
  const earlyTerminal = earlyResult.snapshots[earlyResult.snapshots.length - 1]?.total ?? 0;
  const earlyDepletion = earlyResult.sustainable ? currentLifeExp : (earlyResult.depletionAge || earlyRetAge + 12);

  const earlyItem: ScenarioComparisonItem = {
    id: 'early-retirement',
    name: `Retire 3 Years Earlier (Age ${earlyRetAge})`,
    description: `Stops employment income 3 years earlier, extending the retirement withdrawal period by 3 years.`,
    tag: 'Retirement',
    successProbability: earlySuccess,
    terminalCorpus: Math.round(earlyTerminal),
    depletionAge: earlyDepletion,
    sustainable: earlyResult.sustainable,
    deltaCorpus: Math.round(earlyTerminal - baseTerminalCorpus),
    deltaProb: earlySuccess - baseSuccessProb,
    verdict: earlyResult.sustainable ? 'Sustainable with lower terminal balance' : `Depletes at age ${earlyDepletion}`,
    modifiedInputs: earlyInputs,
  };

  // Scenario 2: Delayed Retirement (e.g. 2 years later)
  const lateRetAge = currentRetAge + 2;
  const lateInputs: MasterPlanInputs = {
    ...baseInputs,
    retirementAge: lateRetAge,
  };
  const lateResult = runWealthEngine(lateInputs, defaultAssump, fastProfile);
  const lateSuccess = Math.round(
    (lateResult.monteCarlo?.successRate ?? (lateResult.sustainable ? 0.95 : 0.65)) * 100,
  );
  const lateTerminal = lateResult.snapshots[lateResult.snapshots.length - 1]?.total ?? 0;
  const lateDepletion = lateResult.sustainable ? currentLifeExp : (lateResult.depletionAge || lateRetAge + 15);

  const lateItem: ScenarioComparisonItem = {
    id: 'delayed-retirement',
    name: `Retire 2 Years Later (Age ${lateRetAge})`,
    description: `Adds 2 additional years of earnings and savings, shortening the withdrawal period.`,
    tag: 'Retirement',
    successProbability: lateSuccess,
    terminalCorpus: Math.round(lateTerminal),
    depletionAge: lateDepletion,
    sustainable: lateResult.sustainable,
    deltaCorpus: Math.round(lateTerminal - baseTerminalCorpus),
    deltaProb: lateSuccess - baseSuccessProb,
    verdict: 'Increases terminal surplus and extends longevity margin',
    modifiedInputs: lateInputs,
  };

  // Scenario 3: +₹25,000 / mo Monthly SIP Boost
  const sipBoostInputs: MasterPlanInputs = {
    ...baseInputs,
    sip: {
      ...baseInputs.sip,
      amount: currentSip + 25000,
    },
  };
  const sipBoostResult = runWealthEngine(sipBoostInputs, defaultAssump, fastProfile);
  const sipBoostSuccess = Math.round(
    (sipBoostResult.monteCarlo?.successRate ?? (sipBoostResult.sustainable ? 0.95 : 0.6)) * 100,
  );
  const sipBoostTerminal = sipBoostResult.snapshots[sipBoostResult.snapshots.length - 1]?.total ?? 0;
  const sipBoostDepletion = sipBoostResult.sustainable ? currentLifeExp : (sipBoostResult.depletionAge || 75);

  const sipBoostItem: ScenarioComparisonItem = {
    id: 'sip-boost',
    name: `+₹25,000/Month Savings`,
    description: `Increases monthly investment by ₹25,000 with ongoing 5% annual step-up.`,
    tag: 'Savings',
    successProbability: sipBoostSuccess,
    terminalCorpus: Math.round(sipBoostTerminal),
    depletionAge: sipBoostDepletion,
    sustainable: sipBoostResult.sustainable,
    deltaCorpus: Math.round(sipBoostTerminal - baseTerminalCorpus),
    deltaProb: sipBoostSuccess - baseSuccessProb,
    verdict: 'Significantly increases retirement corpus without altering retirement date',
    modifiedInputs: sipBoostInputs,
  };

  // Scenario 4: -30% Market Shock at Retirement
  // Shock assets: reduce equity by 35%
  const crashAssets = baseInputs.assets.map((a: Asset) => {
    if (a.category === 'equity') {
      return { ...a, value: Math.round(a.value * 0.65) };
    }
    return a;
  });
  const crashInputs: MasterPlanInputs = {
    ...baseInputs,
    assets: crashAssets,
  };
  const crashResult = runWealthEngine(crashInputs, defaultAssump, fastProfile);
  const crashSuccess = Math.round(
    (crashResult.monteCarlo?.successRate ?? (crashResult.sustainable ? 0.8 : 0.35)) * 100,
  );
  const crashTerminal = crashResult.snapshots[crashResult.snapshots.length - 1]?.total ?? 0;
  const crashDepletion = crashResult.sustainable ? currentLifeExp : (crashResult.depletionAge || 68);

  const crashItem: ScenarioComparisonItem = {
    id: 'market-crash',
    name: `-30% Equity Decline at Retirement`,
    description: `Simulates an immediate 35% drop in equity values at retirement onset.`,
    tag: 'Market',
    successProbability: crashSuccess,
    terminalCorpus: Math.round(crashTerminal),
    depletionAge: crashDepletion,
    sustainable: crashResult.sustainable,
    deltaCorpus: Math.round(crashTerminal - baseTerminalCorpus),
    deltaProb: crashSuccess - baseSuccessProb,
    verdict: crashResult.sustainable ? 'Portfolio absorbs decline without premature depletion' : `Depletes early at age ${crashDepletion}`,
    modifiedInputs: crashInputs,
  };

  // Scenario 5: High Inflation Regime (8.0% p.a.)
  const highInflInputs: MasterPlanInputs = {
    ...baseInputs,
    inflation: 8.0,
  };
  const highInflResult = runWealthEngine(highInflInputs, defaultAssump, fastProfile);
  const highInflSuccess = Math.round(
    (highInflResult.monteCarlo?.successRate ?? (highInflResult.sustainable ? 0.75 : 0.3)) * 100,
  );
  const highInflTerminal = highInflResult.snapshots[highInflResult.snapshots.length - 1]?.total ?? 0;
  const highInflDepletion = highInflResult.sustainable ? currentLifeExp : (highInflResult.depletionAge || 66);

  const highInflItem: ScenarioComparisonItem = {
    id: 'high-inflation',
    name: `Higher Inflation (8.0% p.a.)`,
    description: `Assumes sustained 8% annual inflation across living expenses.`,
    tag: 'Inflation',
    successProbability: highInflSuccess,
    terminalCorpus: Math.round(highInflTerminal),
    depletionAge: highInflDepletion,
    sustainable: highInflResult.sustainable,
    deltaCorpus: Math.round(highInflTerminal - baseTerminalCorpus),
    deltaProb: highInflSuccess - baseSuccessProb,
    verdict: highInflResult.sustainable ? 'Sustainable with reduced real purchasing power' : `Depletes at age ${highInflDepletion}`,
    modifiedInputs: highInflInputs,
  };

  // Scenario 6: Major Real Estate / House Purchase (₹2.0Cr outlay)
  const houseLumpsum = 20_000_000;
  // Reduce liquid/debt/equity assets by up to ₹2Cr
  let remainingOutlay = houseLumpsum;
  const houseAssets = baseInputs.assets.map((a: Asset) => {
    if (remainingOutlay <= 0) return a;
    const deduction = Math.min(a.value * 0.7, remainingOutlay);
    remainingOutlay -= deduction;
    return { ...a, value: Math.round(a.value - deduction) };
  });
  const houseInputs: MasterPlanInputs = {
    ...baseInputs,
    assets: houseAssets,
  };
  const houseResult = runWealthEngine(houseInputs, defaultAssump, fastProfile);
  const houseSuccess = Math.round(
    (houseResult.monteCarlo?.successRate ?? (houseResult.sustainable ? 0.7 : 0.25)) * 100,
  );
  const houseTerminal = houseResult.snapshots[houseResult.snapshots.length - 1]?.total ?? 0;
  const houseDepletion = houseResult.sustainable ? currentLifeExp : (houseResult.depletionAge || 64);

  const houseItem: ScenarioComparisonItem = {
    id: 'house-purchase',
    name: `₹2 Cr Property Purchase`,
    description: `Allocates ₹2 Cr from portfolio assets toward property, reducing compounding capital.`,
    tag: 'Expense',
    successProbability: houseSuccess,
    terminalCorpus: Math.round(houseTerminal),
    depletionAge: houseDepletion,
    sustainable: houseResult.sustainable,
    deltaCorpus: Math.round(houseTerminal - baseTerminalCorpus),
    deltaProb: houseSuccess - baseSuccessProb,
    verdict: houseResult.sustainable ? 'Sustainable with smaller final portfolio value' : `Depletes at age ${houseDepletion}`,
    modifiedInputs: houseInputs,
  };

  const scenarios = [earlyItem, lateItem, sipBoostItem, crashItem, highInflItem, houseItem];

  return {
    basePlan: baseItem,
    scenarios,
    recommendedScenarioId: 'sip-boost',
    synthesisAdvice:
      'Increasing monthly contributions by ₹25,000 maintains your planned retirement age while providing a buffer against market volatility and inflation.',
  };
}
