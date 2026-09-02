import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runWealthEngine } from '../src/lib/wealthEngine';
import { getDefaultAssumptions } from '../src/lib/assumptions';
import { defaultClientInputs } from '../src/lib/scenarios';

describe('wealthEngine', () => {
  it('runWealthEngine returns the expected top-level keys', () => {
    const inputs = defaultClientInputs();
    const assumptions = getDefaultAssumptions();
    const result = runWealthEngine(inputs, assumptions);

    const expectedKeys = [
      'netWorth',
      'totalInvested',
      'annualIncome',
      'annualSavings',
      'savingsRate',
      'annualInvested',
      'investmentRate',
      'monthlySIP',
      'annualExpenses',
      'snapshots',
      'terminalValue',
      'terminalRealValue',
      'depletionAge',
      'sustainable',
      'cagrNominal',
      'cagrReal',
      'goalResults',
      'essentialSuccessRate',
      'overallGoalSuccessRate',
      'goalsAtRisk',
      'monteCarlo',
      'currentAllocation',
      'targetAllocation',
      'projectedAllocation',
      'rebalancingTrades',
      'taxSummary',
      'currencyExposure',
      'riskScore',
      'maxDrawdownProbability',
    ];

    for (const key of expectedKeys) {
      assert.ok(key in result, `expected key ${key} in result`);
    }

    assert.ok(Array.isArray(result.snapshots));
    assert.ok(result.snapshots.length > 0);
    assert.ok(typeof result.sustainable === 'boolean');
    assert.ok(result.monteCarlo && typeof result.monteCarlo === 'object');
    assert.ok(Array.isArray(result.monteCarlo.outcomes));
    assert.ok(Array.isArray(result.goalResults));
    assert.equal(result.goalResults.length, inputs.goals.length);
    assert.ok(Array.isArray(result.rebalancingTrades));
  });

  it('runWealthEngine computes net worth from assets', () => {
    const inputs = defaultClientInputs();
    const assumptions = getDefaultAssumptions();
    const result = runWealthEngine(inputs, assumptions);
    const expectedNetWorth = inputs.assets.reduce((sum, a) => sum + a.value, 0);
    assert.equal(result.netWorth, expectedNetWorth);
  });

  it('runWealthEngine returns financially sensible value ranges', () => {
    const inputs = defaultClientInputs();
    const assumptions = getDefaultAssumptions();
    const result = runWealthEngine(inputs, assumptions);

    assert.ok(result.netWorth >= 0);
    assert.ok(result.monteCarlo.successRate >= 0 && result.monteCarlo.successRate <= 1);
    assert.ok(result.cagrNominal > -50 && result.cagrNominal < 50);
    assert.ok(result.cagrReal > -50 && result.cagrReal < 50);
    if (result.depletionAge !== null) {
      assert.ok(result.depletionAge >= inputs.currentAge);
      assert.ok(result.depletionAge <= inputs.lifeExpectancy);
    }

    const allocSum = Object.values(result.projectedAllocation).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(allocSum - 1) < 1e-6 || result.terminalValue === 0, `projected allocation sums to ${allocSum}`);
  });

  it('runWealthEngine handles zero assets', () => {
    const inputs = { ...defaultClientInputs(), assets: [] };
    const assumptions = getDefaultAssumptions();
    const result = runWealthEngine(inputs, assumptions);
    assert.equal(result.netWorth, 0);
    assert.ok(Array.isArray(result.snapshots));
    assert.ok(result.snapshots.length > 0);
  });

  it('runWealthEngine handles retirement age equal to current age', () => {
    const inputs = { ...defaultClientInputs(), retirementAge: defaultClientInputs().currentAge };
    const assumptions = getDefaultAssumptions();
    const result = runWealthEngine(inputs, assumptions);
    assert.ok(Array.isArray(result.snapshots));
    assert.ok(result.snapshots.length > 0);
  });
});
