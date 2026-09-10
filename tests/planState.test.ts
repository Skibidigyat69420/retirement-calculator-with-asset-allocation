import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyPlan, demoClientInputs } from '../src/lib/scenarios';
import {
  isProfileConfigured,
  hasFinancialData,
  isPlanEmpty,
  planStatus,
  guardNumber,
  formatOrDash,
} from '../src/lib/planState';

describe('planState', () => {
  it('empty plan: not configured, no financial data, not-started', () => {
    const plan = createEmptyPlan();
    assert.equal(isProfileConfigured(plan), false);
    assert.equal(hasFinancialData(plan), false);
    assert.equal(isPlanEmpty(plan), true);
    assert.equal(planStatus(plan), 'not-started');
  });

  it('profile-only plan: configured but still in-progress', () => {
    const plan = createEmptyPlan();
    plan.client.name = 'Ketan Deshmukh';
    plan.currentAge = 38;
    plan.retirementAge = 55;

    assert.equal(isProfileConfigured(plan), true);
    assert.equal(hasFinancialData(plan), false);
    assert.equal(isPlanEmpty(plan), false);
    assert.equal(planStatus(plan), 'in-progress');
  });

  it('ages alone count as profile configuration', () => {
    const plan = createEmptyPlan();
    plan.currentAge = 30;
    plan.retirementAge = 50;
    assert.equal(isProfileConfigured(plan), true);
    assert.equal(planStatus(plan), 'in-progress');
  });

  it('plan with assets and income has financial data but no goal: in-progress', () => {
    const plan = createEmptyPlan();
    plan.currentAge = 30;
    plan.annualIncome = 1800000;
    plan.assets = [
      {
        id: 'mf-1',
        name: 'Index Fund',
        value: 500000,
        returnRate: 12,
        category: 'equity',
        currency: 'INR',
        liquidateAtRetirement: true,
      },
    ];

    assert.equal(isProfileConfigured(plan), true);
    assert.equal(hasFinancialData(plan), true);
    assert.equal(planStatus(plan), 'in-progress');
  });

  it('a single SIP contribution counts as financial data', () => {
    const plan = createEmptyPlan();
    plan.sip.amount = 25000;
    assert.equal(hasFinancialData(plan), true);
    assert.equal(isPlanEmpty(plan), false);
    assert.equal(planStatus(plan), 'in-progress');
  });

  it('full plan with a goal is ready-for-review', () => {
    const plan = demoClientInputs();
    assert.equal(isProfileConfigured(plan), true);
    assert.equal(hasFinancialData(plan), true);
    assert.equal(isPlanEmpty(plan), false);
    assert.equal(planStatus(plan), 'ready-for-review');
  });

  it('profile plus goal satisfies the ready-for-review contract (goals count as financial data)', () => {
    const plan = createEmptyPlan();
    plan.client.name = 'Asha';
    plan.currentAge = 41;
    plan.goals = [
      {
        id: 'g1',
        name: 'Home Down Payment',
        targetAmount: 3000000,
        yearsToGoal: 4,
        priority: 'essential',
        inflation: 6,
        recurring: false,
      },
    ];
    assert.equal(hasFinancialData(plan), true);
    assert.equal(planStatus(plan), 'ready-for-review');
  });
});

describe('guardNumber / formatOrDash', () => {
  it('guardNumber passes finite numbers and rejects NaN/Infinity/null/undefined', () => {
    assert.equal(guardNumber(42), 42);
    assert.equal(guardNumber(0), 0);
    assert.equal(guardNumber(-12.5), -12.5);
    assert.equal(guardNumber(NaN), null);
    assert.equal(guardNumber(Infinity), null);
    assert.equal(guardNumber(-Infinity), null);
    assert.equal(guardNumber(null), null);
    assert.equal(guardNumber(undefined), null);
  });

  it('formatOrDash formats finite values and falls back to an em dash', () => {
    const fmt = (n: number) => `₹${n}`;
    assert.equal(formatOrDash(1000, fmt), '₹1000');
    assert.equal(formatOrDash(0, fmt), '₹0');
    assert.equal(formatOrDash(NaN, fmt), '—');
    assert.equal(formatOrDash(Infinity, fmt), '—');
    assert.equal(formatOrDash(undefined, fmt), '—');
    assert.equal(formatOrDash(null, fmt), '—');
  });
});
