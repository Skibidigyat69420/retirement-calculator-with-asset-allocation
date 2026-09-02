import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSIPMonthly,
  calculateCAGR,
  calculateSIPStandalone,
  calculateSWPStandalone,
  requiredLumpsumForGoal,
  calculateMasterPlan,
} from '../src/lib/calculations';
import { defaultClientInputs } from '../src/lib/scenarios';

describe('calculations', () => {
  it('calculateSIPMonthly compounds principal and contributions', () => {
    const value = calculateSIPMonthly(100_000, 12, 12, 10_000);
    assert.ok(value > 100_000 + 10_000 * 12, 'future value should exceed simple sum');
    assert.ok(Number.isFinite(value));
  });

  it('calculateCAGR returns zero for invalid inputs', () => {
    assert.equal(calculateCAGR(0, 200, 5), 0);
    assert.equal(calculateCAGR(100, 200, 0), 0);
  });

  it('calculateCAGR computes compound growth', () => {
    const cagr = calculateCAGR(100, 200, 5);
    assert.ok(cagr > 0 && cagr < 20, `expected positive CAGR, got ${cagr}`);
  });

  it('calculateSIPStandalone returns invested, gained, total and monthlyData', () => {
    const result = calculateSIPStandalone(10_000, 12, 5, 10);
    assert.ok(result.invested > 0);
    assert.ok(result.total > result.invested);
    assert.ok(result.gained > 0);
    assert.ok(Array.isArray(result.monthlyData));
    assert.equal(result.monthlyData.length, 5);
  });

  it('calculateSWPStandalone detects depletion for aggressive withdrawals', () => {
    const result = calculateSWPStandalone(1_000_000, 50_000, 8, 5, 10);
    assert.equal(result.sustainable, false);
    assert.ok(result.depletionYear !== null);
    assert.ok(Array.isArray(result.yearlyData));
  });

  it('calculateSWPStandalone sustains conservative withdrawals', () => {
    const result = calculateSWPStandalone(10_000_000, 20_000, 8, 5, 10, 30);
    assert.equal(result.sustainable, true);
    assert.equal(result.depletionYear, null);
  });

  it('requiredLumpsumForGoal discounts target to present value', () => {
    const pv = requiredLumpsumForGoal(1_000_000, 5, 12);
    assert.ok(pv > 0 && pv < 1_000_000);
  });

  it('calculateSIPMonthly handles zero months gracefully', () => {
    const value = calculateSIPMonthly(100_000, 12, 0, 10_000);
    assert.equal(value, 100_000);
  });

  it('calculateSWPStandalone handles zero corpus as unsustainable', () => {
    const result = calculateSWPStandalone(0, 20_000, 8, 5, 10);
    assert.equal(result.sustainable, false);
    assert.equal(result.depletionYear, 1);
  });

  it('calculateMasterPlan handles zero income without crashing', () => {
    const inputs = { ...defaultClientInputs(), annualIncome: 0 };
    const result = calculateMasterPlan(inputs);
    assert.ok(Array.isArray(result.snapshots));
    assert.ok(result.snapshots.length > 0);
  });

  it('calculateMasterPlan produces a full snapshot trail', () => {
    const inputs = defaultClientInputs();
    const result = calculateMasterPlan(inputs);
    assert.ok(Array.isArray(result.snapshots));
    assert.ok(result.snapshots.length > 0);
    assert.ok(result.terminalCorpusNominal >= 0);
    assert.ok(typeof result.sustainable === 'boolean');
    assert.ok(result.totalInvested >= 0);
    assert.ok(result.monthlyNeedAtRetirement >= 0);
    const first = result.snapshots[0];
    assert.equal(first.year, 0);
    assert.equal(first.age, inputs.currentAge);
    const last = result.snapshots[result.snapshots.length - 1];
    assert.equal(last.age, inputs.lifeExpectancy);
  });
});
