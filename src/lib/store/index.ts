import type { DataStore } from './types';
import { localStorageStore } from './localStorageStore';
import { createNetlifyApiStore } from './netlifyApiStore';

export type { DataStore, StoredPlan } from './types';
export { localStorageStore } from './localStorageStore';
export { createNetlifyApiStore } from './netlifyApiStore';

/**
 * Create the active DataStore for the current environment.
 *
 * If a Netlify Identity token is available, use the server-backed API store.
 * Otherwise fall back to browser localStorage. The fallback keeps local dev
 * and unauthenticated preview deployments usable.
 */
export function createStore(getIdentityToken: () => string | null): DataStore {
  if (typeof window !== 'undefined' && getIdentityToken()) {
    return createNetlifyApiStore(getIdentityToken);
  }
  return localStorageStore;
}
