import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyPlan, defaultClientInputs, demoClientInputs } from '../src/lib/scenarios';
import { runWealthEngine } from '../src/lib/wealthEngine';
import { getDefaultAssumptions } from '../src/lib/assumptions';
import type { MasterPlanInputs } from '../src/types';

const ALL_NUMERIC_FIELDS: (keyof MasterPlanInputs)[] = [
  'currentAge',
  'retirementAge',
  'lifeExpectancy',
  'inflation',
  'annualIncome',
  'monthlyExpenditure',
];

describe('zero-state defaults', () => {
  it('createEmptyPlan zeroes every numeric field and empties every array/text field', () => {
    const plan = createEmptyPlan();

    for (const field of ALL_NUMERIC_FIELDS) {
      assert.equal(plan[field], 0, `${field} should be 0`);
    }
    assert.equal(plan.client.name, '');
    assert.equal(plan.client.email, '');
    assert.equal(plan.client.advisor, '');
    assert.equal(plan.client.reviewDate, '');
    assert.equal(plan.client.notes, '');
    assert.deepEqual(plan.assets, []);
    assert.deepEqual(plan.goals, []);

    assert.equal(plan.sip.amount, 0);
    assert.equal(plan.sip.equitySplit, 0);
    assert.equal(plan.sip.debtSplit, 0);
    assert.equal(plan.sip.stepUp, 0);
    assert.equal(plan.sip.equityReturn, 0);
    assert.equal(plan.sip.debtReturn, 0);

    assert.equal(plan.stp.active, false);
    assert.equal(plan.stp.lumpsum, 0);
    assert.equal(plan.stp.monthlyTransfer, 0);
    assert.equal(plan.stp.liquidReturn, 0);
    assert.equal(plan.stp.equitySplit, 0);
    assert.equal(plan.stp.debtSplit, 0);
    assert.equal(plan.stp.liquidCap, 0);

    assert.equal(plan.swp.monthlyNeedToday, 0);
    assert.equal(plan.swp.postRetirementReturn, 0);
    assert.equal(plan.swp.taxRate, 0);
    assert.equal(plan.swp.startAge, 0);
    assert.equal(plan.swp.endAge, 0);
  });

  it('defaultClientInputs matches the empty-plan contract', () => {
    const defaults = defaultClientInputs();
    const empty = createEmptyPlan();

    assert.deepEqual(defaults, empty);
    assert.equal(defaults.annualIncome, 0);
    assert.equal(defaults.assets.length, 0);
    assert.equal(defaults.goals.length, 0);
    assert.equal(defaults.client.name, '');
  });

  it('demoClientInputs is non-zero and only reachable explicitly', () => {
    const demo = demoClientInputs();

    assert.notEqual(demo.client.name, '');
    assert.ok(demo.currentAge > 0);
    assert.ok(demo.retirementAge > demo.currentAge);
    assert.ok(demo.lifeExpectancy > 0);
    assert.ok(demo.annualIncome > 0);
    assert.ok(demo.monthlyExpenditure > 0);
    assert.ok(demo.assets.length > 0);
    assert.ok(demo.goals.length > 0);
    assert.ok(demo.sip.amount > 0);
    assert.ok(demo.stp.lumpsum > 0);
    assert.ok(demo.swp.monthlyNeedToday > 0);
    assert.ok(demo.inflation > 0);

    // The blank default must never secretly be the demo.
    const defaults = defaultClientInputs();
    assert.notDeepEqual(demo, defaults);
  });

  it('runWealthEngine on an empty plan returns a neutral, finite, unconfigured result', () => {
    const result = runWealthEngine(createEmptyPlan(), getDefaultAssumptions());

    assert.equal(result.isConfigured, false);
    assert.equal(result.netWorth, 0);
    assert.equal(result.terminalValue, 0);
    assert.equal(result.sustainable, false);
    assert.equal(result.monteCarlo.successRate, 0);
    assert.deepEqual(result.snapshots, []);
    assert.deepEqual(result.goalResults, []);

    const walk = (v: unknown): number[] => {
      if (typeof v === 'number') return [v];
      if (Array.isArray(v)) return v.flatMap(walk);
      if (v && typeof v === 'object') return Object.values(v).flatMap(walk);
      return [];
    };
    for (const n of walk(result)) {
      assert.ok(Number.isFinite(n), `expected finite output, got ${n}`);
    }
  });
});
