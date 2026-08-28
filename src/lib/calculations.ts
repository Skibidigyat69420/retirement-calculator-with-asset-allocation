import type {
  Asset,
  AssetCategory,
  MasterPlanInputs,
  MasterPlanResult,
  SIPConfig,
  STPConfig,
  YearlySnapshot,
} from '../types';

const round2 = (n: number) => Math.round(n * 100) / 100;

export const calculateSIPMonthly = (
  principal: number,
  annualRate: number,
  months: number,
  monthlyContribution: number,
): number => {
  const r = annualRate / 100 / 12;
  if (r === 0) return principal + monthlyContribution * months;
  const futureValuePrincipal = principal * Math.pow(1 + r, months);
  const futureValueContributions =
    monthlyContribution * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
  return futureValuePrincipal + futureValueContributions;
};

export const calculateSIPYearly = (
  sip: SIPConfig,
  years: number,
  startingEquity = 0,
  startingDebt = 0,
): { equity: number; debt: number; totalInvested: number } => {
  let equity = startingEquity;
  let debt = startingDebt;
  let monthlySip = sip.amount;
  let totalInvested = 0;

  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) {
      const eqContribution = monthlySip * (sip.equitySplit / 100);
      const debtContribution = monthlySip * (sip.debtSplit / 100);
      totalInvested += monthlySip;

      equity = (equity + eqContribution) * (1 + sip.equityReturn / 100 / 12);
      debt = (debt + debtContribution) * (1 + sip.debtReturn / 100 / 12);
    }
    monthlySip = monthlySip * (1 + sip.stepUp / 100);
  }

  return { equity, debt, totalInvested };
};

export const calculateSTP = (
  stp: STPConfig,
  months: number,
): { equity: number; debt: number; liquid: number } => {
  if (!stp.active || stp.lumpsum <= 0) {
    return { equity: 0, debt: 0, liquid: 0 };
  }

  const liqR = stp.liquidReturn / 100 / 12;
  const eqR = 12 / 100 / 12; // placeholder; caller overrides by blending with SIP returns
  const debtR = 8 / 100 / 12;

  let liquid = stp.lumpsum;
  let equity = 0;
  let debt = 0;

  for (let m = 0; m < months; m++) {
    liquid = liquid * (1 + liqR);
    equity = equity * (1 + eqR);
    debt = debt * (1 + debtR);

    const transfer = Math.min(liquid, stp.monthlyTransfer);
    const eqTransfer = transfer * (stp.equitySplit / 100);
    const debtTransfer = transfer * (stp.debtSplit / 100);

    liquid -= transfer;
    equity += eqTransfer;
    debt += debtTransfer;
  }

  return { equity, debt, liquid };
};

export const calculateSTPWithReturns = (
  stp: STPConfig,
  months: number,
  equityReturn: number,
  debtReturn: number,
): { equity: number; debt: number; liquid: number } => {
  if (!stp.active || stp.lumpsum <= 0) {
    return { equity: 0, debt: 0, liquid: 0 };
  }

  const liqR = stp.liquidReturn / 100 / 12;
  const eqR = equityReturn / 100 / 12;
  const debtR = debtReturn / 100 / 12;

  let liquid = stp.lumpsum;
  let equity = 0;
  let debt = 0;

  for (let m = 0; m < months; m++) {
    liquid = liquid * (1 + liqR);
    equity = equity * (1 + eqR);
    debt = debt * (1 + debtR);

    const transfer = Math.min(liquid, stp.monthlyTransfer);
    const eqTransfer = transfer * (stp.equitySplit / 100);
    const debtTransfer = transfer * (stp.debtSplit / 100);

    liquid -= transfer;
    equity += eqTransfer;
    debt += debtTransfer;
  }

  return { equity, debt, liquid };
};

export const calculateSTPStandalone = (
  lumpsum: number,
  monthlyTransfer: number,
  liquidReturn: number,
  targetReturn: number,
  maxMonths = 360,
): { months: number; total: number; liquid: number; target: number } => {
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

  return { months, total: liquid + target, liquid, target };
};

export const growAssetsAnnually = (
  assets: Asset[],
): Record<AssetCategory, number> => {
  const grown: Record<AssetCategory, number> = {
    equity: 0,
    debt: 0,
    gold: 0,
    realestate: 0,
    liquid: 0,
    other: 0,
  };

  assets.forEach((asset) => {
    grown[asset.category] += asset.value * (1 + asset.returnRate / 100);
  });

  return grown;
};

export const sumAssetsByCategory = (
  assets: Asset[],
): Record<AssetCategory, number> => {
  const sums: Record<AssetCategory, number> = {
    equity: 0,
    debt: 0,
    gold: 0,
    realestate: 0,
    liquid: 0,
    other: 0,
  };
  assets.forEach((asset) => {
    sums[asset.category] += asset.value;
  });
  return sums;
};

export const calculateCAGR = (
  start: number,
  end: number,
  years: number,
): number => {
  if (start <= 0 || years <= 0) return 0;
  return (Math.pow(end / start, 1 / years) - 1) * 100;
};

export const calculateMasterPlan = (
  inputs: MasterPlanInputs,
): MasterPlanResult => {
  const {
    currentAge,
    retirementAge,
    lifeExpectancy,
    inflation,
    assets,
    sip,
    stp,
    swp,
  } = inputs;

  const accYears = Math.max(0, retirementAge - currentAge);
  const distYears = Math.max(0, lifeExpectancy - retirementAge);
  const infl = inflation / 100;

  const snapshots: YearlySnapshot[] = [];
  let totalInvested = 0;

  // Initial snapshot (today)
  const initialByCat = sumAssetsByCategory(assets);
  const initialNominal = Object.values(initialByCat).reduce((a, b) => a + b, 0);

  snapshots.push({
    year: 0,
    age: currentAge,
    equity: initialByCat.equity,
    debt: initialByCat.debt,
    gold: initialByCat.gold,
    realEstate: initialByCat.realestate,
    liquid: initialByCat.liquid,
    other: initialByCat.other,
    nominal: initialNominal,
    real: initialNominal,
    totalInvested: 0,
    phase: 'accumulation',
  });

  // Running state
  let currentAssets = assets.map((a) => ({ ...a }));
  let equity = 0;
  let debt = 0;
  let liquid = 0;
  let sipEquity = 0;
  let sipDebt = 0;

  // Accumulation phase
  for (let y = 1; y <= accYears; y++) {
    // 1. Grow existing assets annually
    currentAssets = currentAssets.map((a) => ({
      ...a,
      value: a.value * (1 + a.returnRate / 100),
    }));

    // 2. STP deployment for one year
    if (stp.active && stp.lumpsum > 0) {
      const stpResult = calculateSTPWithReturns(
        stp,
        12,
        sip.equityReturn,
        sip.debtReturn,
      );
      equity += stpResult.equity;
      debt += stpResult.debt;
      liquid += stpResult.liquid;
    }

    // 3. SIP for one year
    const yearlySip = calculateSIPYearly(sip, 1, sipEquity, sipDebt);
    sipEquity = yearlySip.equity;
    sipDebt = yearlySip.debt;
    totalInvested += yearlySip.totalInvested;

    // 4. Sweep excess liquid above cap into equity/debt if STP has leftover
    if (liquid > stp.liquidCap && stp.active) {
      const excess = liquid - stp.liquidCap;
      liquid = stp.liquidCap;
      equity += excess * (stp.equitySplit / 100);
      debt += excess * (stp.debtSplit / 100);
    }

    // 5. Combine asset categories
    const byCat = sumAssetsByCategory(currentAssets);
    byCat.equity += equity + sipEquity;
    byCat.debt += debt + sipDebt;
    byCat.liquid += liquid;

    const nominal = Object.values(byCat).reduce((a, b) => a + b, 0);

    snapshots.push({
      year: y,
      age: currentAge + y,
      equity: round2(byCat.equity),
      debt: round2(byCat.debt),
      gold: round2(byCat.gold),
      realEstate: round2(byCat.realestate),
      liquid: round2(byCat.liquid),
      other: round2(byCat.other),
      nominal: round2(nominal),
      real: round2(nominal / Math.pow(1 + infl, y)),
      totalInvested: round2(totalInvested),
      phase: 'accumulation',
    });
  }

  // Terminal corpus calculation
  const terminalSnapshot = snapshots[snapshots.length - 1];
  let swpCorpus =
    terminalSnapshot.equity +
    terminalSnapshot.debt +
    terminalSnapshot.liquid +
    terminalSnapshot.other;

  // Liquidate flagged assets into SWP corpus
  const retainedAssets: Asset[] = [];
  currentAssets.forEach((asset) => {
    if (asset.liquidateAtRetirement) {
      swpCorpus += asset.value;
    } else {
      retainedAssets.push(asset);
    }
  });

  const terminalCorpusNominal = swpCorpus;
  const terminalCorpusReal = terminalCorpusNominal / Math.pow(1 + infl, accYears);

  // Distribution phase
  let corpusLeft = swpCorpus;
  let monthlyNeed = swp.monthlyNeedToday * Math.pow(1 + infl, accYears);
  let depletionAge: number | null = null;
  const postRetR = swp.postRetirementReturn / 100;
  const taxFactor = 1 - swp.taxRate / 100;

  for (let y = 1; y <= distYears; y++) {
    const grossAnnualNeed = (monthlyNeed * 12) / taxFactor;
    const actualWithdrawal = Math.min(corpusLeft, grossAnnualNeed);
    corpusLeft -= actualWithdrawal;

    if (corpusLeft <= 0 && depletionAge === null) {
      depletionAge = retirementAge + y - 1;
      corpusLeft = 0;
    }

    corpusLeft = corpusLeft * (1 + postRetR);

    // Grow retained assets
    retainedAssets.forEach(
      (asset) => (asset.value = asset.value * (1 + asset.returnRate / 100)),
    );
    const retainedValue = retainedAssets.reduce((a, b) => a + b.value, 0);

    const totalNominal = corpusLeft + retainedValue;
    const totalReal = totalNominal / Math.pow(1 + infl, accYears + y);

    snapshots.push({
      year: accYears + y,
      age: retirementAge + y,
      equity: 0,
      debt: 0,
      gold: 0,
      realEstate: 0,
      liquid: round2(corpusLeft),
      other: round2(retainedValue),
      nominal: round2(totalNominal),
      real: round2(totalReal),
      monthlyNeed: round2(monthlyNeed),
      annualWithdrawal: round2(actualWithdrawal),
      corpusLeft: round2(corpusLeft),
      phase: 'distribution',
    });

    monthlyNeed = monthlyNeed * (1 + infl);
  }

  const cagrNominal = calculateCAGR(
    initialNominal,
    terminalCorpusNominal,
    accYears || 1,
  );
  const cagrReal = calculateCAGR(
    initialNominal,
    terminalCorpusReal,
    accYears || 1,
  );

  const sustainable =
    depletionAge === null || (depletionAge !== null && depletionAge > lifeExpectancy);

  return {
    snapshots,
    terminalCorpusNominal: round2(terminalCorpusNominal),
    terminalCorpusReal: round2(terminalCorpusReal),
    cagrNominal: round2(cagrNominal),
    cagrReal: round2(cagrReal),
    depletionAge,
    sustainable,
    totalInvested: round2(totalInvested),
    monthlyNeedAtRetirement: round2(
      swp.monthlyNeedToday * Math.pow(1 + infl, accYears),
    ),
  };
};

export const calculateSIPStandalone = (
  amount: number,
  returnRate: number,
  years: number,
  stepUp: number,
): { invested: number; gained: number; total: number; monthlyData: { month: number; value: number }[] } => {
  let invested = 0;
  let value = 0;
  let monthlyAmount = amount;
  const monthlyData: { month: number; value: number }[] = [];
  let monthCount = 0;

  for (let y = 0; y < years; y++) {
    for (let m = 0; m < 12; m++) {
      invested += monthlyAmount;
      value = (value + monthlyAmount) * (1 + returnRate / 100 / 12);
      monthCount++;
      if (monthCount % 12 === 0 || monthCount === years * 12) {
        monthlyData.push({ month: monthCount, value: round2(value) });
      }
    }
    monthlyAmount = monthlyAmount * (1 + stepUp / 100);
  }

  return { invested: round2(invested), gained: round2(value - invested), total: round2(value), monthlyData };
};

export const calculateSWPStandalone = (
  corpus: number,
  monthlyWithdrawal: number,
  returnRate: number,
  inflation: number,
  taxRate: number,
  maxYears = 50,
): {
  years: number;
  sustainable: boolean;
  depletionYear: number | null;
  yearlyData: { year: number; age: number; monthlyNeed: number; corpusLeft: number }[];
} => {
  let currentCorpus = corpus;
  let currentMonthly = monthlyWithdrawal;
  const taxFactor = 1 - taxRate / 100;
  const yearlyData: { year: number; age: number; monthlyNeed: number; corpusLeft: number }[] = [];
  let depletionYear: number | null = null;

  for (let y = 1; y <= maxYears; y++) {
    const grossAnnual = (currentMonthly * 12) / taxFactor;
    currentCorpus -= grossAnnual;
    if (currentCorpus <= 0) {
      currentCorpus = 0;
      if (depletionYear === null) depletionYear = y;
      yearlyData.push({ year: y, age: 0, monthlyNeed: round2(currentMonthly), corpusLeft: 0 });
      break;
    }
    currentCorpus = currentCorpus * (1 + returnRate / 100);
    yearlyData.push({ year: y, age: 0, monthlyNeed: round2(currentMonthly), corpusLeft: round2(currentCorpus) });
    currentMonthly = currentMonthly * (1 + inflation / 100);
  }

  return {
    years: depletionYear || maxYears,
    sustainable: depletionYear === null,
    depletionYear,
    yearlyData,
  };
};

export const requiredSIPForGoal = (
  target: number,
  years: number,
  returnRate: number,
  stepUp: number,
): number => {
  const r = returnRate / 100 / 12;
  const n = years * 12;
  // Approximate using growing annuity; solve for first month SIP
  // FV of step-up SIP: P * sum_{k=0}^{n-1} (1+g)^k * (1+r)^{n-k}
  // where g is monthly step-up rate
  const annualStep = stepUp / 100;
  const monthlyStep = Math.pow(1 + annualStep, 1 / 12) - 1;

  let denominator = 0;
  for (let k = 0; k < n; k++) {
    denominator +=
      Math.pow(1 + monthlyStep, k) * Math.pow(1 + r, n - k);
  }

  if (denominator <= 0) return 0;
  return target / denominator;
};

export const requiredLumpsumForGoal = (
  target: number,
  years: number,
  returnRate: number,
): number => {
  return target / Math.pow(1 + returnRate / 100, years);
};
