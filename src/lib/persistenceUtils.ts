import type { MasterPlanInputs } from '../types';
import { defaultClientInputs } from './scenarios';

const CLIENT_DATA_KEY = 'soundthesis_client_inputs';

/**
 * Storage schema version. Bump this when the persisted shape changes and add
 * a migration branch in loadClientData().
 */
export const CLIENT_DATA_VERSION = 1;

interface StoredClientData extends MasterPlanInputs {
  _version: number;
}

/** Persist the client's plan inputs (assets, goals, cashflows, profile params). */
export function saveClientData(inputs: MasterPlanInputs): void {
  try {
    const payload: StoredClientData = { ...inputs, _version: CLIENT_DATA_VERSION };
    localStorage.setItem(CLIENT_DATA_KEY, JSON.stringify(payload));
  } catch {
    // Storage full or unavailable — persistence is best-effort.
  }
}

/**
 * Load previously persisted client inputs, or null if none exist, the data is
 * corrupt, or the stored version doesn't match (future migrations handled here).
 * Loaded data is merged over defaults so missing fields from older or
 * hand-edited saves fall back to sane values instead of crashing consumers.
 */
export function loadClientData(): MasterPlanInputs | null {
  try {
    const raw = localStorage.getItem(CLIENT_DATA_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredClientData> | null;
    if (!parsed || typeof parsed !== 'object') return null;
    if (parsed._version !== CLIENT_DATA_VERSION) return null;
    const { _version: _ignored, sip, stp, swp, assets, goals, client, ...scalars } = parsed;
    const defaults = defaultClientInputs();
    // JSON round-trips never contain `undefined`, so spreading persisted
    // scalars over defaults only overrides keys that were actually saved.
    return {
      ...defaults,
      ...scalars,
      client: client ? { ...defaults.client, ...client } : defaults.client,
      sip: { ...defaults.sip, ...sip },
      stp: { ...defaults.stp, ...stp },
      swp: { ...defaults.swp, ...swp },
      assets: Array.isArray(assets) ? assets : defaults.assets,
      goals: Array.isArray(goals) ? goals : defaults.goals,
    } as MasterPlanInputs;
  } catch {
    return null;
  }
}

/** Clear persisted client inputs so the app falls back to defaults. */
export function resetClientData(): void {
  try {
    localStorage.removeItem(CLIENT_DATA_KEY);
  } catch {
    // ignore
  }
}
