import type { DataStore } from './types';
import { localStorageStore } from './localStorageStore';

export type { DataStore, StoredPlan } from './types';
export { localStorageStore } from './localStorageStore';

/**
 * Returns the client DataStore (localStorage backed).
 * Plans are stored directly in browser localStorage, making the app
 * fully portable and independent of any proprietary cloud providers.
 */
export function createStore(): DataStore {
  return localStorageStore;
}
