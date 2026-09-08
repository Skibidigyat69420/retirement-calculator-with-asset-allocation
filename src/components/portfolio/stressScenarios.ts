/**
 * Stress-test scenario catalogue for the Stress Test panel (spec §93).
 * Historical crisis presets come from src/lib/stressTest.ts (CRISIS_PRESETS);
 * this module adds the additional spec scenarios — rate shock +200bps,
 * inflation shock, and a fully custom builder — as CrisisScenario-compatible
 * objects so runStressTest can consume them unchanged.
 */
import type { CrisisScenario } from '../../lib/stressTest';

export const RATE_SHOCK_SCENARIO: CrisisScenario = {
  id: 'rate-shock-200bps',
  name: 'Rate Shock +200 bps',
  shortDescription: 'Sharp rate hike cycle — bond prices fall, equity multiples compress, real estate weakens.',
  historicalPeriod: 'Hypothetical tightening cycle',
  equityShock: -0.12,
  debtShock: -0.08,
  goldShock: 0.04,
  realEstateShock: -0.1,
  liquidShock: 0.01,
  otherShock: -0.06,
  inflationDelta: -0.5,
  narrative: 'A +200bps rate shock hurts long-duration bonds immediately and compresses equity valuations; floating-rate and short-duration allocations cushion the fall.',
};

export const INFLATION_SHOCK_SCENARIO: CrisisScenario = {
  id: 'inflation-shock',
  name: 'Inflation Shock +3%',
  shortDescription: 'Persistent inflation overshoot — real returns erode across equity and debt; hard assets protect.',
  historicalPeriod: 'Hypothetical stagflation-lite',
  equityShock: -0.15,
  debtShock: -0.1,
  goldShock: 0.18,
  realEstateShock: 0.06,
  liquidShock: -0.02,
  otherShock: 0.02,
  inflationDelta: 3,
  narrative: 'A sustained +3% inflation overshoot erodes real bond coupons and equity multiples while gold and real assets act as hedges.',
};

export const SPEC_SCENARIOS: CrisisScenario[] = [RATE_SHOCK_SCENARIO, INFLATION_SHOCK_SCENARIO];

export interface CustomShockInput {
  equity: number;
  debt: number;
  gold: number;
  realEstate: number;
  liquid: number;
  other: number;
  inflationDelta: number;
}

export const DEFAULT_CUSTOM_SHOCKS: CustomShockInput = {
  equity: -20,
  debt: 2,
  gold: 10,
  realEstate: -5,
  liquid: 0,
  other: -10,
  inflationDelta: 1,
};

/** Build a custom CrisisScenario from per-class shock percentages (+/-). */
export function buildCustomScenario(shocks: CustomShockInput): CrisisScenario {
  return {
    id: 'custom',
    name: 'Custom Scenario',
    shortDescription: 'Advisor-defined per-asset-class shocks.',
    historicalPeriod: 'Hypothetical',
    equityShock: shocks.equity / 100,
    debtShock: shocks.debt / 100,
    goldShock: shocks.gold / 100,
    realEstateShock: shocks.realEstate / 100,
    liquidShock: shocks.liquid / 100,
    otherShock: shocks.other / 100,
    inflationDelta: shocks.inflationDelta,
    narrative: 'Custom shocks defined by the advisor for this client review.',
  };
}
