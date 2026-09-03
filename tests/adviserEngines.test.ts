import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { defaultClientInputs } from '../src/lib/scenarios';
import { runWealthEngine } from '../src/lib/wealthEngine';
import { getDefaultAssumptions } from '../src/lib/assumptions';
import { computePlanHealthScore } from '../src/lib/planHealthScore';
import { generatePlanRecommendations } from '../src/lib/recommendationEngine';
import { runScenarioLab } from '../src/lib/scenarioLab';
import { evaluateGoalConflicts } from '../src/lib/goalConflictEngine';

describe('Adviser Operating System Engines', () => {
  const inputs = defaultClientInputs();
  const wealthResult = runWealthEngine(inputs, getDefaultAssumptions());

  it('computes transparent Plan Health Score across all 7 dimensions', () => {
    const health = computePlanHealthScore(inputs, wealthResult, 55);

    assert.ok(health.overallScore >= 0 && health.overallScore <= 100);
    assert.equal(health.components.length, 7);
    const retComp = health.components.find((c) => c.id === 'retirement');
    assert.ok(retComp);
    assert.ok(retComp.reason.length > 0);
    assert.ok(retComp.drivers.length > 0);
    assert.ok(retComp.improvementAdvice.length > 0);
  });

  it('generates prioritized, explainable recommendations with actionable payloads', () => {
    const health = computePlanHealthScore(inputs, wealthResult, 55);
    const recs = generatePlanRecommendations(inputs, wealthResult, health, 55);

    assert.ok(Array.isArray(recs));
    if (recs.length > 0) {
      const topRec = recs[0];
      assert.ok(topRec.priority >= 1 && topRec.priority <= 4);
      assert.ok(topRec.confidence > 0);
      assert.ok(topRec.whyExplainer.current.length > 0);
      assert.ok(topRec.actionLabel.length > 0);
    }
  });

  it('evaluates multiple what-if scenarios in ScenarioLab and generates comparison metrics', () => {
    const lab = runScenarioLab(inputs, wealthResult);

    assert.equal(lab.basePlan.id, 'base-plan');
    assert.equal(lab.scenarios.length, 6);
    assert.ok(lab.synthesisAdvice.length > 0);

    const earlyRet = lab.scenarios.find((s) => s.id === 'early-retirement');
    assert.ok(earlyRet);
    assert.ok(earlyRet.successProbability <= lab.basePlan.successProbability + 5);

    const sipBoost = lab.scenarios.find((s) => s.id === 'sip-boost');
    assert.ok(sipBoost);
    assert.ok(sipBoost.terminalCorpus > 0);
  });

  it('evaluates simultaneous goal affordability and generates a funding waterfall', () => {
    const conflict = evaluateGoalConflicts(inputs, wealthResult);

    assert.ok(conflict.totalHouseholdDemand > 0);
    assert.ok(conflict.retirementDemand > 0);
    assert.ok(conflict.fundingWaterfall.length >= 4);
    assert.ok(conflict.tradeOffSummary.length > 0);
  });
});
