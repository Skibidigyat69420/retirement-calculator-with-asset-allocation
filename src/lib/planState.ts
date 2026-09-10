import type { MasterPlanInputs } from '../types';

/**
 * Plan-state helpers for the zero-state redesign. These let the UI distinguish
 * a blank workspace from a partially-configured one and render '—' instead of
 * NaN/Infinity for uncomputed values.
 */
export const isProfileConfigured = (inputs: MasterPlanInputs): boolean =>
  inputs.client.name.trim().length > 0 || inputs.currentAge > 0 || inputs.retirementAge > 0;

export const hasFinancialData = (inputs: MasterPlanInputs): boolean =>
  inputs.annualIncome > 0 ||
  inputs.monthlyExpenditure > 0 ||
  inputs.assets.length > 0 ||
  inputs.sip.amount > 0 ||
  inputs.goals.length > 0 ||
  inputs.stp.lumpsum > 0 ||
  inputs.swp.monthlyNeedToday > 0;

export const isPlanEmpty = (inputs: MasterPlanInputs): boolean =>
  !isProfileConfigured(inputs) && !hasFinancialData(inputs);

export type PlanStatus = 'not-started' | 'in-progress' | 'ready-for-review';

export const planStatus = (inputs: MasterPlanInputs): PlanStatus => {
  if (isPlanEmpty(inputs)) return 'not-started';
  if (isProfileConfigured(inputs) && hasFinancialData(inputs) && inputs.goals.length > 0) {
    return 'ready-for-review';
  }
  return 'in-progress';
};

/** Returns v when it is a finite number, otherwise null (UI renders '—'). */
export const guardNumber = (v: number | undefined | null): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/** Formats a guarded number, falling back to '—' for NaN/Infinity/undefined. */
export const formatOrDash = (v: number | undefined | null, fmt: (n: number) => string): string => {
  const guarded = guardNumber(v);
  return guarded === null ? '—' : fmt(guarded);
};
