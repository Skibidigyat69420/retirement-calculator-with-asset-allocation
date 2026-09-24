import type { DataStore, StoredPlan } from './types';
import { getPlan, createPlan, patchPlan, deletePlan, createPlanVersion, listPlans } from '../api';

function activeClientId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('stw.activeClientId');
}

function hasBackendSession(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem('stw.token') && localStorage.getItem('stw.orgId') && activeClientId());
}

export const backendStore: DataStore = {
  name: 'backend',

  isAvailable() {
    return hasBackendSession();
  },

  async listPlans() {
    const clientId = activeClientId();
    if (!clientId) return [];
    try {
      const res = await listPlans(clientId);
      return res.data.map(p => ({
        id: p.id,
        name: p.name,
        inputs: {},
        assumptions: {},
        riskAnswers: {},
        manualTargets: null,
        manualAllocationPolicy: null,
        updatedAt: new Date().toISOString(),
      } as StoredPlan));
    } catch (err) {
      console.warn('Failed to list plans from backend', err);
      return [];
    }
  },

  async loadPlan(id) {
    try {
      const p = await getPlan(id);
      
      const inputSnapshot = p.currentVersion?.inputSnapshot || {};
      const assumptionsSnapshot = p.currentVersion?.assumptionsSnapshot || {};
      
      return {
        id: p.id,
        name: p.name,
        inputs: inputSnapshot.inputs || {},
        assumptions: assumptionsSnapshot || {},
        riskAnswers: inputSnapshot.riskAnswers || {},
        manualTargets: inputSnapshot.manualTargets || null,
        manualAllocationPolicy: inputSnapshot.manualAllocationPolicy || null,
        ipsState: inputSnapshot.ipsState || {},
        updatedAt: p.currentVersion ? new Date().toISOString() : new Date().toISOString(),
      } as StoredPlan;
    } catch (err) {
      console.error('Failed to load plan from backend', err);
      return null;
    }
  },

  async savePlan(plan) {
    const clientId = activeClientId();
    if (!clientId) return { success: false, error: 'No active client is selected.' };
    try {
      let planId = plan.id;
      
      // We group the store plan payload to match snapshot structure
      const inputSnapshot = {
        inputs: plan.inputs,
        riskAnswers: plan.riskAnswers,
        manualTargets: plan.manualTargets,
        manualAllocationPolicy: plan.manualAllocationPolicy,
        ipsState: plan.ipsState,
      };

      if (!planId || planId.startsWith('local-') || planId.startsWith('plan-')) {
        const newPlan = await createPlan(clientId, { name: plan.name || 'New Financial Plan' });
        planId = newPlan.id;
      } else {
        try {
          await patchPlan(planId, { name: plan.name });
        } catch {
          const newPlan = await createPlan(clientId, { name: plan.name || 'New Financial Plan' });
          planId = newPlan.id;
        }
      }

      await createPlanVersion(planId, inputSnapshot, plan.assumptions as Record<string, unknown>);
      plan.id = planId;

      return { success: true };
    } catch (err: any) {
      console.error('Failed to save plan to backend', err);
      return { success: false, error: err.message };
    }
  },

  async deletePlan(id) {
    try {
      await deletePlan(id);
      return { success: true };
    } catch (err: any) {
      console.error('Failed to delete plan from backend', err);
      return { success: false, error: err.message };
    }
  }
};
