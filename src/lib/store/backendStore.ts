import type { DataStore, StoredPlan } from './types';
import { getPlan, createPlan, patchPlan, createPlanVersion, listPlans } from '../api';

const DEFAULT_CLIENT_ID = '00000000-0000-0000-0000-000000000000'; // Temporary mock client ID for local dev

export const backendStore: DataStore = {
  name: 'backend',

  isAvailable() {
    return true; // We could check auth state here, for now assume always available in this context
  },

  async listPlans() {
    try {
      // In a real app we'd get the actual selected clientId from auth/context
      const res = await listPlans(DEFAULT_CLIENT_ID);
      // We map the PlanSummary to StoredPlan. Since API summary doesn't contain all details,
      // we might need to load full details or just provide the summary stub.
      // For now, return stubs. The app uses listPlans mainly to list ids.
      return res.data.map(p => ({
        id: p.id,
        name: p.name,
        inputs: {}, // Lazy load real data on loadPlan
        assumptions: {},
        riskAnswers: {},
        manualTargets: null,
        updatedAt: new Date().toISOString(), // Mock timestamp for now
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
        ipsState: inputSnapshot.ipsState || {},
        updatedAt: p.currentVersion ? new Date().toISOString() : new Date().toISOString(),
      } as StoredPlan;
    } catch (err) {
      console.error('Failed to load plan from backend', err);
      return null;
    }
  },

  async savePlan(plan) {
    try {
      let planId = plan.id;
      
      // We group the store plan payload to match snapshot structure
      const inputSnapshot = {
        inputs: plan.inputs,
        riskAnswers: plan.riskAnswers,
        manualTargets: plan.manualTargets,
        ipsState: plan.ipsState,
      };

      if (!planId || planId.startsWith('local-')) {
        // Create new plan
        const newPlan = await createPlan(DEFAULT_CLIENT_ID, { name: plan.name || 'New Financial Plan' });
        planId = newPlan.id;
      } else {
        // Update name if changed
        await patchPlan(planId, { name: plan.name });
      }

      // Create a new version
      await createPlanVersion(planId, inputSnapshot, plan.assumptions as Record<string, unknown>);

      return { success: true };
    } catch (err: any) {
      console.error('Failed to save plan to backend', err);
      return { success: false, error: err.message };
    }
  },

  async deletePlan(id) {
    // Delete is not implemented in the API yet, we just mock it for now
    console.warn('Delete plan via backend is not supported yet.');
    return { success: true };
  }
};
