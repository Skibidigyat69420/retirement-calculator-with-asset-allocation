import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runWealthEngine } from '../src/lib/wealthEngine';
import { getDefaultAssumptions } from '../src/lib/assumptions';
import { defaultClientInputs } from '../src/lib/scenarios';
import { evaluateGoalConflicts } from '../src/lib/goalConflictEngine';
import type { Goal } from '../src/types';

describe('Goal Connections & Enhancements', () => {
  it('funds post-retirement milestone goals during the distribution phase', () => {
    const inputs = defaultClientInputs();
    inputs.currentAge = 40;
    inputs.retirementAge = 50; // 10 years accumulation
    inputs.lifeExpectancy = 70; // 20 years distribution
    inputs.swp.monthlyNeedToday = 50000;

    // Add a goal maturing during retirement at year 15 (age 55)
    const postRetirementGoal: Goal = {
      id: 'post-ret-goal-1',
      name: 'Legacy Philanthropy Transfer',
      targetAmount: 2000000,
      yearsToGoal: 15,
      priority: 'essential',
      inflation: 5,
      recurring: false,
    };

    inputs.goals = [postRetirementGoal];
    const assumptions = getDefaultAssumptions();
    const result = runWealthEngine(inputs, assumptions, undefined, 200, 42);

    // Verify goal result exists
    const goalRes = result.goalResults.find((g) => g.goal.id === 'post-ret-goal-1');
    assert.ok(goalRes, 'Post-retirement goal result should exist');
    assert.ok(goalRes.futureValue > postRetirementGoal.targetAmount, 'Future value should be inflation-adjusted');
    assert.ok(goalRes.successRate >= 0 && goalRes.successRate <= 1, 'Success rate should be a valid probability');

    // Verify cash flow event for goal in year 15 is recorded in snapshots
    const snapshotYear15 = result.snapshots.find((s) => s.year === 15);
    assert.ok(snapshotYear15, 'Snapshot for year 15 should exist');
    const goalCashFlow = snapshotYear15.cashFlows.find((cf) => cf.type === 'goal');
    assert.ok(goalCashFlow, 'Snapshot year 15 should contain a goal cashflow');
    assert.strictEqual(goalCashFlow.amount > 0, true, 'Goal cashflow amount should be positive');
  });

  it('persists and prioritizes custom priorityRank in evaluateGoalConflicts', () => {
    const inputs = defaultClientInputs();
    const assumptions = getDefaultAssumptions();
    const wealthResult = runWealthEngine(inputs, assumptions, undefined, 100, 42);

    const goalA: Goal = {
      id: 'goal-a',
      name: 'Home Renovation',
      targetAmount: 1500000,
      yearsToGoal: 5,
      priority: 'important',
      inflation: 6,
      recurring: false,
      priorityRank: 2,
    };

    const goalB: Goal = {
      id: 'goal-b',
      name: 'Child Ivy League Tuition',
      targetAmount: 5000000,
      yearsToGoal: 8,
      priority: 'essential',
      inflation: 9,
      recurring: false,
      priorityRank: 1,
    };

    // Passed with goalA first in the array, but goalB has priorityRank 1
    inputs.goals = [goalA, goalB];

    const conflictResult = evaluateGoalConflicts(inputs, wealthResult);

    assert.strictEqual(conflictResult.evaluatedGoals.length, 2);
    assert.strictEqual(
      conflictResult.evaluatedGoals[0].id,
      'goal-b',
      'Goal B with priorityRank 1 should be ranked first',
    );
    assert.strictEqual(
      conflictResult.evaluatedGoals[1].id,
      'goal-a',
      'Goal A with priorityRank 2 should be ranked second',
    );
  });

  it('handles empty goals and dynamic goal addition without crashing', () => {
    const inputs = defaultClientInputs();
    inputs.goals = []; // Test empty state
    const assumptions = getDefaultAssumptions();
    const wealthResult = runWealthEngine(inputs, assumptions, undefined, 50, 42);

    assert.strictEqual(wealthResult.goalResults.length, 0);

    const conflictResult = evaluateGoalConflicts(inputs, wealthResult);
    assert.strictEqual(conflictResult.totalGoalsDemand, 0);
    assert.strictEqual(conflictResult.evaluatedGoals.length, 0);

    // Now dynamically add a new goal
    const newGoal: Goal = {
      id: 'dynamic-goal-1',
      name: 'Electric SUV',
      targetAmount: 2500000,
      yearsToGoal: 3,
      priority: 'important',
      inflation: 6,
      recurring: false,
    };
    inputs.goals = [newGoal];

    const updatedResult = runWealthEngine(inputs, assumptions, undefined, 50, 42);
    assert.strictEqual(updatedResult.goalResults.length, 1);
    assert.strictEqual(updatedResult.goalResults[0].goal.id, 'dynamic-goal-1');
    assert.ok(updatedResult.goalResults[0].requiredSIP > 0);
    assert.ok(updatedResult.goalResults[0].futureValue > 2500000);
  });
});
