import type { MasterPlanInputs, RiskAnswers, AssetCategory } from '../types';
import type { AssumptionSet } from './assumptions';
import { createStore, localStorageStore, type StoredPlan } from './store';

export interface PlanBundle {
  inputs: MasterPlanInputs;
  assumptions: AssumptionSet;
  riskAnswers: RiskAnswers;
  manualTargets: Record<AssetCategory, number> | null;
}

function createPlanId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function buildStoredPlan(bundle: PlanBundle, id?: string, name?: string): StoredPlan {
  return {
    id: id || createPlanId(),
    name: name || bundle.inputs.client?.name || 'Untitled Plan',
    inputs: bundle.inputs,
    assumptions: bundle.assumptions,
    riskAnswers: bundle.riskAnswers,
    manualTargets: bundle.manualTargets,
    updatedAt: new Date().toISOString(),
  };
}

export function getActiveStore() {
  return createStore();
}

export async function listPlans() {
  return getActiveStore().listPlans();
}

export async function loadPlan(id: string) {
  return getActiveStore().loadPlan(id);
}

export async function savePlan(bundle: PlanBundle, id?: string, name?: string) {
  const plan = buildStoredPlan(bundle, id, name);
  return getActiveStore().savePlan(plan);
}

export async function deletePlan(id: string) {
  return getActiveStore().deletePlan(id);
}

export function savePlanLocally(bundle: PlanBundle, id?: string, name?: string) {
  const plan = buildStoredPlan(bundle, id, name);
  return localStorageStore.savePlan(plan);
}

export function loadLocalPlans() {
  return localStorageStore.listPlans();
}
