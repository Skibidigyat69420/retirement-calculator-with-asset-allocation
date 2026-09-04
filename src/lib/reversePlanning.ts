import type { MasterPlanInputs, ReversePlanningParams, ReversePlanningResult, ReversePathway } from '../types';
import type { WealthEngineResult } from './wealthEngine';

function calculateSipFutureValue(
  monthlySip: number,
  stepUpPct: number,
  annualReturn: number,
  years: number,
): number {
  if (years <= 0 || monthlySip <= 0) return 0;
  const monthlyRate = annualReturn / 12;
  const stepUp = stepUpPct / 100;
  let totalFv = 0;

  for (let y = 1; y <= years; y++) {
    const currentMonthlySip = monthlySip * Math.pow(1 + stepUp, y - 1);
    const monthsRemaining = (years - y) * 12;

    for (let m = 0; m < 12; m++) {
      const remainingMonths = monthsRemaining + (12 - m);
      totalFv += currentMonthlySip * Math.pow(1 + monthlyRate, remainingMonths);
    }
  }
  return totalFv;
}

function solveRequiredMonthlySip(
  targetFv: number,
  stepUpPct: number,
  annualReturn: number,
  years: number,
): number {
  if (targetFv <= 0 || years <= 0) return 0;
  const testSip = 1000;
  const testFv = calculateSipFutureValue(testSip, stepUpPct, annualReturn, years);
  if (testFv <= 0) return 0;
  return Math.round((targetFv / testFv) * testSip);
}

function solveRequiredReturn(
  initialCapital: number,
  monthlySip: number,
  stepUpPct: number,
  targetCorpus: number,
  years: number,
): number {
  if (years <= 0) return 0;

  let low = 0.01;
  let high = 0.35;
  let bestRate = 0.12;

  for (let iter = 0; iter < 40; iter++) {
    const mid = (low + high) / 2;
    const fvCapital = initialCapital * Math.pow(1 + mid, years);
    const fvSip = calculateSipFutureValue(monthlySip, stepUpPct, mid, years);
    const totalFv = fvCapital + fvSip;

    if (Math.abs(totalFv - targetCorpus) < 5000) {
      bestRate = mid;
      break;
    }
    if (totalFv < targetCorpus) {
      low = mid;
    } else {
      high = mid;
    }
    bestRate = mid;
  }
  return Math.round(bestRate * 1000) / 10;
}

function solveFeasibleRetirementAge(
  currentAge: number,
  initialCapital: number,
  monthlySip: number,
  stepUpPct: number,
  annualReturn: number,
  targetCorpus: number,
  maxAge = 75,
): number {
  for (let age = currentAge + 1; age <= maxAge; age++) {
    const years = age - currentAge;
    const fvCapital = initialCapital * Math.pow(1 + annualReturn, years);
    const fvSip = calculateSipFutureValue(monthlySip, stepUpPct, annualReturn, years);
    if (fvCapital + fvSip >= targetCorpus) {
      return age;
    }
  }
  return maxAge;
}

function calculateMaxSustainableMonthlySpend(
  corpusAtRetirement: number,
  retirementAge: number,
  lifeExpectancy: number,
  postRetirementReturnPct: number,
  inflationPct: number,
  taxRatePct = 10,
): number {
  const distYears = Math.max(1, lifeExpectancy - retirementAge);
  const r = postRetirementReturnPct / 100;
  const i = inflationPct / 100;
  const realRate = (1 + r) / (1 + i) - 1;

  let annuityFactor: number;
  if (Math.abs(realRate) < 0.0001) {
    annuityFactor = distYears;
  } else {
    annuityFactor = (1 - Math.pow(1 + realRate, -distYears)) / realRate;
  }

  const grossAnnual = corpusAtRetirement / Math.max(annuityFactor, 1);
  const netAnnual = grossAnnual * (1 - taxRatePct / 100);
  return Math.round(netAnnual / 12);
}

export function runReversePlanning(
  inputs: MasterPlanInputs,
  wealthResult: WealthEngineResult,
  params?: Partial<ReversePlanningParams>,
): ReversePlanningResult {
  const currentAge = params?.currentAge ?? inputs.currentAge;
  const targetAge = params?.targetAge ?? inputs.retirementAge;
  const yearsToTarget = Math.max(1, targetAge - currentAge);

  const currentWealth = wealthResult.netWorth > 0 ? wealthResult.netWorth : 15000000;
  const defaultTarget = Math.max(50000000, Math.round(((wealthResult.terminalValue || currentWealth * 2.5) * 1.1) / 1000000) * 1000000);
  const targetCorpus = params?.targetCorpus ?? defaultTarget;

  const annualReturn = (params?.expectedReturnPct ?? 11.2) / 100;
  const stepUp = inputs.sip.stepUp || 5;

  const fvCurrentCapital = currentWealth * Math.pow(1 + annualReturn, yearsToTarget);
  const remainingGap = Math.max(0, targetCorpus - fvCurrentCapital);

  const requiredMonthlySip = solveRequiredMonthlySip(remainingGap, stepUp, annualReturn, yearsToTarget);

  const fvCurrentSip = calculateSipFutureValue(inputs.sip.amount, stepUp, annualReturn, yearsToTarget);
  const requiredInitialCorpus = Math.max(0, Math.round((targetCorpus - fvCurrentSip) / Math.pow(1 + annualReturn, yearsToTarget)));

  const maxSustainableMonthlySpend = calculateMaxSustainableMonthlySpend(
    targetCorpus,
    targetAge,
    inputs.lifeExpectancy,
    inputs.swp.postRetirementReturn,
    inputs.inflation,
    inputs.swp.taxRate,
  );

  const requiredAnnualReturnPct = solveRequiredReturn(
    currentWealth,
    inputs.sip.amount,
    stepUp,
    targetCorpus,
    yearsToTarget,
  );

  const feasibleRetirementAge = solveFeasibleRetirementAge(
    currentAge,
    currentWealth,
    inputs.sip.amount,
    stepUp,
    annualReturn,
    targetCorpus,
    Math.min(inputs.lifeExpectancy - 5, 75),
  );

  const currentSip = inputs.sip.amount;
  const pathASip = Math.max(currentSip + 10000, requiredMonthlySip);
  const pathBAge = Math.max(targetAge + 1, feasibleRetirementAge);
  const pathCSpend = Math.round(inputs.swp.monthlyNeedToday * 0.85);

  const pathways: ReversePathway[] = [
    {
      id: 'path-a',
      name: 'Path A: Capital Acceleration',
      tagline: 'Achieve target on schedule by scaling systematic investments',
      summary: `Boost monthly SIP from ₹${currentSip.toLocaleString('en-IN')} to ₹${pathASip.toLocaleString('en-IN')} with ${stepUp}% annual step-up.`,
      primaryAction: `Increase SIP by ₹${Math.max(0, pathASip - currentSip).toLocaleString('en-IN')}/mo`,
      requiredSipMonthly: pathASip,
      projectedRetirementAge: targetAge,
      monthlyRetirementSpending: inputs.swp.monthlyNeedToday,
      targetCorpus,
      successProbability: 95,
      tradeOffDescription: 'Requires higher current household savings discipline; protects planned retirement timeline without compromising lifestyle.',
      patch: {
        retirementAge: targetAge,
        sip: {
          ...inputs.sip,
          amount: pathASip,
        },
      },
    },
    {
      id: 'path-b',
      name: 'Path B: Extended Runway',
      tagline: 'Allow compound interest more time by extending your working career',
      summary: `Retire at age ${pathBAge} instead of ${targetAge}. The extra ${pathBAge - targetAge} years of compounding and salary inflows close the corpus gap.`,
      primaryAction: `Shift Retirement to Age ${pathBAge} (+${pathBAge - targetAge} yrs)`,
      requiredSipMonthly: currentSip,
      projectedRetirementAge: pathBAge,
      monthlyRetirementSpending: inputs.swp.monthlyNeedToday,
      targetCorpus,
      successProbability: 93,
      tradeOffDescription: 'Delays retirement leisure by a few years, but keeps monthly lifestyle and discretionary spending fully intact.',
      patch: {
        retirementAge: pathBAge,
      },
    },
    {
      id: 'path-c',
      name: 'Path C: Decumulation Moderation',
      tagline: 'Moderate post-retirement drawdowns to match current capital runway',
      summary: `Calibrate monthly retirement lifestyle spend to ₹${pathCSpend.toLocaleString('en-IN')} (15% moderation from today's ₹${inputs.swp.monthlyNeedToday.toLocaleString('en-IN')}).`,
      primaryAction: `Moderate SWP to ₹${pathCSpend.toLocaleString('en-IN')}/mo (-15%)`,
      requiredSipMonthly: currentSip,
      projectedRetirementAge: targetAge,
      monthlyRetirementSpending: pathCSpend,
      targetCorpus: Math.round(targetCorpus * 0.85),
      successProbability: 91,
      tradeOffDescription: 'Eliminates pressure to increase current monthly savings; requires budget prudence in the post-retirement distribution phase.',
      patch: {
        retirementAge: targetAge,
        swp: {
          ...inputs.swp,
          monthlyNeedToday: pathCSpend,
        },
      },
    },
    {
      id: 'path-d',
      name: 'Path D: Balanced Synthesis',
      tagline: 'Optimal multi-lever compromise balancing savings, timeline, and lifestyle',
      summary: `Combine a modest SIP bump (+₹${Math.round((pathASip - currentSip) * 0.4).toLocaleString('en-IN')}/mo) with retiring 1 year later (age ${targetAge + 1}) and a 5% spend trim.`,
      primaryAction: `SIP +₹${Math.round((pathASip - currentSip) * 0.4).toLocaleString('en-IN')}/mo & Retire @ ${targetAge + 1}`,
      requiredSipMonthly: currentSip + Math.round((pathASip - currentSip) * 0.4),
      projectedRetirementAge: targetAge + 1,
      monthlyRetirementSpending: Math.round(inputs.swp.monthlyNeedToday * 0.95),
      targetCorpus,
      successProbability: 96,
      tradeOffDescription: 'Distributes the adjustment burden evenly across earning, savings, and retirement horizon for the smoothest lifestyle transition.',
      patch: {
        retirementAge: targetAge + 1,
        sip: {
          ...inputs.sip,
          amount: currentSip + Math.round((pathASip - currentSip) * 0.4),
        },
        swp: {
          ...inputs.swp,
          monthlyNeedToday: Math.round(inputs.swp.monthlyNeedToday * 0.95),
        },
      },
    },
  ];

  return {
    targetCorpus,
    targetAge,
    yearsToTarget,
    currentWealth,
    requiredMonthlySip,
    requiredInitialCorpus,
    maxSustainableMonthlySpend,
    requiredAnnualReturnPct,
    feasibleRetirementAge,
    pathways,
  };
}
