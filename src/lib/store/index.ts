import type { DataStore } from './types';
import { localStorageStore } from './localStorageStore';
import { backendStore } from './backendStore';

export type { DataStore, StoredPlan } from './types';
export { localStorageStore, getActivePlanId, setActivePlanId } from './localStorageStore';
export { backendStore } from './backendStore';

/**
 * Returns the client DataStore (backend backed, falls back to local storage).
 */
export function createStore(): DataStore {
  // Use backend store as primary, fallback to local storage
  return backendStore.isAvailable() ? backendStore : localStorageStore;
}
