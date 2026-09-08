import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSIPMonthly,
  calculateSIPYearly,
  calculateSTPStandalone,
  calculateSWPStandalone,
  requiredLumpsumForGoal,
} from '../../src/lib/calculations';
import { calculateGoalPV, requiredMonthlySIPForGoal, simulateGoal } from '../../src/lib/goals';
import { evaluateCustomWeights } from '../../src/lib/mvo';
import { computePortfolioMetrics, type PortfolioHoldingAnalytics } from '../../src/lib/portfolioAnalytics';
import { runWealthEngine } from '../../src/lib/wealthEngine';
import { getDefaultAssumptions } from '../../src/lib/assumptions';
import { CATEGORIES, baseInputs, makeAsset, makeGoal, zeroAssumptions } from './helpers';
import type { MasterPlanInputs } from '../../src/types';
import type { AssumptionSet } from '../../src/lib/assumptions';

const closeTo = (actual: number, expected: number, relTol: number, label: string) => {
  assert.ok(
    Math.abs(actual - expected) <= relTol * Math.max(Math.abs(expected), 1e-9),
    `${label}: expected ${expected}, got ${actual} (relTol ${relTol})`,
  );
};

describe('quant fixtures: deterministic known-input → known-output', () => {
  it('calculateSIPMonthly matches the closed-form annuity-due value', () => {
    // FV = P · ((1+r)ⁿ − 1)/r · (1+r), r = 1%/mo, n = 12
    const expected = 10_000 * ((Math.pow(1.01, 12) - 1) / 0.01) * 1.01;
    closeTo(calculateSIPMonthly(0, 12, 12, 10_000), expected, 1e-9, 'SIP FV');
  });

  it('requiredLumpsumForGoal matches the closed-form PV', () => {
    closeTo(requiredLumpsumForGoal(1_000_000, 5, 12), 1_000_000 / Math.pow(1.12, 5), 1e-9, 'goal PV');
  });

  it('requiredMonthlySIPForGoal matches the closed-form annuity payment', () => {
    const r = 0.12 / 12;
    const expected = (1_000_000 * r) / (Math.pow(1 + r, 120) - 1);
    closeTo(requiredMonthlySIPForGoal(1_000_000, 10, 12), expected, 1e-9, 'required SIP');
  });

  it('calculateGoalPV discounts nominal FV at the nominal rate (no double inflation)', () => {
    const goal = makeGoal({ targetAmount: 1_000_000, yearsToGoal: 10, inflation: 6 });
    // Discount rate equal to inflation → PV equals today's target.
    closeTo(calculateGoalPV(goal, 6), 1_000_000, 1e-9, 'PV at inflation parity');
    closeTo(
      calculateGoalPV(goal, 12),
      (1_000_000 * Math.pow(1.06, 10)) / Math.pow(1.12, 10),
      1e-9,
      'PV at 12% nominal',
    );
  });

  it('calculateSTPStandalone fully deploys a zero-rate lumpsum on schedule', () => {
    const result = calculateSTPStandalone(50_000, 10_000, 0, 0);
    assert.equal(result.months, 5);
    assert.equal(result.target, 50_000);
    assert.equal(result.liquid, 0);
    assert.equal(result.total, 50_000);
  });

  it('calculateSIPYearly with zero returns invests exactly 12 × amount per year', () => {
    const result = calculateSIPYearly(
      { amount: 10_000, equitySplit: 100, debtSplit: 0, stepUp: 0, equityReturn: 0, debtReturn: 0 },
      2,
    );
    assert.equal(result.totalInvested, 240_000);
    assert.equal(result.equity, 240_000);
    assert.equal(result.debt, 0);
  });

  it('calculateSWPStandalone with zero withdrawal compounds the corpus', () => {
    const result = calculateSWPStandalone(1_000_000, 0, 8, 5, 10, 3);
    assert.equal(result.sustainable, true);
    closeTo(result.yearlyData[2].corpusLeft, 1_000_000 * Math.pow(1.08, 3), 1e-9, 'SWP growth');
  });

  it('evaluateCustomWeights computes wᵀΣw for a two-asset portfolio', () => {
    // w = (0.5, 0.5), Σ = [[0.04, 0.01], [0.01, 0.01]] → var = 0.0175
    const p = evaluateCustomWeights([0.5, 0.5], [0.1, 0.06], [
      [0.04, 0.01],
      [0.01, 0.01],
    ]);
    closeTo(p.volatility, Math.sqrt(0.0175), 1e-12, 'portfolio vol');
    closeTo(p.expectedReturn, 0.08, 1e-12, 'portfolio return');
    closeTo(p.sharpe, 0.02 / Math.sqrt(0.0175), 1e-12, 'portfolio sharpe');
  });

  it('computePortfolioMetrics uses the full covariance matrix (wᵀΣw)', () => {
    const holdings: PortfolioHoldingAnalytics[] = [
      { symbol: 'NIFTYBEES', token: '1', exchange: 'NSE', quantity: 100, avgPrice: 90, ltp: 100, value: 10_000, invested: 9_000, pnl: 1_000, pnlPercent: 10, weight: 50, category: 'equity' },
      { symbol: 'LIQUIDFUND', token: '2', exchange: 'NSE', quantity: 100, avgPrice: 90, ltp: 100, value: 10_000, invested: 9_000, pnl: 1_000, pnlPercent: 10, weight: 50, category: 'debt' },
    ];
    const sigma = Object.fromEntries(
      CATEGORIES.map((a) => [
        CATEGORIES.indexOf(a),
        CATEGORIES.map((b) => (a === 'equity' && b === 'equity' ? 0.04 : a === 'debt' && b === 'debt' ? 0.01 : (a === 'equity' && b === 'debt') || (a === 'debt' && b === 'equity') ? 0.02 : 0)),
      ]),
    );
    const covMatrix = CATEGORIES.map((_, i) => CATEGORIES.map((_, j) => sigma[i][j]));
    const metrics = computePortfolioMetrics(holdings, [], 0.06, covMatrix);
    // w_cat = (0.5, 0.5, 0…) → var = 0.25·0.04 + 0.25·0.01 + 2·0.25·0.02 = 0.0225
    closeTo(metrics.annualizedVolatility, 0.15, 1e-12, 'full-covariance vol');
  });

  it('simulateGoal with a zero-volatility assumption set is exactly deterministic', () => {
    const assumptions: AssumptionSet = zeroAssumptions();
    assumptions.categories.equity = { mean: 0.12, std: 0 };
    const goal = makeGoal({ targetAmount: 3_200_000, yearsToGoal: 10, inflation: 0 });
    const result = simulateGoal(goal, assumptions, 0, 10_000, { equity: 1, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 }, 200, 'fixture-seed');
    // Expected corpus: 12P(1+μ)((1+μ)¹⁰ − 1)/μ with P = 10,000, μ = 0.12
    const expected = 12 * 10_000 * 1.12 * ((Math.pow(1.12, 10) - 1) / 0.12);
    result.outcomes.forEach((o, i) => closeTo(o, expected, 1e-9, `outcome ${i}`));
  });
});

/**
 * Spec §145 fixture: basic_retirement_01.
 *
 * Age 40, retire 60, life 85, corpus ₹50L, SIP ₹50K, inflation 6%,
 * pre-return 10%, post-return 8%, monthly need ₹1L (today), tax 0.
 *
 * Hand-derived references:
 *   - Corpus at 60 (engine convention: annual compounding, SIP contributions
 *     added monthly without intra-year growth): 50L·1.1²⁰ + 600K·((1.1²⁰−1)/0.1)
 *     = 3.3637Cr + 3.4365Cr ≈ ₹6.80Cr.
 *   - Required corpus at 60 (finite-horizon real annuity, 25y, real rate
 *     1.08/1.06−1 ≈ 1.887%): 12·100K·1.06²⁰·[1−(1.01887)⁻²⁵]/0.01887 ≈ ₹7.61Cr.
 *   - Plan is therefore under-funded (6.80Cr < 7.61Cr): stochastic success
 *     rate is materially below 1 and the median stochastic terminal is 0.
 */
describe('quant fixture: basic_retirement_01 (spec §145)', () => {
  const fixtureInputs: MasterPlanInputs = baseInputs({
    currentAge: 40,
    retirementAge: 60,
    lifeExpectancy: 85,
    inflation: 6,
    assets: [makeAsset({ id: 'corpus', name: 'Equity Corpus', value: 5_000_000, returnRate: 10, category: 'equity' })],
    sip: { amount: 50_000, equitySplit: 100, debtSplit: 0, stepUp: 0, equityReturn: 10, debtReturn: 8 },
    swp: { monthlyNeedToday: 100_000, postRetirementReturn: 8, taxRate: 0, startAge: 60, endAge: 85 },
  });

  it('produces the approx expected projected corpus at retirement', () => {
    const result = runWealthEngine(fixtureInputs, getDefaultAssumptions(), undefined, null, 'basic_retirement_01');
    const corpusAt60 = result.snapshots[20].total;
    closeTo(corpusAt60, 6.80e7, 0.02, 'projected corpus at 60');
  });

  it('is underfunded relative to the analytic required corpus and the MC gate reflects it', () => {
    const result = runWealthEngine(fixtureInputs, getDefaultAssumptions(), undefined, null, 'basic_retirement_01');
    // Analytic required corpus ≈ ₹7.61Cr > projected ₹6.80Cr → success well below 1.
    assert.ok(result.monteCarlo.successRate < 0.9, `success rate ${result.monteCarlo.successRate} should reflect underfunding`);
    assert.ok(result.monteCarlo.successRate > 0.05, `success rate ${result.monteCarlo.successRate} implausibly low`);
    assert.equal(result.monteCarlo.outcomes.length, 2000);
  });

  it('carries full calculation metadata (spec §189)', () => {
    const result = runWealthEngine(fixtureInputs, getDefaultAssumptions(), undefined, null, 'basic_retirement_01');
    assert.equal(result.metadata.engineVersion, '2.1.0');
    assert.equal(result.metadata.simulationCount, 2000);
    assert.equal(result.metadata.source, 'preview');
    assert.equal(typeof result.metadata.seed, 'number');
    assert.ok(!Number.isNaN(Date.parse(result.metadata.calculatedAt)), 'calculatedAt must be ISO');
    assert.match(result.metadata.assumptionVersion, /^[0-9a-f]{8}$/);
  });
});
