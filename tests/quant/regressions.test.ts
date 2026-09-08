import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMasterPlan } from '../../src/lib/calculations';
import { simulateGoal, calculateGoalPV, requiredMonthlySIPForGoal } from '../../src/lib/goals';
import { runRetirementMonteCarlo } from '../../src/lib/monteCarlo';
import { runMVO } from '../../src/lib/mvo';
import { runWealthEngine } from '../../src/lib/wealthEngine';
import { buildAssumptionsFromMarketData } from '../../src/lib/assumptions';
import { computePortfolioMetrics, type PortfolioHoldingAnalytics } from '../../src/lib/portfolioAnalytics';
import type { MarketDataSet } from '../../src/lib/marketData';
import type { AssetCategory } from '../../src/types';
import { CATEGORIES, baseInputs, makeAsset, makeGoal, mean, stdDev, zeroAssumptions } from './helpers';

/**
 * Regression pins for every fix in the quantitative-correctness gate
 * (spec §5 + repo audit Phase 1). Each test targets the exact defect.
 */

describe('regression: monteCarlo.ts', () => {
  it('does not double-scale standard deviations (volatility ≈ 15%, not ~2%)', () => {
    // The audit bug: correlated = L·z was multiplied by stdDevs again, so a
    // 15% equity vol collapsed to ~2%. THE critical Monte Carlo defect.
    const outcomes = runOneYearEquitySim();
    const terminals = outcomes.map((o) => o.terminalCorpus);
    const cv = stdDev(terminals) / mean(terminals);
    assert.ok(
      cv > 0.12 && cv < 0.15,
      `realized volatility ${(cv * 100).toFixed(2)}% — expected ~13.4% (15% asset vol); the ~2% signature indicates double std scaling`,
    );
  });

  it('applies SIP step-up annually (not 1/12th of a year)', () => {
    const result = runRetirementMonteCarlo({
      currentAge: 40,
      retirementAge: 43,
      lifeExpectancy: 43,
      initialValues: { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 },
      weights: { equity: 1, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 },
      monthlySIP: 10_000,
      sipStepUp: 10,
      monthlyNeedAtRetirement: 0,
      inflation: 0,
      taxRate: 0,
      simulations: 200,
      means: { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 },
      covariance: zeroCovRecord(),
      seed: 'stepup-regression',
    });
    // Year contributions: 120K, 132K, 145.2K (zero returns → deterministic).
    assert.equal(result.medianTerminalCorpus, 397_200);
    assert.equal(result.meanTerminalCorpus, 397_200);
  });

  function runOneYearEquitySim() {
    const result = runRetirementMonteCarlo({
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
        c.equity.equity = 0.0225; // 15% annual vol
        return c;
      })(),
      seed: 'vol-regression',
    });
    return result.outcomes;
  }
});

describe('regression: goals.ts', () => {
  const volAssumptions = () => {
    const a = zeroAssumptions();
    a.categories.equity = { mean: 0.12, std: 0.15 };
    a.covariance.equity.equity = 0.0225; // the volatility channel is the covariance matrix
    return a;
  };

  it('does not double-scale standard deviations in goal simulation', () => {
    const goal = makeGoal({ targetAmount: 3_200_000, yearsToGoal: 10, inflation: 0 });
    const result = simulateGoal(
      goal,
      volAssumptions(),
      1_000_000,
      0,
      { equity: 1, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 },
      4000,
      'goal-vol-regression',
    );
    const m = mean(result.outcomes);
    const sd = stdDev(result.outcomes);
    // 10y of 15% equity vol: outcome dispersion is a large fraction of the mean.
    // The old bug (extra ×std) left dispersion at ~7% of the mean.
    assert.ok(
      sd / m > 0.2,
      `outcome dispersion ${((sd / m) * 100).toFixed(1)}% of mean — double std scaling suppresses vol to ~7%`,
    );
    // With true vol the success rate is strictly interior, not pinned to 0/1.
    assert.ok(result.successRate > 0.02 && result.successRate < 0.98, `successRate ${result.successRate} shows artificial certainty`);
  });

  it('does not double-discount inflation (nominal FV vs nominal rate)', () => {
    const goal = makeGoal({ targetAmount: 1_000_000, yearsToGoal: 10, inflation: 6 });
    assert.ok(Math.abs(calculateGoalPV(goal, 6) - 1_000_000) < 1e-6, 'PV at inflation parity must equal the target');

    // End-to-end: the SIP the math says is sufficient must actually fund the goal.
    const assumptions = zeroAssumptions();
    assumptions.categories.equity = { mean: 0.12, std: 0 };
    const target = makeGoal({ targetAmount: 3_200_000, yearsToGoal: 10, inflation: 0 });
    const sip = requiredMonthlySIPForGoal(target.targetAmount, target.yearsToGoal, 12);
    const result = simulateGoal(
      target,
      assumptions,
      0,
      sip,
      { equity: 1, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 },
      200,
      'goal-discount-regression',
    );
    assert.equal(result.successRate, 1);
    assert.ok(Math.min(...result.outcomes) >= target.targetAmount * 0.999, 'required SIP must fund the nominal FV');
  });
});

describe('regression: assumptions.ts', () => {
  it('deriving the correlation matrix does not mutate the covariance matrix', () => {
    const marketData: MarketDataSet = {
      symbols: ['NIFTY50'],
      instruments: [],
      prices: [],
      covariance: [],
      correlation: [],
      stats: [
        { symbol: 'NIFTY50', annualizedReturn: 0.135, annualizedVolatility: 0.182, sharpeRatio: 0, maxDrawdown: 0, count: 100 },
      ],
      dateRange: { from: '2016-01-01', to: '2026-01-01' },
      defaultSymbols: ['NIFTY50'],
      fetchedAt: '2026-01-01T00:00:00Z',
      source: 'default',
    };
    const a = buildAssumptionsFromMarketData(marketData);

    // The old shallow-copy bug wrote normalized correlations back into cov,
    // leaving diagonal entries of exactly 1.0 instead of the variance.
    const equityVar = a.categories.equity.std * a.categories.equity.std;
    assert.ok(Math.abs(a.covariance.equity.equity - equityVar) < 1e-12, 'covariance diagonal must be the variance');
    assert.notEqual(a.covariance.equity.equity, 1);
    assert.equal(a.correlation.equity.equity, 1);

    // Off-diagonal correlation is normalized; covariance is not.
    const expectedCorr = 0.2; // construction uses corr 0.2 for default off-diagonals
    assert.ok(Math.abs(a.correlation.equity.debt - expectedCorr) < 1e-9, 'correlation should be ~0.2');
    const expectedCov = expectedCorr * a.categories.equity.std * a.categories.debt.std;
    assert.ok(Math.abs(a.covariance.equity.debt - expectedCov) < 1e-12, 'covariance must stay un-normalized');
  });
});

describe('regression: wealthEngine.ts', () => {
  it('records per-year category snapshots (not the terminal values every year)', () => {
    const inputs = baseInputs({
      currentAge: 40,
      retirementAge: 45,
      lifeExpectancy: 50,
      assets: [makeAsset({ value: 1_000_000, returnRate: 10, category: 'equity' })],
    });
    const result = runWealthEngine(inputs, zeroAssumptions(), undefined, null, 'snapshot-regression');
    const yearlyEquity = result.snapshots.slice(1).map((s) => s.values.equity);
    for (let i = 1; i < yearlyEquity.length; i++) {
      assert.ok(yearlyEquity[i] > yearlyEquity[i - 1], 'equity must grow 10%/yr, snapshots must differ per year');
    }
    assert.ok(Math.abs(yearlyEquity[0] - 1_100_000) < 1, `year-1 equity ${yearlyEquity[0]}`);
    // Internal consistency: total equals the sum of category values every year.
    for (const s of result.snapshots) {
      const sum = Object.values(s.values).reduce((a, b) => a + b, 0);
      assert.ok(Math.abs(sum - s.total) < 0.05, `snapshot ${s.year}: total ${s.total} != sum ${sum}`);
    }
  });

  it('does not double-count the STP lumpsum (transfers leave the liquid bucket)', () => {
    const inputs = baseInputs({
      currentAge: 59,
      retirementAge: 60,
      lifeExpectancy: 65,
      assets: [makeAsset({ value: 350_000, returnRate: 0, category: 'liquid' })],
      stp: {
        active: true,
        source: 'idle-cash',
        lumpsum: 350_000,
        monthlyTransfer: 10_000_000, // deploys everything in month 1
        liquidReturn: 0,
        equitySplit: 50,
        debtSplit: 50,
        liquidCap: 100_000,
      },
    });
    const result = runWealthEngine(inputs, zeroAssumptions(), undefined, null, 'stp-regression');
    const y1 = result.snapshots[1];
    // 350K moved from liquid to equity/debt: total unchanged, liquid emptied.
    assert.ok(Math.abs(y1.total - 350_000) < 1e-6, `year-1 total ${y1.total} — STP lumpsum was double-counted`);
    assert.ok(Math.abs(y1.values.equity - 175_000) < 1e-6, 'STP equity deployment');
    assert.ok(Math.abs(y1.values.debt - 175_000) < 1e-6, 'STP debt deployment');
    assert.ok(y1.values.liquid < 1e-6, 'liquid must be drained by the STP');
  });

  it('honors liquidateAtRetirement=false by excluding retained assets from the SWP corpus', () => {
    const inputs = baseInputs({
      currentAge: 59,
      retirementAge: 60,
      lifeExpectancy: 65,
      assets: [makeAsset({ value: 1_000_000, returnRate: 0, category: 'realestate', liquidateAtRetirement: false })],
      swp: { monthlyNeedToday: 50_000, postRetirementReturn: 0, taxRate: 0, startAge: 60, endAge: 65 },
    });
    const result = runWealthEngine(inputs, zeroAssumptions(), undefined, null, 'retained-regression');
    // SWP corpus is empty at retirement → immediate shortfall at age 60.
    assert.equal(result.depletionAge, 60);
    // But the retained asset is never withdrawn: it persists at 10L to the end.
    const last = result.snapshots[result.snapshots.length - 1];
    assert.ok(Math.abs(last.total - 1_000_000) < 1e-6, `terminal total ${last.total} — retained asset was spent`);
    const retainedEvent = result.snapshots
      .flatMap((s) => s.cashFlows)
      .find((cf) => cf.description.includes('retained at retirement'));
    assert.ok(retainedEvent, 'expected a retained-asset cash flow event');
  });

  it('preserves custom per-asset return rates instead of overwriting them with category means', () => {
    const inputs = baseInputs({
      currentAge: 40,
      retirementAge: 45,
      lifeExpectancy: 50,
      assets: [makeAsset({ value: 1_000_000, returnRate: 20, category: 'equity' })],
    });
    const result = runWealthEngine(inputs, zeroAssumptions(), undefined, null, 'custom-return-regression');
    // Category mean is 0 in zeroAssumptions; only the custom 20% rate may apply.
    assert.ok(Math.abs(result.snapshots[1].values.equity - 1_200_000) < 1, `year-1 equity ${result.snapshots[1].values.equity}`);
  });

  it('grows income with inflation during accumulation (tax flows increase yearly)', () => {
    const inputs = baseInputs({
      currentAge: 40,
      retirementAge: 45,
      lifeExpectancy: 50,
      inflation: 6,
      annualIncome: 1_200_000,
    });
    const result = runWealthEngine(inputs, zeroAssumptions(), undefined, null, 'income-growth-regression');
    const taxFlows = result.snapshots
      .filter((s) => s.phase === 'accumulation')
      .map((s) => s.cashFlows.find((cf) => cf.type === 'tax'))
      .filter((cf): cf is NonNullable<typeof cf> => Boolean(cf))
      .map((cf) => cf.amount);
    assert.ok(taxFlows.length >= 4, 'expected tax flows across accumulation years');
    // Mirror of the engine's slab schedule: with income growing at 6%, the tax
    // on year y must equal tax(1.2M · 1.06^(y−1)). Flat income (the old bug)
    // produces identical tax every year.
    taxFlows.forEach((tax, i) => {
      const expectedIncome = 1_200_000 * Math.pow(1.06, i);
      assert.ok(Math.abs(tax - expectedTax(expectedIncome)) < 0.01, `year ${i + 1} tax ${tax} != slab tax on ${expectedIncome}`);
    });
  });

  it('reports the first depletion year (forward search), not the last zero year', () => {
    const inputs = baseInputs({
      currentAge: 40,
      retirementAge: 41,
      lifeExpectancy: 60,
      assets: [makeAsset({ value: 1_200_000, returnRate: 0, category: 'liquid' })],
      swp: { monthlyNeedToday: 11_000, postRetirementReturn: 0, taxRate: 0, startAge: 41, endAge: 60 },
    });
    const result = runWealthEngine(inputs, zeroAssumptions(), undefined, null, 'depletion-regression');
    // 12L corpus, 1.32L/yr withdrawals (11K/mo), zero growth → year 11 is the
    // first shortfall → age 40 + 11 − 1 = 50.
    assert.equal(result.depletionAge, 50);
    assert.equal(result.sustainable, false);
  });
});

describe('regression: calculations.ts', () => {
  it('calculateMasterPlan does not re-deploy the STP lumpsum every year', () => {
    const inputs = baseInputs({
      currentAge: 40,
      retirementAge: 42,
      lifeExpectancy: 45,
      stp: {
        active: true,
        source: 'custom',
        lumpsum: 120_000,
        monthlyTransfer: 10_000, // exactly 12 months of deployment
        liquidReturn: 0,
        equitySplit: 50,
        debtSplit: 50,
        liquidCap: 100_000,
      },
    });
    const result = calculateMasterPlan(inputs);
    const y1 = result.snapshots[1];
    const y2 = result.snapshots[2];
    assert.equal(y1.equity, 60_000);
    assert.equal(y1.debt, 60_000);
    assert.equal(y1.liquid, 0);
    assert.equal(y2.equity, 60_000, 'STP redeployed the lumpsum in year 2');
    assert.equal(y2.debt, 60_000, 'STP redeployed the lumpsum in year 2');
  });

  it('calculateMasterPlan propagates the SIP step-up across years', () => {
    const inputs = baseInputs({
      currentAge: 40,
      retirementAge: 42,
      lifeExpectancy: 45,
      sip: { amount: 10_000, equitySplit: 100, debtSplit: 0, stepUp: 10, equityReturn: 0, debtReturn: 0 },
    });
    const result = calculateMasterPlan(inputs);
    assert.equal(result.totalInvested, 120_000 + 132_000);
  });

  it('calculateMasterPlan does not double-count retained (non-liquidated) assets', () => {
    const inputs = baseInputs({
      currentAge: 40,
      retirementAge: 41,
      lifeExpectancy: 46,
      assets: [
        makeAsset({ id: 'liquid', value: 500_000, returnRate: 0, category: 'liquid', liquidateAtRetirement: true }),
        makeAsset({ id: 'plot', value: 1_000_000, returnRate: 0, category: 'realestate', liquidateAtRetirement: false }),
      ],
      swp: { monthlyNeedToday: 10_000, postRetirementReturn: 0, taxRate: 0, startAge: 41, endAge: 46 },
    });
    const result = calculateMasterPlan(inputs);
    // SWP corpus must contain only the liquidatable 5L; the 10L plot is retained.
    assert.equal(result.terminalCorpusNominal, 500_000);
    // 5L at 1.2L/yr depletes in year 5 of distribution → 41 + 5 − 1 = 45.
    assert.equal(result.depletionAge, 45);
    const last = result.snapshots[result.snapshots.length - 1];
    assert.equal(last.age, 46);
    assert.equal(last.other, 1_000_000, 'retained asset must persist untouched');
  });
});

describe('regression: mvo.ts', () => {
  it('max-Sharpe refinement converges to the analytic tangent portfolio', () => {
    const means = [0.12, 0.07];
    const covariance = [
      [0.0225, 0.001],
      [0.001, 0.0025],
    ];
    const result = runMVO(['E', 'D'], means, covariance, { samples: 25_000, seed: 'mvo-gradient-gate' });
    // Analytic: w ∝ Σ⁻¹(μ − rf·1) → (0.459, 0.541), Sharpe ≈ 0.4265.
    assert.ok(Math.abs(result.maxSharpe.sharpe - 0.4265) < 0.015, `sharpe ${result.maxSharpe.sharpe} ≠ analytic 0.4265`);
    assert.ok(
      result.maxSharpe.weights[0] > 0.4 && result.maxSharpe.weights[0] < 0.58,
      `equity weight ${result.maxSharpe.weights[0]} outside analytic band around 0.459`,
    );
    assert.ok(Math.abs(result.maxSharpe.weights.reduce((a, b) => a + b, 0) - 1) < 1e-6);
  });

  it('applies the equity cap after gradient refinement (cap binds at the optimum)', () => {
    const result = runMVO(['E', 'D'], [0.15, 0.05], [
      [0.04, 0],
      [0, 0.01],
    ], {
      samples: 25_000,
      seed: 'mvo-cap-gate',
      constraints: { maxEquity: 0.5, equityMask: [true, false] },
    });
    // Unconstrained optimum is 100% equity; the cap must bind at exactly 0.5.
    assert.ok(result.maxSharpe.weights[0] <= 0.5 + 1e-6, `equity ${result.maxSharpe.weights[0]} exceeds cap after refinement`);
    assert.ok(result.maxSharpe.weights[0] >= 0.4999, `equity ${result.maxSharpe.weights[0]} — cap should bind`);
    assert.ok(Math.abs(result.maxSharpe.weights[1] - 0.5) < 1e-6, 'non-equity must absorb the capped excess');
    assert.ok(Math.abs(result.maxSharpe.sharpe - 0.3578) < 0.01, `constrained sharpe ${result.maxSharpe.sharpe} ≠ 0.3578`);
  });
});

describe('regression: portfolioAnalytics.ts', () => {
  it('portfolio volatility uses the full covariance matrix, not sum of squared variances', () => {
    const holdings: PortfolioHoldingAnalytics[] = [
      { symbol: 'NIFTYBEES', token: '1', exchange: 'NSE', quantity: 100, avgPrice: 90, ltp: 100, value: 10_000, invested: 9_000, pnl: 1_000, pnlPercent: 10, weight: 50, category: 'equity' },
      { symbol: 'LIQUIDFUND', token: '2', exchange: 'NSE', quantity: 100, avgPrice: 90, ltp: 100, value: 10_000, invested: 9_000, pnl: 1_000, pnlPercent: 10, weight: 50, category: 'debt' },
    ];
    const covMatrix = CATEGORIES.map((a) =>
      CATEGORIES.map((b) =>
        a === 'equity' && b === 'equity' ? 0.04
        : a === 'debt' && b === 'debt' ? 0.01
        : (a === 'equity' && b === 'debt') || (a === 'debt' && b === 'equity') ? 0.02
        : 0,
      ),
    );
    const full = computePortfolioMetrics(holdings, [], 0.06, covMatrix);
    // Diagonal-only (the old bug) would give sqrt(0.25·0.04 + 0.25·0.01) ≈ 0.1118.
    const diagOnly = Math.sqrt(0.25 * 0.04 + 0.25 * 0.01);
    assert.ok(
      full.annualizedVolatility > diagOnly + 0.02,
      `vol ${full.annualizedVolatility} ignores the equity-debt covariance term`,
    );
    assert.ok(Math.abs(full.annualizedVolatility - 0.15) < 1e-9, 'vol must equal sqrt(wᵀΣw) = 0.15');
  });
});

// --- helpers -----------------------------------------------------------------

/**
 * Mirror of the engine's income-tax slab schedule (wealthEngine.calculateTax),
 * used to pin that pre-retirement income grows at the inflation rate.
 */
function expectedTax(income: number): number {
  const slabs: { min: number; max: number | null; rate: number }[] = [
    { min: 0, max: 400_000, rate: 0 },
    { min: 400_000, max: 800_000, rate: 0.05 },
    { min: 800_000, max: 1_200_000, rate: 0.10 },
    { min: 1_200_000, max: 1_600_000, rate: 0.15 },
    { min: 1_600_000, max: 2_000_000, rate: 0.20 },
    { min: 2_000_000, max: 2_400_000, rate: 0.25 },
    { min: 2_400_000, max: null, rate: 0.30 },
  ];
  let tax = 0;
  for (const slab of slabs) {
    if (income > slab.min) {
      const taxable = Math.min(income, slab.max ?? Infinity) - slab.min;
      if (taxable > 0) tax += taxable * slab.rate;
    }
  }
  return tax * 1.04;
}

function zeroCovRecord(): Record<AssetCategory, Record<AssetCategory, number>> {
  const row = () => Object.fromEntries(CATEGORIES.map((c) => [c, 0]));
  return Object.fromEntries(CATEGORIES.map((c) => [c, row()])) as Record<AssetCategory, Record<AssetCategory, number>>;
}
