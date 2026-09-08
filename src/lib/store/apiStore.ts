import type { DataStore, StoredPlan } from './types';
import type { MasterPlanInputs, RiskAnswers, AssetCategory } from '../../types';
import type { AssumptionSet } from '../assumptions';

const API_BASE = '/api';
// In a real app this would be injected by Auth0/Clerk etc.
// Hardcoded tenant for demonstration purposes.
const ORG_SLUG = 'sound-thesis'; 

async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const headers = new Headers(options.headers || {});
  headers.set('x-organization-slug', ORG_SLUG);
  
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Assuming cookies are sent automatically or we might pass an auth token here
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.error?.message || `API Error: ${response.status}`);
  }

  return response.json();
}

/**
 * apiStore wraps the backend endpoints and maps them to the existing StoredPlan interface 
 * so the frontend doesn't need to be completely rewritten all at once.
 */
export const apiStore: DataStore = {
  name: 'API Backend',
  isAvailable: () => true,
  listPlans: async (): Promise<StoredPlan[]> => {
    // Current frontend expects a flat list of plans. 
    // In our backend, plans belong to clients. We'll list all clients, 
    // and for simplicity here, fetch their plans.
    // In a full implementation, we'd have a specific endpoint or use the new Client Directory UX.
    const res = await fetchApi('/clients');
    const clients = res.data;
    const allPlans: StoredPlan[] = [];

    for (const client of clients) {
      try {
        const plansRes = await fetchApi(`/clients/${client.id}/plans`);
        for (const planVersion of plansRes.data) {
          allPlans.push({
            id: planVersion.id, // Using the plan_version id as the plan id for the frontend
            name: `${client.first_name} ${client.last_name} - v${planVersion.version_number}`,
            inputs: planVersion.input_snapshot as MasterPlanInputs,
            assumptions: planVersion.assumptions_snapshot as AssumptionSet,
            riskAnswers: planVersion.risk_answers_snapshot as RiskAnswers,
            manualTargets: planVersion.manual_targets_snapshot as Record<AssetCategory, number> | null,
            updatedAt: planVersion.created_at,
          });
        }
      } catch (err) {
        console.warn('Failed to load plans for client', client.id, err);
      }
    }
    
    // Sort descending by updated
    return allPlans.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  },

  loadPlan: async (id: string): Promise<StoredPlan | null> => {
    try {
      const res = await fetchApi(`/plans/versions/${id}`);
      const planVersion = res.data;
      return {
        id: planVersion.id,
        name: `Plan v${planVersion.version_number}`,
        inputs: planVersion.input_snapshot as MasterPlanInputs,
        assumptions: planVersion.assumptions_snapshot as AssumptionSet,
        riskAnswers: planVersion.risk_answers_snapshot as RiskAnswers,
        manualTargets: planVersion.manual_targets_snapshot as Record<AssetCategory, number> | null,
        updatedAt: planVersion.created_at,
      };
    } catch (err) {
      console.warn('Failed to load plan version', id, err);
      return null;
    }
  },

  savePlan: async (plan: StoredPlan): Promise<{ success: boolean; error?: string }> => {
    try {
      // Find or create the client first.
      const nameParts = (plan.inputs as MasterPlanInputs).client?.name?.split(' ') || ['Unknown', 'Client'];
      const firstName = nameParts[0] || 'Unknown';
      const lastName = nameParts.slice(1).join(' ') || 'Client';

      let clientId = '';
      
      // Attempt to find existing client by exact name match (naive approach for migration)
      const listRes = await fetchApi('/clients');
      const existing = listRes.data.find((c: any) => c.first_name === firstName && c.last_name === lastName);
      
      if (existing) {
        clientId = existing.id;
      } else {
        const createRes = await fetchApi('/clients', {
          method: 'POST',
          body: JSON.stringify({ firstName, lastName }),
        });
        clientId = createRes.data.id;
      }

      // We need a plan_id. For now, assume a single default plan per client, or just let the backend handle it?
      // Wait, our backend POST /api/plans takes clientId, name, inputSnapshot...
      await fetchApi('/plans', {
        method: 'POST',
        body: JSON.stringify({
          clientId,
          name: plan.name,
          engineVersion: '1.0.0',
          inputSnapshot: plan.inputs,
          assumptionsSnapshot: plan.assumptions,
          manualTargetsSnapshot: plan.manualTargets,
          riskAnswersSnapshot: plan.riskAnswers,
        }),
      });

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  deletePlan: async (): Promise<{ success: boolean; error?: string }> => {
    // To be implemented on the backend.
    return { success: true };
  }
};
