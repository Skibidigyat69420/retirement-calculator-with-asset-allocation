import type { DataStore, StoredPlan } from './types';

const PLANS_KEY = 'soundthesis_plans';
const ACTIVE_PLAN_KEY = 'soundthesis_active_plan';

function readPlans(): Record<string, StoredPlan> {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writePlans(plans: Record<string, StoredPlan>): boolean {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
    return true;
  } catch (err) {
    console.warn('Failed to write plans to localStorage:', err);
    return false;
  }
}

export const localStorageStore: DataStore = {
  name: 'localStorage',

  isAvailable() {
    try {
      const key = '__soundthesis_storage_test__';
      localStorage.setItem(key, '1');
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  async listPlans() {
    const plans = readPlans();
    return Object.values(plans).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  },

  async loadPlan(id) {
    const plans = readPlans();
    return plans[id] || null;
  },

  async savePlan(plan) {
    const plans = readPlans();
    plans[plan.id] = { ...plan, updatedAt: new Date().toISOString() };
    const ok = writePlans(plans);
    if (!ok) {
      return { success: false, error: 'Browser storage is full or unavailable.' };
    }
    return { success: true };
  },

  async deletePlan(id) {
    const plans = readPlans();
    delete plans[id];
    writePlans(plans);
    return { success: true };
  },
};

export function getActivePlanId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PLAN_KEY);
  } catch {
    return null;
  }
}

export function setActivePlanId(id: string | null): void {
  try {
    if (id) localStorage.setItem(ACTIVE_PLAN_KEY, id);
    else localStorage.removeItem(ACTIVE_PLAN_KEY);
  } catch {
    // ignore
  }
}
