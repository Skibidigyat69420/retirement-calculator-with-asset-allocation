/**
 * Standalone financial calculator engine.
 *
 * All functions are pure: they take numeric inputs and return results.
 * No React, no side effects, no global state. This is the single source of
 * truth for every calculator in the new Calculators tab.
 */

const round2 = (n: number): number => Math.round(n * 100) / 100;

export interface SIPResult {
  invested: number;
  gained: number;
  total: number;
  yearlyData: { year: number; value: number; invested: number }[];
}

/**
 * SIP with annual step-up, end-of-month contributions.
 *
 * Each month: value = (value + monthlyAmount) * (1 + r)
 * At the end of each year the monthly amount is stepped up.
 */
export function calculateSIP(
  amount: number,
  annualReturn: number,
  years: number,
  stepUp: number,
): SIPResult {
  const r = annualReturn / 100 / 12;
  let value = 0;
  let invested = 0;
  let monthlyAmount = amount;
  const yearlyData: { year: number; value: number; invested: number }[] = [];

  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) {
      invested += monthlyAmount;
      value = (value + monthlyAmount) * (1 + r);
    }
    yearlyData.push({ year: y, value: round2(value), invested: round2(invested) });
    monthlyAmount = monthlyAmount * (1 + stepUp / 100);
  }

  return {
    invested: round2(invested),
    gained: round2(value - invested),
    total: round2(value),
    yearlyData,
  };
}

export interface LumpsumResult {
  total: number;
  gained: number;
  yearlyData: { year: number; value: number }[];
}

/**
 * Compound growth of a one-time investment.
 */
export function calculateLumpsum(
  principal: number,
  annualReturn: number,
  years: number,
): LumpsumResult {
  const r = annualReturn / 100;
  const yearlyData: { year: number; value: number }[] = [];

  for (let y = 1; y <= years; y++) {
    yearlyData.push({ year: y, value: round2(principal * Math.pow(1 + r, y)) });
  }

  const total = principal * Math.pow(1 + r, years);
  return { total: round2(total), gained: round2(total - principal), yearlyData };
}

export interface SWPYearlyData {
  year: number;
  monthlyNeed: number;
  corpusLeft: number;
  withdrawn: number;
}

export interface SWPResult {
  years: number;
  sustainable: boolean;
  depletionYear: number | null;
  totalWithdrawn: number;
  yearlyData: SWPYearlyData[];
}

/**
 * Systematic Withdrawal Plan (corpus sustainability).
 *
 * Withdrawals increase by inflation each year. Tax is applied to the gross
 * annual withdrawal (simplification: tax is treated as an additional drag).
 */
export function calculateSWP(
  corpus: number,
  monthlyWithdrawal: number,
  annualReturn: number,
  inflation: number,
  taxRate: number,
  maxYears = 50,
): SWPResult {
  let currentCorpus = corpus;
  let currentMonthly = monthlyWithdrawal;
  const taxFactor = 1 - taxRate / 100;
  const yearlyData: SWPYearlyData[] = [];
  let depletionYear: number | null = null;
  let totalWithdrawn = 0;

  for (let y = 1; y <= maxYears; y++) {
    const grossAnnual = (currentMonthly * 12) / taxFactor;

    if (currentCorpus <= 0) {
      if (depletionYear === null) depletionYear = y - 1;
      yearlyData.push({ year: y, monthlyNeed: round2(currentMonthly), corpusLeft: 0, withdrawn: 0 });
      break;
    }

    const withdrawn = Math.min(currentCorpus, grossAnnual);
    currentCorpus -= withdrawn;
    totalWithdrawn += withdrawn;

    if (currentCorpus <= 0 && depletionYear === null) {
      depletionYear = y;
    }

    yearlyData.push({
      year: y,
      monthlyNeed: round2(currentMonthly),
      corpusLeft: round2(currentCorpus),
      withdrawn: round2(withdrawn),
    });

    currentCorpus = currentCorpus * (1 + annualReturn / 100);
    currentMonthly = currentMonthly * (1 + inflation / 100);
  }

  return {
    years: depletionYear || maxYears,
    sustainable: depletionYear === null,
    depletionYear,
    totalWithdrawn: round2(totalWithdrawn),
    yearlyData,
  };
}

export interface SustainableSWPResult {
  /** Maximum first-year monthly withdrawal the corpus can sustain. */
  monthlyWithdrawal: number;
  /** Gross first-year withdrawal as a percentage of the corpus. */
  withdrawalRate: number;
}

/**
 * Reverse SWP: the largest level (inflation-indexed) monthly withdrawal a
 * corpus can sustain for `years` distribution years.
 *
 * Closed-form annuity solve on the real return: with withdrawals growing at
 * inflation, only the real return erodes the corpus. Tax is applied to the
 * gross withdrawal, so the net monthly figure divides by (1 − taxRate).
 */
export function calculateSustainableSWP(
  corpus: number,
  annualReturn: number,
  inflation: number,
  taxRate: number,
  years: number,
): SustainableSWPResult {
  if (corpus <= 0 || years <= 0) {
    return { monthlyWithdrawal: 0, withdrawalRate: 0 };
  }
  const realReturn = (1 + annualReturn / 100) / (1 + inflation / 100) - 1;
  const sustainableGrossAnnual =
    realReturn > 0
      ? (corpus * realReturn) / (1 - Math.pow(1 + realReturn, -years))
      : corpus / years;
  const monthlyWithdrawal = (sustainableGrossAnnual * (1 - taxRate / 100)) / 12;
  return {
    monthlyWithdrawal: round2(monthlyWithdrawal),
    withdrawalRate: round2((sustainableGrossAnnual / corpus) * 100),
  };
}

export interface STPResult {
  months: number;
  total: number;
  liquid: number;
  target: number;
}

/**
 * Systematic Transfer Plan.
 *
 * A lumpsum sits in a liquid fund and is transferred monthly into a target
 * portfolio. Simulation stops when the liquid fund is depleted or the cap is
 * reached.
 */
export function calculateSTP(
  lumpsum: number,
  monthlyTransfer: number,
  liquidReturn: number,
  targetReturn: number,
  maxMonths = 360,
): STPResult {
  if (lumpsum <= 0 || monthlyTransfer <= 0) {
    return { months: 0, total: lumpsum, liquid: lumpsum, target: 0 };
  }

  const liqR = liquidReturn / 100 / 12;
  const tgtR = targetReturn / 100 / 12;
  let liquid = lumpsum;
  let target = 0;
  let months = 0;

  while (liquid > 0 && months < maxMonths) {
    months++;
    liquid = liquid * (1 + liqR);
    target = target * (1 + tgtR);
    const transfer = Math.min(liquid, monthlyTransfer);
    liquid -= transfer;
    target += transfer;
  }

  return {
    months,
    total: round2(liquid + target),
    liquid: round2(liquid),
    target: round2(target),
  };
}

export interface GoalResult {
  target: number;
  futureValue: number;
  requiredLumpsum: number;
  requiredSIP: number;
  requiredSIPWithStepUp: number;
}

/**
 * Target corpus / goal planner.
 *
 * Computes the lumpsum required today and the flat monthly SIP required.
 * Also returns the step-up SIP approximation using a growing annuity.
 */
export function calculateGoal(
  target: number,
  years: number,
  annualReturn: number,
  inflation: number,
  stepUp = 0,
): GoalResult {
  const r = annualReturn / 100;
  const rMonthly = r / 12;
  const n = years * 12;

  const futureValue = target * Math.pow(1 + inflation / 100, years);
  const requiredLumpsum = futureValue / Math.pow(1 + r, years);

  // Flat end-of-month SIP.
  const requiredSIP =
    rMonthly === 0
      ? futureValue / n
      : (futureValue * rMonthly) / (Math.pow(1 + rMonthly, n) - 1);

  // Step-up SIP: monthly step-up rate derived from annual step-up.
  const monthlyStep = Math.pow(1 + stepUp / 100, 1 / 12) - 1;
  let denominator = 0;
  for (let k = 0; k < n; k++) {
    denominator += Math.pow(1 + monthlyStep, k) * Math.pow(1 + rMonthly, n - k);
  }
  const requiredSIPWithStepUp = denominator > 0 ? futureValue / denominator : 0;

  return {
    target: round2(target),
    futureValue: round2(futureValue),
    requiredLumpsum: round2(requiredLumpsum),
    requiredSIP: round2(requiredSIP),
    requiredSIPWithStepUp: round2(requiredSIPWithStepUp),
  };
}

export interface RetirementCorpusResult {
  yearsToRetirement: number;
  retirementYears: number;
  monthlyNeedAtRetirement: number;
  annualNeedAtRetirement: number;
  requiredCorpus: number;
  realReturn: number;
  sustainableMonthlyWithdrawal: number;
}

/**
 * Retirement corpus required.
 *
 * Inflates today's monthly need to the retirement date, then capitalises it
 * using the real post-retirement return. If the real return is <= 0 the
 * required corpus is the simple multiple of years * annual need.
 */
export function calculateRetirementCorpus(
  currentAge: number,
  retirementAge: number,
  lifeExpectancy: number,
  monthlyNeedToday: number,
  inflation: number,
  postRetirementReturn: number,
): RetirementCorpusResult {
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);
  const retirementYears = Math.max(0, lifeExpectancy - retirementAge);
  const infl = inflation / 100;
  const postRetR = postRetirementReturn / 100;
  const realReturn = (1 + postRetR) / (1 + infl) - 1;

  const monthlyNeedAtRetirement = monthlyNeedToday * Math.pow(1 + infl, yearsToRetirement);
  const annualNeedAtRetirement = monthlyNeedAtRetirement * 12;

  let requiredCorpus: number;
  if (realReturn <= 0) {
    requiredCorpus = annualNeedAtRetirement * retirementYears;
  } else {
    // Finite-horizon annuity (capital preservation not assumed).
    const annuityFactor =
      (1 - Math.pow(1 + realReturn, -retirementYears)) / realReturn;
    requiredCorpus = annualNeedAtRetirement * annuityFactor;
  }

  // Reverse: given the required corpus, what flat monthly amount could be
  // withdrawn forever at the real return? Useful for sanity-check.
  const sustainableMonthlyWithdrawal =
    realReturn > 0 && requiredCorpus > 0
      ? (requiredCorpus * realReturn) / 12
      : 0;

  return {
    yearsToRetirement,
    retirementYears,
    monthlyNeedAtRetirement: round2(monthlyNeedAtRetirement),
    annualNeedAtRetirement: round2(annualNeedAtRetirement),
    requiredCorpus: round2(requiredCorpus),
    realReturn: round2(realReturn * 100),
    sustainableMonthlyWithdrawal: round2(sustainableMonthlyWithdrawal),
  };
}

export interface EMIResult {
  emi: number;
  totalPayment: number;
  totalInterest: number;
  principal: number;
  yearlyData: { year: number; principalPaid: number; interestPaid: number; balance: number }[];
}

/**
 * Loan EMI calculator with year-by-year amortisation.
 */
export function calculateEMI(
  principal: number,
  annualRate: number,
  years: number,
): EMIResult {
  const r = annualRate / 100 / 12;
  const n = years * 12;

  let emi: number;
  if (r === 0) {
    emi = principal / n;
  } else {
    emi = (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  const totalPayment = emi * n;
  const totalInterest = totalPayment - principal;

  // Yearly amortisation schedule.
  let balance = principal;
  const yearlyData: { year: number; principalPaid: number; interestPaid: number; balance: number }[] = [];

  for (let y = 1; y <= years; y++) {
    let yearlyPrincipal = 0;
    let yearlyInterest = 0;
    for (let m = 0; m < 12 && balance > 0; m++) {
      const interest = balance * r;
      let principalPaid = emi - interest;
      if (principalPaid > balance) principalPaid = balance;
      balance -= principalPaid;
      yearlyPrincipal += principalPaid;
      yearlyInterest += interest;
    }
    yearlyData.push({
      year: y,
      principalPaid: round2(yearlyPrincipal),
      interestPaid: round2(yearlyInterest),
      balance: round2(Math.max(0, balance)),
    });
  }

  return {
    emi: round2(emi),
    totalPayment: round2(totalPayment),
    totalInterest: round2(totalInterest),
    principal: round2(principal),
    yearlyData,
  };
}
