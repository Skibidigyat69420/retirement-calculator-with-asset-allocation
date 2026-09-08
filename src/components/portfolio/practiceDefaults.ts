/**
 * Practice-wide default allocation targets (spec §247). The practice-settings
 * surface is owned by another workstream; this module reads its persisted
 * payload defensively so the Allocation page can badge "practice default" vs
 * "client override" without crashing when the payload is absent or malformed.
 *
 * Expected payload (localStorage key `soundthesis_practice_default_targets`):
 * `{ "equity": 60, "debt": 25, "gold": 7, "realestate": 8, "liquid": 0, "other": 0 }`
 */
import type { AssetCategory } from '../../types';
import { ASSET_CATEGORIES, normalizeTargetWeights } from './allocationMath';

export const PRACTICE_DEFAULT_TARGETS_KEY = 'soundthesis_practice_default_targets';

export function isValidTargetsPayload(raw: unknown): raw is Record<AssetCategory, number> {
  if (typeof raw !== 'object' || raw === null) return false;
  const record = raw as Record<string, unknown>;
  return ASSET_CATEGORIES.every((cat) => {
    const value = record[cat];
    return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  });
}

/** Load practice defaults; returns null when unset or invalid (single-client mode). */
export function loadPracticeDefaultTargets(): Record<AssetCategory, number> | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(PRACTICE_DEFAULT_TARGETS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidTargetsPayload(parsed)) return null;
    return normalizeTargetWeights(parsed);
  } catch {
    return null;
  }
}
