import type { Asset, AssetCategory, MasterPlanInputs } from '../types';
import { calculateMasterPlan } from './calculations';

export interface CrisisScenario {
  id: string;
  name: string;
  shortDescription: string;
  historicalPeriod: string;
  equityShock: number; // e.g. -0.42 for -42%
  debtShock: number; // e.g. 0.06 for +6%
  goldShock: number; // e.g. 0.22 for +22%
  realEstateShock: number; // e.g. -0.18 for -18%
  liquidShock: number; // e.g. 0.0 for 0%
  otherShock: number; // e.g. -0.20 for -20%
  inflationDelta: number; // e.g. +1.5 for +1.5%
  narrative: string;
}

export const CRISIS_PRESETS: CrisisScenario[] = [
  {
    id: 'gfc-2008',
    name: '2008 Global Financial Crisis',
    shortDescription: 'Global equity and property decline with debt and gold capital preservation.',
    historicalPeriod: 'Sep 2008 – Mar 2009',
    equityShock: -0.42,
    debtShock: 0.06,
    goldShock: 0.22,
    realEstateShock: -0.18,
    liquidShock: 0.0,
    otherShock: -0.25,
    inflationDelta: -1.0,
    narrative: 'Equities declined sharply worldwide while sovereign debt and gold preserved capital.',
  },
  {
    id: 'covid-2020',
    name: '2020 COVID Flash Crash',
    shortDescription: 'Sharp short-term market drop followed by rapid central bank stimulus.',
    historicalPeriod: 'Feb 2020 – Apr 2020',
    equityShock: -0.34,
    debtShock: 0.03,
    goldShock: 0.28,
    realEstateShock: -0.08,
    liquidShock: 0.0,
    otherShock: -0.15,
    inflationDelta: -0.5,
    narrative: 'Rapid market sell-off followed by significant policy stimulus and gold outperformance.',
  },
  {
    id: 'stagflation-1970s',
    name: '1970s Great Stagflation Shock',
    shortDescription: 'High inflation surge with simultaneous declines across equities and fixed income.',
    historicalPeriod: '1973 – 1975 Oil Embargo',
    equityShock: -0.22,
    debtShock: -0.12,
    goldShock: 0.45,
    realEstateShock: 0.08,
    liquidShock: -0.02,
    otherShock: 0.05,
    inflationDelta: 4.0,
    narrative: 'Bond prices fell as interest rates rose, while high inflation compressed equity multiples and gold gained.',
  },
  {
    id: 'dotcom-2000',
    name: '2000 Dot-Com Tech Bubble Bust',
    shortDescription: 'Prolonged decline in technology valuations, with bonds preserving capital.',
    historicalPeriod: 'Mar 2000 – Oct 2002',
    equityShock: -0.48,
    debtShock: 0.12,
    goldShock: 0.08,
    realEstateShock: 0.04,
    liquidShock: 0.0,
    otherShock: -0.30,
    inflationDelta: -0.5,
    narrative: 'Multi-year equity bear market where investment-grade bonds provided portfolio stability.',
  },
];

export interface CategoryStressResult {
  category: AssetCategory;
  initialValue: number;
  shockedValue: number;
  delta: number;
  shockPercent: number;
}

export interface StressTestImpact {
  scenario: CrisisScenario;
  baselineNetWorth: number;
  shockedNetWorth: number;
  drawdownAmount: number;
  drawdownPercent: number;
  categoryImpacts: CategoryStressResult[];
  baselineCorpusAtRetirement: number;
  shockedCorpusAtRetirement: number;
  corpusDelta: number;
  baselineSustainable: boolean;
  shockedSustainable: boolean;
  baselineDepletionAge: number | null;
  shockedDepletionAge: number | null;
  resilienceScore: number; // 0 - 100
  mitigationActions: string[];
}

export function runStressTest(
  inputs: MasterPlanInputs,
  scenario: CrisisScenario,
): StressTestImpact {
  const shockMap: Record<AssetCategory, number> = {
    equity: scenario.equityShock,
    debt: scenario.debtShock,
    gold: scenario.goldShock,
    realestate: scenario.realEstateShock,
    liquid: scenario.liquidShock,
    other: scenario.otherShock,
  };

  // 1. Calculate baseline and shocked category values
  const initialByCategory: Record<AssetCategory, number> = {
    equity: 0,
    debt: 0,
    gold: 0,
    realestate: 0,
    liquid: 0,
    other: 0,
  };

  const safeAssets = inputs?.assets || [];

  safeAssets.forEach((a) => {
    const cat = a.category || 'other';
    initialByCategory[cat] = (initialByCategory[cat] || 0) + (a.value || 0);
  });

  const baselineNetWorth = Object.values(initialByCategory).reduce((s, v) => s + v, 0);

  const categoryImpacts: CategoryStressResult[] = (
    Object.keys(initialByCategory) as AssetCategory[]
  ).map((cat) => {
    const initialVal = initialByCategory[cat];
    const shockRate = shockMap[cat] ?? 0;
    const shockedVal = Math.max(0, initialVal * (1 + shockRate));
    return {
      category: cat,
      initialValue: initialVal,
      shockedValue: shockedVal,
      delta: shockedVal - initialVal,
      shockPercent: shockRate * 100,
    };
  });

  const shockedNetWorth = categoryImpacts.reduce((s, c) => s + c.shockedValue, 0);
  const drawdownAmount = shockedNetWorth - baselineNetWorth;
  const drawdownPercent =
    baselineNetWorth > 0 ? (drawdownAmount / baselineNetWorth) * 100 : 0;

  const safeInputs: MasterPlanInputs = {
    client: inputs?.client || { name: 'Client', advisor: 'Advisor', reviewDate: '2026-09-01' },
    currentAge: inputs?.currentAge ?? 35,
    retirementAge: inputs?.retirementAge ?? 60,
    lifeExpectancy: inputs?.lifeExpectancy ?? 85,
    annualIncome: inputs?.annualIncome ?? 0,
    monthlyExpenditure: inputs?.monthlyExpenditure ?? 0,
    assets: safeAssets,
    inflation: inputs?.inflation ?? 6,
    stp: inputs?.stp || {
      active: false,
      source: 'idle-cash',
      lumpsum: 0,
      monthlyTransfer: 0,
      liquidReturn: 6,
      equitySplit: 50,
      debtSplit: 50,
      liquidCap: 0,
    },
    sip: inputs?.sip || {
      amount: 0,
      equitySplit: 50,
      debtSplit: 50,
      stepUp: 0,
      equityReturn: 12,
      debtReturn: 8,
    },
    swp: inputs?.swp || {
      monthlyNeedToday: inputs?.monthlyExpenditure ?? 0,
      postRetirementReturn: 8,
      taxRate: 10,
      startAge: inputs?.retirementAge ?? 60,
      endAge: inputs?.lifeExpectancy ?? 85,
    },
    goals: inputs?.goals || [],
  };

  // 2. Compute baseline Master Plan
  const baselinePlan = calculateMasterPlan(safeInputs);

  // 3. Create shocked assets to feed into the shocked plan
  const shockedAssets: Asset[] = safeAssets.map((a) => {
    const shockRate = shockMap[a.category] ?? 0;
    return {
      ...a,
      value: Math.max(0, (a.value || 0) * (1 + shockRate)),
    };
  });

  const shockedInputs: MasterPlanInputs = {
    ...safeInputs,
    assets: shockedAssets,
    inflation: Math.max(1, safeInputs.inflation + scenario.inflationDelta),
  };

  const shockedPlan = calculateMasterPlan(shockedInputs);

  // 4. Extract retirement corpus and longevity comparison
  const baselineCorpusAtRetirement =
    baselinePlan.snapshots.find((s) => s.age === inputs.retirementAge)?.nominal ||
    baselinePlan.terminalCorpusNominal;

  const shockedCorpusAtRetirement =
    shockedPlan.snapshots.find((s) => s.age === inputs.retirementAge)?.nominal ||
    shockedPlan.terminalCorpusNominal;

  const corpusDelta = shockedCorpusAtRetirement - baselineCorpusAtRetirement;

  // 5. Resilience Score computation (0-100)
  // Factors:
  // - Drawdown resilience (lower drawdown gives up to 50 pts)
  // - Longevity resilience (survival to life expectancy gives up to 30 pts)
  // - Liquidity & debt cushion (presence of liquid + debt buffer gives up to 20 pts)
  let score = 50;

  // Drawdown factor: -50% drawdown loses 30 pts; +0% loses 0
  const drawdownPenalty = Math.min(40, Math.max(0, Math.abs(drawdownPercent)));
  score -= drawdownPenalty * 0.75;

  // Longevity factor:
  if (shockedPlan.sustainable) {
    score += 25;
  } else if (shockedPlan.depletionAge) {
    const yearsEarly = inputs.lifeExpectancy - shockedPlan.depletionAge;
    score -= Math.min(25, yearsEarly * 2);
  }

  // Cushion factor:
  const defensiveRatio =
    baselineNetWorth > 0
      ? (initialByCategory.debt + initialByCategory.gold + initialByCategory.liquid) /
        baselineNetWorth
      : 0;
  score += Math.min(25, defensiveRatio * 50);

  const resilienceScore = Math.max(10, Math.min(100, Math.round(score)));

  // 6. Institutional Action Items
  const mitigationActions: string[] = [];
  if (drawdownPercent < -25) {
    mitigationActions.push(
      'Rebalance systematically: avoid panic liquidations and deploy defensive debt/gold gains into discounted equity.',
    );
  }
  if (!shockedPlan.sustainable) {
    const shortfall = Math.abs(corpusDelta);
    mitigationActions.push(
      `Plan for longevity cushion: increase accumulation SIP or extend active career by 1-2 years to absorb the ₹${(shortfall / 1_00_000).toFixed(1)}L gap.`,
    );
    mitigationActions.push(
      'Adopt a dynamic withdrawal rule: trim non-essential retirement lifestyle expenses by 10-15% during crisis periods.',
    );
  } else {
    mitigationActions.push(
      'The multi-asset allocation successfully buffers the shock; retirement remains fully sustainable through age ' +
        inputs.lifeExpectancy +
        '.',
    );
  }
  if (initialByCategory.liquid < inputs.monthlyExpenditure * 6) {
    mitigationActions.push(
      'Reinforce emergency liquidity: build at least 6-12 months of living expenses in liquid instruments.',
    );
  }

  return {
    scenario,
    baselineNetWorth,
    shockedNetWorth,
    drawdownAmount,
    drawdownPercent,
    categoryImpacts,
    baselineCorpusAtRetirement,
    shockedCorpusAtRetirement,
    corpusDelta,
    baselineSustainable: baselinePlan.sustainable,
    shockedSustainable: shockedPlan.sustainable,
    baselineDepletionAge: baselinePlan.depletionAge,
    shockedDepletionAge: shockedPlan.depletionAge,
    resilienceScore,
    mitigationActions,
  };
}
