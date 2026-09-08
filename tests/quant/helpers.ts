import type { MasterPlanInputs, AssetCategory, Asset, Goal } from '../../src/types';
import type { AssumptionSet } from '../../src/lib/assumptions';

export const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const zeroCat = { mean: 0, std: 0 };
const zeroRow = () =>
  Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<AssetCategory, number>;

/**
 * Assumption set with all returns/volatilities zeroed. Removes every source of
 * randomness and growth so engine state transitions can be pinned exactly.
 */
export function zeroAssumptions(): AssumptionSet {
  return {
    categories: {
      equity: { ...zeroCat },
      debt: { ...zeroCat },
      gold: { ...zeroCat },
      realestate: { ...zeroCat },
      liquid: { ...zeroCat },
      other: { ...zeroCat },
    },
    covariance: Object.fromEntries(CATEGORIES.map((c) => [c, zeroRow()])) as AssumptionSet['covariance'],
    correlation: Object.fromEntries(CATEGORIES.map((c) => [c, zeroRow()])) as AssumptionSet['correlation'],
    fx: { INR: { mean: 0, std: 0 } },
    fetchedAt: '2026-01-01T00:00:00.000Z',
    source: 'default',
  };
}

export function makeAsset(partial: Partial<Asset> & { value: number; category: AssetCategory }): Asset {
  return {
    id: partial.id ?? `asset-${partial.category}-${partial.value}`,
    name: partial.name ?? 'Test Asset',
    returnRate: partial.returnRate ?? 0,
    currency: partial.currency ?? 'INR',
    liquidateAtRetirement: partial.liquidateAtRetirement ?? true,
    ...partial,
  };
}

export function makeGoal(partial: Partial<Goal> & { targetAmount: number; yearsToGoal: number }): Goal {
  return {
    id: partial.id ?? `goal-${partial.yearsToGoal}`,
    name: partial.name ?? 'Test Goal',
    priority: partial.priority ?? 'essential',
    inflation: partial.inflation ?? 0,
    recurring: partial.recurring ?? false,
    ...partial,
  };
}

export function baseInputs(partial?: Partial<MasterPlanInputs>): MasterPlanInputs {
  return {
    client: {
      name: 'Quant Fixture Client',
      advisor: 'Sound Thesis',
      reviewDate: '2026-09-01',
    },
    currentAge: 40,
    retirementAge: 60,
    lifeExpectancy: 80,
    inflation: 0,
    annualIncome: 0,
    monthlyExpenditure: 0,
    assets: [],
    sip: {
      amount: 0,
      equitySplit: 50,
      debtSplit: 50,
      stepUp: 0,
      equityReturn: 0,
      debtReturn: 0,
    },
    stp: {
      active: false,
      source: 'custom',
      lumpsum: 0,
      monthlyTransfer: 0,
      liquidReturn: 0,
      equitySplit: 50,
      debtSplit: 50,
      liquidCap: 0,
    },
    swp: {
      monthlyNeedToday: 0,
      postRetirementReturn: 0,
      taxRate: 0,
      startAge: 60,
      endAge: 80,
    },
    goals: [],
    ...partial,
  };
}

export function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, v) => sum + (v - m) * (v - m), 0) / (values.length - 1));
}
