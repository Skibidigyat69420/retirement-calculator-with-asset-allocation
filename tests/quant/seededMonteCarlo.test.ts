import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runRetirementMonteCarlo, type RetirementSimParams } from '../../src/lib/monteCarlo';
import { simulateGoal } from '../../src/lib/goals';
import { runWealthEngine, resolveNumericSeed } from '../../src/lib/wealthEngine';
import { getDefaultAssumptions } from '../../src/lib/assumptions';
import { ENGINE_VERSION } from '../../src/lib/constants';
import { CATEGORIES, baseInputs, makeGoal, mean, stdDev, zeroAssumptions } from './helpers';
import type { AssetCategory } from '../../src/types';

function zeroCovRecord(): Record<AssetCategory, Record<AssetCategory, number>> {
  const row = () => Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  return Object.fromEntries(CATEGORIES.map((c) => [c, row()])) as Record<AssetCategory, Record<AssetCategory, number>>;
}

function volGateParams(seed: string | number): RetirementSimParams {
  return {
    currentAge: 40,
    retirementAge: 41,
    lifeExpectancy: 41,
    initialValues: { equity: 1_000_000, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 },
    weights: { equity: 1, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 },
    monthlySIP: 0,
    sipStepUp: 0,
    monthlyNeedAtRetirement: 0,
    inflation: 0,
    taxRate: 0,
    simulations: 4000,
    means: { equity: 0.12, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 },
    covariance: (() => {
      const c = zeroCovRecord();
      c.equity.equity = 0.0225; // intended 15% annual vol
      return c;
    })(),
    seed,
  };
}

describe('seeded Monte Carlo (spec §146)', () => {
  it('produces bit-identical outcomes for the same seed across runs', () => {
    const first = runRetirementMonteCarlo(volGateParams('quant-seed-gate'));
    const second = runRetirementMonteCarlo(volGateParams('quant-seed-gate'));
    assert.deepEqual(first.outcomes, second.outcomes);
    assert.equal(first.successRate, second.successRate);
    assert.equal(first.medianTerminalCorpus, second.medianTerminalCorpus);
    assert.deepEqual(
      first.yearlyPercentiles.map((p) => [p.p5, p.p50, p.p95]),
      second.yearlyPercentiles.map((p) => [p.p5, p.p50, p.p95]),
    );
  });

  it('produces different outcomes for different seeds', () => {
    const a = runRetirementMonteCarlo(volGateParams('seed-a'));
    const b = runRetirementMonteCarlo(volGateParams('seed-b'));
    assert.notDeepEqual(a.outcomes.slice(0, 50), b.outcomes.slice(0, 50));
  });

  it('realized volatility matches the intended 15% — not the ~2% bug signature', () => {
    const result = runRetirementMonteCarlo(volGateParams('quant-vol-gate'));
    const terminals = result.outcomes.map((o) => o.terminalCorpus);
    const cv = stdDev(terminals) / mean(terminals);
    // Theory: CV ≈ 0.15/1.12 = 13.4%. Double-std bug gives ≈ 2.0%.
    assert.ok(
      cv > 0.12 && cv < 0.15,
      `realized CV ${(cv * 100).toFixed(2)}% outside [12%, 15%] — the ~2% signature indicates double std scaling`,
    );
  });

  it('records reproducibility metadata on every run (spec §§147, 189)', () => {
    const result = runRetirementMonteCarlo(volGateParams(42));
    assert.equal(result.metadata.engineVersion, ENGINE_VERSION);
    assert.equal(result.metadata.simulationCount, 4000);
    assert.equal(result.metadata.seed, 42);
    assert.equal(result.metadata.source, 'preview');
    assert.ok(!Number.isNaN(Date.parse(result.metadata.calculatedAt)), 'calculatedAt must be ISO');
    assert.match(result.metadata.assumptionVersion, /^[0-9a-f]{8}$/);

    // Same inputs + seed → same assumptionVersion; changed inputs → different.
    const again = runRetirementMonteCarlo(volGateParams(42));
    assert.equal(again.metadata.assumptionVersion, result.metadata.assumptionVersion);
    const changed = runRetirementMonteCarlo({
      ...volGateParams(42),
      means: { equity: 0.13, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 },
    });
    assert.notEqual(changed.metadata.assumptionVersion, result.metadata.assumptionVersion);
  });

  it('generates a per-calculation seed when none is supplied (spec §146)', () => {
    const result = runRetirementMonteCarlo({ ...volGateParams(null) });
    assert.equal(typeof result.metadata.seed, 'number');
    assert.ok(Number.isInteger(result.metadata.seed));
  });

  it('resolveNumericSeed maps string seeds deterministically to numbers', () => {
    assert.equal(resolveNumericSeed('abc'), resolveNumericSeed('abc'));
    assert.equal(resolveNumericSeed(7), 7);
    assert.notEqual(resolveNumericSeed('abc'), resolveNumericSeed('abd'));
  });
});

describe('seeded goal simulation', () => {
  it('simulateGoal is deterministic under a fixed seed', () => {
    const assumptions = zeroAssumptions();
    assumptions.categories.equity = { mean: 0.12, std: 0.15 };
    const goal = makeGoal({ targetAmount: 3_200_000, yearsToGoal: 10, inflation: 0 });
    const weights = { equity: 1, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
    const a = simulateGoal(goal, assumptions, 1_000_000, 0, weights, 1000, 'goal-seed-gate');
    const b = simulateGoal(goal, assumptions, 1_000_000, 0, weights, 1000, 'goal-seed-gate');
    assert.deepEqual(a.outcomes, b.outcomes);
    assert.equal(a.successRate, b.successRate);
  });
});

describe('seeded wealth engine + metadata', () => {
  it('runWealthEngine is deterministic under a fixed seed and records metadata', () => {
    const inputs = baseInputs({
      assets: [{ id: 'a', name: 'Equity', value: 2_000_000, returnRate: 12, category: 'equity', currency: 'INR', liquidateAtRetirement: true }],
      sip: { amount: 50_000, equitySplit: 60, debtSplit: 40, stepUp: 5, equityReturn: 12, debtReturn: 8 },
    });
    const assumptions = getDefaultAssumptions();
    const first = runWealthEngine(inputs, assumptions, undefined, null, 'wealth-seed-gate');
    const second = runWealthEngine(inputs, assumptions, undefined, null, 'wealth-seed-gate');
    assert.equal(first.monteCarlo.successRate, second.monteCarlo.successRate);
    assert.equal(first.monteCarlo.medianTerminal, second.monteCarlo.medianTerminal);
    assert.equal(first.essentialSuccessRate, second.essentialSuccessRate);
    assert.deepEqual(
      first.monteCarlo.outcomes.slice(0, 20).map((o) => o.terminalValue),
      second.monteCarlo.outcomes.slice(0, 20).map((o) => o.terminalValue),
    );

    assert.equal(first.metadata.engineVersion, ENGINE_VERSION);
    assert.equal(first.metadata.simulationCount, 2000);
    assert.equal(first.metadata.source, 'preview');
    assert.equal(typeof first.metadata.seed, 'number');
    assert.equal(first.metadata.assumptionVersion, second.metadata.assumptionVersion);

    // Mutating the assumptions must change the assumptionVersion hash.
    const bumped = getDefaultAssumptions();
    bumped.categories.equity.mean += 0.01;
    const third = runWealthEngine(inputs, bumped, undefined, null, 'wealth-seed-gate');
    assert.notEqual(third.metadata.assumptionVersion, first.metadata.assumptionVersion);
  });
});
