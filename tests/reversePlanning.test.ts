import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runReversePlanning } from '../src/lib/reversePlanning';
import { runWealthEngine } from '../src/lib/wealthEngine';
import { getDefaultAssumptions } from '../src/lib/assumptions';
import { defaultClientInputs } from '../src/lib/scenarios';

describe('reversePlanning', () => {
  const inputs = defaultClientInputs();
  const assumptions = getDefaultAssumptions();
  const wealthResult = runWealthEngine(inputs, assumptions);

  it('solves required SIP for target corpus at age 55', () => {
    const result = runReversePlanning(inputs, wealthResult, {
      targetCorpus: 300000000, // ₹30 Cr (requires incremental SIP beyond current wealth compounding)
      targetAge: 55,
    });

    assert.equal(result.targetCorpus, 300000000);
    assert.equal(result.targetAge, 55);
    assert.ok(result.requiredMonthlySip > 0, 'Required SIP should be positive');
    assert.ok(result.yearsToTarget > 0);
    assert.ok(result.pathways.length === 4, 'Should generate 4 pathways');
  });

  it('solves required initial corpus capital injection', () => {
    const result = runReversePlanning(inputs, wealthResult, {
      targetCorpus: 50000000, // ₹5 Cr
      targetAge: 60,
    });

    assert.ok(Number.isFinite(result.requiredInitialCorpus));
    assert.ok(result.requiredInitialCorpus >= 0);
  });

  it('solves maximum sustainable monthly spending', () => {
    const result = runReversePlanning(inputs, wealthResult, {
      targetCorpus: 60000000,
      targetAge: 60,
    });

    assert.ok(result.maxSustainableMonthlySpend > 0, 'Max safe spend should be positive');
  });

  it('solves feasible retirement age and required return', () => {
    const result = runReversePlanning(inputs, wealthResult, {
      targetCorpus: 80000000,
      targetAge: 60,
    });

    assert.ok(result.feasibleRetirementAge >= inputs.currentAge);
    assert.ok(result.feasibleRetirementAge <= 90);
    assert.ok(result.requiredAnnualReturnPct > 0);
  });

  it('generates coherent, executable synthesis pathways', () => {
    const result = runReversePlanning(inputs, wealthResult, {
      targetCorpus: 100000000,
      targetAge: 55,
    });

    const pathA = result.pathways.find((p) => p.id === 'path-a');
    const pathB = result.pathways.find((p) => p.id === 'path-b');
    const pathC = result.pathways.find((p) => p.id === 'path-c');
    const pathD = result.pathways.find((p) => p.id === 'path-d');

    assert.ok(pathA && pathB && pathC && pathD, 'All 4 pathways should exist');
    assert.ok(pathA.requiredSipMonthly > 0);
    assert.ok(pathB.projectedRetirementAge > inputs.currentAge);
    assert.ok(pathC.monthlyRetirementSpending > 0);
    assert.ok(pathD.patch.sip !== undefined);
  });
});
