import { describe, expect, it } from 'vitest';
import {
  mapPlanInputToEngineInput,
  computeRequiredCorpus,
  isFiniteDeep,
} from '../src/services/engineAdapter.js';
import { runWealthEngine } from '../../src/lib/wealthEngine.js';
import { getSchemaDefaultAssumptions } from '../src/services/engineAdapter.js';
import type { MasterPlanInputs } from '../../src/types/index.js';

/**
 * Spec §145 fixture — basic_retirement_01.
 *
 *   age 40, retire 60, life expectancy 85, starting corpus ₹50L,
 *   SIP ₹50,000/month, inflation 6%, pre-return 10%, post-return 8%.
 *
 * The engine's deterministic path applies each asset's returnRate throughout
 * (pre-return 10% on the corpus asset), and the required-corpus annuity uses
 * the post-return 8%. Goals are intentionally empty so the projection is a
 * clean retirement math problem. A DB is NOT required — this test is pure
 * engine through the server adapter.
 */

const FIXTURE_SNAPSHOT = {
  client: { name: 'Fixture Client', advisor: 'QA' },
  currentAge: 40,
  retirementAge: 60,
  lifeExpectancy: 85,
  inflation: 6,
  annualIncome: 3_000_000,
  monthlyExpenditure: 100_000,
  assets: [
    {
      id: 'corpus-1',
      name: 'Retirement Corpus',
      value: 5_000_000, // ₹50L
      returnRate: 10, // pre-return 10%
      category: 'equity',
      currency: 'INR',
      liquidateAtRetirement: true,
    },
  ],
  sip: {
    amount: 50_000, // ₹50K/month
    equitySplit: 100,
    debtSplit: 0,
    stepUp: 0,
    equityReturn: 10,
    debtReturn: 8,
  },
  stp: {
    active: false,
    source: 'custom',
    lumpsum: 0,
    monthlyTransfer: 0,
    liquidReturn: 7,
    equitySplit: 50,
    debtSplit: 50,
    liquidCap: 0,
  },
  swp: {
    monthlyNeedToday: 100_000, // ₹1L/month in today's money
    postRetirementReturn: 8, // post-return 8%
    taxRate: 0,
    startAge: 60,
    endAge: 85,
  },
  goals: [],
};

function handEstimateCorpusAtRetirement(): number {
  // FV of ₹50L at 10% for 20y + FV of ₹6L/yr SIP at 10% for 20y
  // (end-of-year contributions, matching the engine's annual-cycle path).
  const corpusFV = 5_000_000 * Math.pow(1.1, 20);
  const sipFV = 600_000 * ((Math.pow(1.1, 20) - 1) / 0.1);
  return corpusFV + sipFV;
}

function handEstimateRequiredCorpus(): number {
  // Growing annuity: G1 = 12 · 100_000 · 1.06^20 ≈ ₹38.49L withdrawals in
  // retirement year 1, growing at g=6%, discounted at r=8% for 25 years.
  const g1 = 12 * 100_000 * Math.pow(1.06, 20);
  return (g1 / (0.08 - 0.06)) * (1 - Math.pow(1.06 / 1.08, 25));
}

describe('calculation — basic_retirement_01 (§145)', () => {
  const input = mapPlanInputToEngineInput(FIXTURE_SNAPSHOT);
  const assumptions = getSchemaDefaultAssumptions();
  const result = runWealthEngine(input, assumptions, undefined, null, 42);

  it('adapter validates and maps the fixture input', () => {
    expect(input.currentAge).toBe(40);
    expect(input.retirementAge).toBe(60);
    expect(input.lifeExpectancy).toBe(85);
    expect(input.assets).toHaveLength(1);
    expect(input.sip.amount).toBe(50_000);
  });

  it('requiredCorpus matches the hand-computed growing-annuity PV', () => {
    const required = computeRequiredCorpus(input);
    const hand = handEstimateRequiredCorpus();
    // Identical closed form — assert near-exact agreement.
    expect(required).toBeGreaterThan(hand * 0.99);
    expect(required).toBeLessThan(hand * 1.01);
    expect(required).toBeGreaterThan(0);
  });

  it('projectedCorpus (at retirement) is within generous tolerance of FV+annuity estimate', () => {
    const hand = handEstimateCorpusAtRetirement();
    const corpusAtRetirement =
      result.snapshots.find((s) => s.year === 20)?.total ?? 0;
    expect(Number.isFinite(corpusAtRetirement)).toBe(true);
    expect(corpusAtRetirement).toBeGreaterThan(0);
    // Engine applies returns annually then adds monthly SIPs within the year,
    // so contributions compound slightly differently than the end-of-year
    // hand estimate — allow ±25%.
    expect(corpusAtRetirement).toBeGreaterThan(hand * 0.75);
    expect(corpusAtRetirement).toBeLessThan(hand * 1.25);
  });

  it('engine headline numbers are finite and positive', () => {
    expect(Number.isFinite(result.terminalValue)).toBe(true);
    expect(result.terminalValue).toBeGreaterThan(0);
    expect(Number.isFinite(result.terminalRealValue)).toBe(true);
    expect(result.monteCarlo.successRate).toBeGreaterThanOrEqual(0);
    expect(result.monteCarlo.successRate).toBeLessThanOrEqual(1);
  });

  it('funding ratio of corpus-at-retirement vs requiredCorpus is within [0, 10]', () => {
    const required = computeRequiredCorpus(input);
    const corpusAtRetirement =
      result.snapshots.find((s) => s.year === 20)?.total ?? 0;
    const ratio = corpusAtRetirement / required;
    expect(ratio).toBeGreaterThanOrEqual(0);
    expect(ratio).toBeLessThanOrEqual(10);
  });

  it('NO NaN/Infinity anywhere in the engine output (spec §186)', () => {
    expect(isFiniteDeep(result)).toBe(true);
  });

  it('engine output is deterministic under a fixed seed (§146)', () => {
    const again = runWealthEngine(input, assumptions, undefined, null, 42);
    expect(again.terminalValue).toBe(result.terminalValue);
    expect(again.monteCarlo.successRate).toBe(result.monteCarlo.successRate);
  });
});
