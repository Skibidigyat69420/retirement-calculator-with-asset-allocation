import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { RiskProfile } from '../src/types';
import { sampleClientInputs } from '../src/lib/scenarios';
import { buildHouseholdViews, MAX_HOUSEHOLD_MEMBERS } from '../src/lib/householdEngine';
import { getDefaultAssumptions } from '../src/lib/assumptions';
import { runWealthEngine } from '../src/lib/wealthEngine';

const CATEGORIES = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'] as const;

const lightRiskProfile = {
  profile: {
    monteCarloSimulations: 400,
    goalSuccessThreshold: 70,
    maxDrawdown: 20,
  } as RiskProfile,
  score: 50,
};

describe('sampleClientInputs', () => {
  it('builds a complete five-member household', () => {
    const inputs = sampleClientInputs();
    const members = inputs.client.familyMembers ?? [];
    assert.equal(inputs.client.name, 'Sample Household');
    assert.equal(members.length, MAX_HOUSEHOLD_MEMBERS);
    assert.equal(members.length, 5);
    const relationships = members.map((m) => m.relationship).sort();
    assert.deepEqual(relationships, ['Daughter', 'Father', 'Self', 'Son', 'Spouse']);
    for (const field of ['address', 'phone', 'occupation', 'spouse', 'healthStatus', 'maritalStatus', 'familyComposition', 'planningPurpose', 'goalsSummary', 'insuranceSummary', 'investmentPhilosophy', 'adviceRequested'] as const) {
      assert.ok(inputs.client[field], `expected client.${field} to be filled`);
    }
  });

  it('carries 14+ assets across all six categories with valid ownership tags', () => {
    const inputs = sampleClientInputs();
    assert.ok(inputs.assets.length >= 14, `expected 14+ assets, got ${inputs.assets.length}`);

    const memberIds = new Set((inputs.client.familyMembers ?? []).map((m) => m.id));
    const categories = new Set(inputs.assets.map((a) => a.category));
    for (const category of CATEGORIES) {
      assert.ok(categories.has(category), `expected at least one ${category} asset`);
    }
    for (const asset of inputs.assets) {
      assert.equal(asset.currency, 'INR');
      for (const ownerId of asset.ownerMemberIds ?? []) {
        assert.ok(memberIds.has(ownerId), `asset ${asset.id} references unknown member ${ownerId}`);
      }
    }

    const jointCount = inputs.assets.filter((a) => !a.ownerMemberIds || a.ownerMemberIds.length === 0).length;
    assert.ok(jointCount >= 4, `expected at least 4 joint assets, got ${jointCount}`);
  });

  it('has multi-owner assets, 2-3 liabilities, SIP/STP/SWP, 5-6 goals and 3+ income/insurance rows', () => {
    const inputs = sampleClientInputs();
    const multiOwner = inputs.assets.filter((a) => (a.ownerMemberIds?.length ?? 0) > 1).length;
    assert.ok(multiOwner >= 1, 'expected at least one co-owned asset');

    assert.ok(inputs.liabilities.length >= 2 && inputs.liabilities.length <= 3);
    assert.ok(inputs.sip.amount > 0);
    assert.equal(inputs.stp.active, true);
    assert.ok(inputs.swp.monthlyNeedToday > 0);
    assert.ok(inputs.goals.length >= 5 && inputs.goals.length <= 6);
    const priorities = new Set(inputs.goals.map((g) => g.priority));
    assert.deepEqual([...priorities].sort(), ['aspirational', 'essential', 'important']);
    assert.ok((inputs.client.incomeSources ?? []).length >= 3);
    assert.ok((inputs.client.insurancePolicies ?? []).length >= 3);
  });

  it('household views reconcile: group equals joint plus member slices minus co-owned overlap', () => {
    const inputs = sampleClientInputs();
    const views = buildHouseholdViews(inputs);
    const memberSum = views.members.reduce((sum, m) => sum + m.totalValue, 0);
    const coOwnedOverlap = inputs.assets
      .filter((a) => (a.ownerMemberIds?.length ?? 0) > 1)
      .reduce((sum, a) => sum + a.value * (a.ownerMemberIds!.length - 1), 0);
    assert.equal(views.group.totalValue, views.joint.totalValue + memberSum - coOwnedOverlap);
    assert.equal(views.joint.assetCount >= 4, true);
  });

  it('runs through the wealth engine with finite results', () => {
    const result = runWealthEngine(
      sampleClientInputs(),
      getDefaultAssumptions(),
      lightRiskProfile,
      null,
      'sample-data-test',
    );
    assert.equal(result.isConfigured, true);
    assert.ok(Number.isFinite(result.netWorth) && result.netWorth > 0);
    assert.ok(Number.isFinite(result.terminalValue));
    assert.ok(Number.isFinite(result.cagrNominal));
    assert.ok(Number.isFinite(result.monteCarlo.successRate));
    assert.ok(Number.isFinite(result.essentialSuccessRate));
    assert.equal(result.snapshots.length > 0, true);
    for (const goal of result.goalResults) {
      assert.ok(Number.isFinite(goal.futureValue) && goal.futureValue > 0);
      assert.ok(Number.isFinite(goal.successRate));
    }
  });
});
