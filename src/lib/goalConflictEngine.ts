import type { MasterPlanInputs, Goal } from '../types';
import type { WealthEngineResult } from './wealthEngine';
import { formatCurrencyCompact } from './formatters';

export interface EvaluatedGoalDemand {
  id: string;
  name: string;
  category: string;
  targetYear: number;
  yearsAway: number;
  costToday: number;
  futureCost: number; // indexed to inflation
  priorityRank: number; // 1 = highest
  fundedStatus: 'Fully Funded' | 'Partially Funded' | 'Unfunded / At Risk';
  allocatedWealth: number;
  shortfall: number;
  coveragePercent: number;
}

export interface WaterfallStep {
  id: string;
  name: string;
  monthlyAmount: number;
  percentageOfSurplus: number;
  reason: string;
  color: string;
}

export interface GoalConflictResult {
  totalGoalsDemand: number;
  retirementDemand: number;
  totalHouseholdDemand: number;
  projectedAvailableWealth: number;
  netSurplusOrDeficit: number;
  isFullyFunded: boolean;
  evaluatedGoals: EvaluatedGoalDemand[];
  fundingWaterfall: WaterfallStep[];
  tradeOffSummary: string;
}

export function evaluateGoalConflicts(
  inputs: MasterPlanInputs,
  wealthResult: WealthEngineResult,
  customPriorities?: Record<string, number>, // goalId -> priorityRank
): GoalConflictResult {
  const currentAge = inputs.currentAge;
  const inflation = inputs.inflation / 100;

  // 1. Retirement Demand
  // Required retirement corpus at retirement age
  const yearsToRet = Math.max(1, inputs.retirementAge - currentAge);
  const futureMonthlyNeed = inputs.swp.monthlyNeedToday * Math.pow(1 + inflation, yearsToRet);
  const postRetReturn = inputs.swp.postRetirementReturn / 100;
  const realPostRetReturn = (1 + postRetReturn) / (1 + inflation) - 1;
  const distYears = Math.max(1, inputs.lifeExpectancy - inputs.retirementAge);

  // Present value of annuity for post-retirement
  const annualGross = (futureMonthlyNeed * 12) / (1 - inputs.swp.taxRate / 100);
  const retirementDemand =
    realPostRetReturn > 0
      ? annualGross * ((1 - Math.pow(1 + realPostRetReturn, -distYears)) / realPostRetReturn)
      : annualGross * distYears;

  // 2. Goal Demands
  const goals = inputs.goals || [];
  const evaluatedGoals: EvaluatedGoalDemand[] = goals.map((g: Goal, idx: number) => {
    const targetCost = g.targetAmount || 1000000;
    const yearsAway = g.yearsToGoal ?? 5;
    const catInfl = g.inflation ? g.inflation / 100 : inflation;
    const futureCost = g.futureValue || Math.round(targetCost * Math.pow(1 + catInfl, yearsAway));
    const targetYear = new Date().getFullYear() + yearsAway;
    const priorityRank = customPriorities?.[g.id] ?? (idx + 1);

    return {
      id: g.id,
      name: g.name,
      category: g.priority || 'essential',
      targetYear,
      yearsAway,
      costToday: targetCost,
      futureCost,
      priorityRank,
      fundedStatus: 'Fully Funded',
      allocatedWealth: 0,
      shortfall: 0,
      coveragePercent: 100,
    };
  });

  // Sort goals by priority rank (1 is highest priority)
  evaluatedGoals.sort((a, b) => a.priorityRank - b.priorityRank);

  const totalGoalsDemand = evaluatedGoals.reduce((s, g) => s + g.futureCost, 0);
  const totalHouseholdDemand = Math.round(retirementDemand + totalGoalsDemand);

  // Available wealth is net worth compounding + total cumulative savings capacity
  const projectedAvailableWealth = Math.round(
    wealthResult.snapshots[wealthResult.snapshots.length - 1]?.total || wealthResult.netWorth * 1.8,
  );
  const netSurplusOrDeficit = projectedAvailableWealth - totalHouseholdDemand;
  const isFullyFunded = netSurplusOrDeficit >= 0;

  // Distribute available wealth down priority list: Retirement first, then Goal 1, Goal 2...
  let remainingWealth = projectedAvailableWealth;

  // Retirement takes priority
  const retFunded = Math.min(remainingWealth, retirementDemand);
  remainingWealth = Math.max(0, remainingWealth - retFunded);

  // Then goals in priority order
  evaluatedGoals.forEach((g) => {
    if (remainingWealth >= g.futureCost) {
      g.allocatedWealth = g.futureCost;
      g.shortfall = 0;
      g.coveragePercent = 100;
      g.fundedStatus = 'Fully Funded';
      remainingWealth -= g.futureCost;
    } else if (remainingWealth > 0) {
      g.allocatedWealth = Math.round(remainingWealth);
      g.shortfall = Math.round(g.futureCost - remainingWealth);
      g.coveragePercent = Math.round((remainingWealth / g.futureCost) * 100);
      g.fundedStatus = 'Partially Funded';
      remainingWealth = 0;
    } else {
      g.allocatedWealth = 0;
      g.shortfall = g.futureCost;
      g.coveragePercent = 0;
      g.fundedStatus = 'Unfunded / At Risk';
    }
  });

  // 3. Household Surplus Funding Waterfall
  // Total monthly surplus = (Annual income / 12) - baseline living expense
  const monthlyInflow = inputs.annualIncome > 0 ? inputs.annualIncome / 12 : 250000;
  const monthlyExpense = inputs.swp.monthlyNeedToday || monthlyInflow * 0.5;
  const monthlySurplus = Math.max(25000, monthlyInflow - monthlyExpense);

  const waterfall: WaterfallStep[] = [];
  let allocatedSurplus = 0;

  // Step 1: Emergency Reserve Buffer (15% of surplus until buffer complete)
  const emergencyAmount = Math.round(monthlySurplus * 0.15);
  allocatedSurplus += emergencyAmount;
  waterfall.push({
    id: 'wf-emergency',
    name: 'Emergency Reserve Top-up',
    monthlyAmount: emergencyAmount,
    percentageOfSurplus: 15,
    reason: 'Maintains 6 months of household cash buffer in liquid/overnight funds',
    color: '#06b6d4',
  });

  // Step 2: Children Education / High-Priority Goal SIP
  const educationAmount = Math.round(monthlySurplus * 0.25);
  allocatedSurplus += educationAmount;
  waterfall.push({
    id: 'wf-goals',
    name: 'Priority Goals SIP',
    monthlyAmount: educationAmount,
    percentageOfSurplus: 25,
    reason: 'Dedicated inflation-indexed SIP ringfenced for higher education / key goals',
    color: '#8b5cf6',
  });

  // Step 3: Core Retirement Compounding SIP
  const retirementSipAmount = Math.round(monthlySurplus * 0.45);
  allocatedSurplus += retirementSipAmount;
  waterfall.push({
    id: 'wf-retirement',
    name: 'Core Retirement SIP',
    monthlyAmount: retirementSipAmount,
    percentageOfSurplus: 45,
    reason: 'Primary wealth compounding engine targeted at terminal retirement corpus',
    color: '#3b82f6',
  });

  // Step 4: Discretionary Wealth Creation Surplus
  const discretionaryAmount = Math.max(0, monthlySurplus - allocatedSurplus);
  waterfall.push({
    id: 'wf-wealth',
    name: 'Discretionary Wealth Growth',
    monthlyAmount: discretionaryAmount,
    percentageOfSurplus: Math.round((discretionaryAmount / monthlySurplus) * 100),
    reason: 'Tactical alpha investments, real estate equity, or accelerated debt prepayment',
    color: '#10b981',
  });

  let tradeOffSummary = 'All household goals and retirement corpus are fully funded with a projected surplus.';
  if (!isFullyFunded) {
    const unfundedGoals = evaluatedGoals.filter((g) => g.fundedStatus !== 'Fully Funded');
    tradeOffSummary = `Funding deficit of ${formatCurrencyCompact(Math.abs(netSurplusOrDeficit))} detected. ${unfundedGoals.map((g) => `${g.name} (${g.coveragePercent}% funded)`).join(', ')} require SIP adjustments or delayed horizon.`;
  }

  return {
    totalGoalsDemand,
    retirementDemand: Math.round(retirementDemand),
    totalHouseholdDemand,
    projectedAvailableWealth,
    netSurplusOrDeficit,
    isFullyFunded,
    evaluatedGoals,
    fundingWaterfall: waterfall,
    tradeOffSummary,
  };
}
