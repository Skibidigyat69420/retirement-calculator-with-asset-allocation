import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { simulateGoalPlan } from '../src/lib/goalMonteCarlo';
import { getDefaultAssumptions } from '../src/lib/assumptions';
import type { Goal } from '../src/types';

const assumptions = getDefaultAssumptions();

const weights = { equity: 0.6, debt: 0.3, gold: 0.05, realestate: 0, liquid: 0.05, other: 0 };

function makeGoal(partial: Partial<Goal> = {}): Goal {
  return {
    id: partial.id ?? `g-${Math.random().toString(36).slice(2, 8)}`,
    name: partial.name ?? 'Education',
    targetAmount: partial.targetAmount ?? 5_000_000,
    yearsToGoal: partial.yearsToGoal ?? 10,
    priority: partial.priority ?? 'important',
    inflation: partial.inflation ?? 7,
    recurring: false,
    ...partial,
  };
}

describe('simulateGoalPlan', () => {
  it('is deterministic for a fixed seed', () => {
    const goals = [makeGoal(), makeGoal({ id: 'b', name: 'Home', targetAmount: 8_000_000, yearsToGoal: 15 })];
    const base = {
      goals,
      currentPortfolioValue: 2_000_000,
      monthlySIP: 50_000,
      portfolioWeights: weights,
      assumptions,
      simulations: 400,
      seed: 'fixed-seed',
    };
    const a = simulateGoalPlan(base);
    const b = simulateGoalPlan(base);
    assert.equal(a.planSuccessRate, b.planSuccessRate);
    assert.deepEqual(
      a.goals.map((g) => g.successRate),
      b.goals.map((g) => g.successRate),
    );
    assert.deepEqual(
      a.yearlyCorpus.map((y) => y.p50),
      b.yearlyCorpus.map((y) => y.p50),
    );
  });

  it('computes exact deterministic growth when volatility is zero', () => {
    const noVol = getDefaultAssumptions();
    for (const c of Object.keys(noVol.categories) as (keyof typeof noVol.categories)[]) {
      noVol.categories[c] = { ...noVol.categories[c], std: 0 };
      noVol.covariance[c] = { ...noVol.covariance[c] };
      for (const k of Object.keys(noVol.covariance[c])) noVol.covariance[c][k as keyof typeof noVol.covariance[typeof c]] = 0;
    }
    // equity-only portfolio at a known mean
    const eqOnly = { equity: 1, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 } as typeof weights;
    const goals = [makeGoal({ targetAmount: 100, yearsToGoal: 1, inflation: 0 })];
    const result = simulateGoalPlan({
      goals,
      currentPortfolioValue: 0,
      monthlySIP: 1000,
      portfolioWeights: eqOnly,
      assumptions: noVol,
      simulations: 50,
      seed: 'det',
    });
    // corpus after 1y = 12000 * 1.135 = 13620 → covers cost 100 in every path
    assert.equal(result.goals[0].successRate, 1);
    assert.equal(result.planSuccessRate, 1);
    assert.equal(result.goals[0].medianCorpusAtHorizon, 13620);
    assert.equal(result.goals[0].expectedShortfall, 0);
  });

  it('success is monotonic in the SIP amount', () => {
    const goals = [makeGoal({ targetAmount: 12_000_000, yearsToGoal: 12 })];
    const low = simulateGoalPlan({
      goals, currentPortfolioValue: 1_000_000, monthlySIP: 20_000,
      portfolioWeights: weights, assumptions, simulations: 400, seed: 'mono',
    });
    const high = simulateGoalPlan({
      goals, currentPortfolioValue: 1_000_000, monthlySIP: 150_000,
      portfolioWeights: weights, assumptions, simulations: 400, seed: 'mono',
    });
    assert.ok(high.planSuccessRate >= low.planSuccessRate, 'higher SIP should not reduce success');
    assert.ok(high.goals[0].medianCorpusAtHorizon > low.goals[0].medianCorpusAtHorizon);
  });

  it('plan success never exceeds any single goal success (waterfall)', () => {
    const goals = [
      makeGoal({ id: 'near', targetAmount: 30_000_000, yearsToGoal: 3 }),
      makeGoal({ id: 'far', targetAmount: 3_000_000, yearsToGoal: 20 }),
    ];
    const result = simulateGoalPlan({
      goals, currentPortfolioValue: 500_000, monthlySIP: 30_000,
      portfolioWeights: weights, assumptions, simulations: 400, seed: 'waterfall',
    });
    const minGoalSuccess = Math.min(...result.goals.map((g) => g.successRate));
    assert.ok(result.planSuccessRate <= minGoalSuccess + 1e-9);
  });

  it('shortfalls are non-negative and expected shortfall only counts failures', () => {
    const goals = [makeGoal({ targetAmount: 40_000_000, yearsToGoal: 5 })];
    const result = simulateGoalPlan({
      goals, currentPortfolioValue: 100_000, monthlySIP: 10_000,
      portfolioWeights: weights, assumptions, simulations: 400, seed: 'shortfall',
    });
    const g = result.goals[0];
    assert.ok(g.expectedShortfall >= 0);
    if (g.successRate < 1) assert.ok(g.expectedShortfall > 0);
    if (g.successRate === 1) assert.equal(g.expectedShortfall, 0);
  });

  it('solves a required SIP that reaches the target confidence when feasible', () => {
    const goals = [makeGoal({ targetAmount: 8_000_000, yearsToGoal: 10 })];
    const result = simulateGoalPlan({
      goals, currentPortfolioValue: 1_000_000, monthlySIP: 30_000,
      portfolioWeights: weights, assumptions, simulations: 500, seed: 'solve', targetConfidence: 0.75,
    });
    if (result.planSuccessRate < 0.75) {
      assert.ok(result.requiredSIP > 30_000, 'required SIP should exceed current when under-funded');
      // verify the solved SIP actually delivers
      const verify = simulateGoalPlan({
        goals, currentPortfolioValue: 1_000_000, monthlySIP: result.requiredSIP,
        portfolioWeights: weights, assumptions, simulations: 500, seed: 'solve-verify', targetConfidence: 0.75,
      });
      assert.ok(verify.planSuccessRate >= 0.7, `solved SIP should land near target, got ${verify.planSuccessRate}`);
    } else {
      assert.equal(result.requiredSIP, 30_000);
    }
  });

  it('handles an empty goal list as fully successful with no fan data', () => {
    const result = simulateGoalPlan({
      goals: [], currentPortfolioValue: 1_000_000, monthlySIP: 50_000,
      portfolioWeights: weights, assumptions, simulations: 200, seed: 'empty',
    });
    assert.equal(result.planSuccessRate, 1);
    assert.equal(result.yearlyCorpus.length, 0);
    assert.equal(result.goals.length, 0);
  });

  it('cost at horizon applies the goal inflation rate', () => {
    const goals = [makeGoal({ targetAmount: 1_000_000, yearsToGoal: 10, inflation: 7 })];
    const result = simulateGoalPlan({
      goals, currentPortfolioValue: 500_000_000, monthlySIP: 500_000,
      portfolioWeights: weights, assumptions, simulations: 200, seed: 'fv',
    });
    const expected = 1_000_000 * Math.pow(1.07, 10);
    assert.ok(Math.abs(result.goals[0].costAtHorizon - expected) < 1);
    assert.equal(result.planSuccessRate, 1);
  });
});
