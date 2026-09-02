import type { DataStore, StoredPlan } from './types';

async function api<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const response = await fetch(`/api/plan${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (!response.ok) {
      const text = await response.text();
      return { ok: false, error: `HTTP ${response.status}: ${text}` };
    }
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function createNetlifyApiStore(getToken: () => string | null): DataStore {
  return {
    name: 'netlifyApi',

    isAvailable() {
      return typeof window !== 'undefined' && Boolean(getToken());
    },

    async listPlans() {
      const token = getToken();
      const result = await api<StoredPlan[]>('/list', {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      return result.data || [];
    },

    async loadPlan(id) {
      const token = getToken();
      const result = await api<StoredPlan>(`/load?id=${encodeURIComponent(id)}`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' },
      });
      return result.data || null;
    },

    async savePlan(plan) {
      const token = getToken();
      const result = await api<{ success: boolean }>('/save', {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify(plan),
      });
      return { success: result.ok, error: result.error };
    },

    async deletePlan(id) {
      const token = getToken();
      const result = await api<{ success: boolean }>('/delete', {
        method: 'POST',
        headers: { Authorization: token ? `Bearer ${token}` : '' },
        body: JSON.stringify({ id }),
      });
      return { success: result.ok, error: result.error };
    },
  };
}
