import type { AssetCategory, AllocationScenario, GlidePathPoint, RiskProfile, MasterPlanInputs } from '../types';
import { DEFAULT_RATES, GLIDE_PATH_PRESETS } from './constants';
import { riskParityAllocation, glidePathAllocation } from './allocationModels';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

const SCENARIOS_KEY = 'soundthesis_allocation_scenarios';
const ACTIVE_SCENARIO_KEY = 'soundthesis_active_scenario';

const defaultCorrelation: Record<AssetCategory, Record<AssetCategory, number>> = {
  equity: { equity: 1, debt: 0.2, gold: 0.1, realestate: 0.4, liquid: 0.05, other: 0.3 },
  debt: { equity: 0.2, debt: 1, gold: 0.15, realestate: 0.1, liquid: 0.1, other: 0.1 },
  gold: { equity: 0.1, debt: 0.15, gold: 1, realestate: 0.05, liquid: 0, other: 0.05 },
  realestate: { equity: 0.4, debt: 0.1, gold: 0.05, realestate: 1, liquid: 0.05, other: 0.2 },
  liquid: { equity: 0.05, debt: 0.1, gold: 0, realestate: 0.05, liquid: 1, other: 0.05 },
  other: { equity: 0.3, debt: 0.1, gold: 0.05, realestate: 0.2, liquid: 0.05, other: 1 },
};

const defaultCategoryAssumptions = (): Record<AssetCategory, { mean: number; std: number }> => ({
  equity: { mean: DEFAULT_RATES.equityReturn / 100, std: 0.15 },
  debt: { mean: DEFAULT_RATES.debtReturn / 100, std: 0.05 },
  gold: { mean: DEFAULT_RATES.goldReturn / 100, std: 0.18 },
  realestate: { mean: DEFAULT_RATES.realEstateReturn / 100, std: 0.12 },
  liquid: { mean: DEFAULT_RATES.liquidReturn / 100, std: 0.01 },
  other: { mean: 0.08, std: 0.2 },
});

export const defaultAssumptions = () => ({
  useMasterPlanAssumptions: true,
  categories: defaultCategoryAssumptions(),
  inflation: DEFAULT_RATES.inflation,
  correlation: defaultCorrelation,
});

export function emptyTargets(): Record<AssetCategory, number> {
  return { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
}

export function normalizeTargets(targets: Record<AssetCategory, number>): Record<AssetCategory, number> {
  const total = Object.values(targets).reduce((a, b) => a + b, 0);
  if (total === 0) {
    const equal = 100 / CATEGORIES.length;
    return Object.fromEntries(CATEGORIES.map((c) => [c, equal])) as Record<AssetCategory, number>;
  }
  return Object.fromEntries(CATEGORIES.map((c) => [c, (targets[c] / total) * 100])) as Record<AssetCategory, number>;
}

export function currentAllocationTargets(inputs: MasterPlanInputs): Record<AssetCategory, number> {
  const sums: Record<AssetCategory, number> = { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
  inputs.assets.forEach((a) => (sums[a.category] += a.value));
  return normalizeTargets(sums);
}

export function riskProfileTargets(riskProfile: RiskProfile): Record<AssetCategory, number> {
  return { ...riskProfile.targets };
}

export function riskParityTargets(): Record<AssetCategory, number> {
  const result = riskParityAllocation();
  return Object.fromEntries(CATEGORIES.map((c) => [c, result.weights[c] * 100])) as Record<AssetCategory, number>;
}

export function glidePathTargets(currentAge: number, preset: keyof typeof GLIDE_PATH_PRESETS = 'moderate'): Record<AssetCategory, number> {
  const result = glidePathAllocation(currentAge, preset);
  return Object.fromEntries(CATEGORIES.map((c) => [c, result.weights[c] * 100])) as Record<AssetCategory, number>;
}

export function defaultGlidePath(currentAge: number, retirementAge: number): GlidePathPoint[] {
  const years = Math.max(0, retirementAge - currentAge);
  const preset = GLIDE_PATH_PRESETS.moderate;
  const path: GlidePathPoint[] = [];
  for (let i = 0; i < preset.length; i++) {
    const p = preset[i];
    path.push({ age: Math.min(currentAge + Math.round((p.age / 65) * years), retirementAge), equity: p.equity, debt: p.debt });
  }
  return path;
}

export function createScenario(
  name: string,
  source: AllocationScenario['source'],
  targets: Record<AssetCategory, number>,
  overrides?: Partial<AllocationScenario>,
): AllocationScenario {
  return {
    id: `scenario-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    source,
    targets: normalizeTargets(targets),
    assumptions: defaultAssumptions(),
    glidePath: null,
    rebalancing: { strategy: 'annual', threshold: 5 },
    narrative: '',
    createdAt: Date.now(),
    ...overrides,
  };
}

export const PRESET_SCENARIOS = {
  current: (inputs: MasterPlanInputs) =>
    createScenario('Current Allocation', 'current', currentAllocationTargets(inputs), {
      narrative: 'Your existing allocation based on entered assets.',
    }),
  riskProfile: (riskProfile: RiskProfile) =>
    createScenario(`${riskProfile.label} Target`, 'risk-profile', riskProfileTargets(riskProfile), {
      narrative: `Strategic target derived from your ${riskProfile.label} risk profile.`,
    }),
  riskParity: () =>
    createScenario('Risk Parity', 'risk-parity', riskParityTargets(), {
      narrative: 'Equalises risk contribution across asset classes.',
    }),
  glidePath: (currentAge: number) =>
    createScenario('Glide Path', 'glide-path', glidePathTargets(currentAge), {
      glidePath: defaultGlidePath(currentAge, currentAge + 30),
      narrative: 'Equity reduces automatically as you approach retirement.',
    }),
};

export function loadScenarios(): AllocationScenario[] | null {
  try {
    const raw = localStorage.getItem(SCENARIOS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return null;
}

export function saveScenarios(scenarios: AllocationScenario[]): void {
  localStorage.setItem(SCENARIOS_KEY, JSON.stringify(scenarios));
}

export function loadActiveScenarioId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_SCENARIO_KEY);
  } catch {
    return null;
  }
}

export function saveActiveScenarioId(id: string | null): void {
  if (id) localStorage.setItem(ACTIVE_SCENARIO_KEY, id);
  else localStorage.removeItem(ACTIVE_SCENARIO_KEY);
}

export function buildInitialScenarios(inputs: MasterPlanInputs, riskProfile: RiskProfile): AllocationScenario[] {
  return [
    PRESET_SCENARIOS.current(inputs),
    PRESET_SCENARIOS.riskProfile(riskProfile),
    PRESET_SCENARIOS.riskParity(),
    PRESET_SCENARIOS.glidePath(inputs.currentAge),
  ];
}
