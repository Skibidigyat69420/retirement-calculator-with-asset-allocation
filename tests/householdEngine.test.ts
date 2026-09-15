import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Asset, FamilyMember, MasterPlanInputs } from '../src/types';
import { createEmptyPlan } from '../src/lib/scenarios';
import {
  MAX_HOUSEHOLD_MEMBERS,
  assetOwners,
  buildHouseholdViews,
  canAddHouseholdMember,
  filterAssetsForView,
  getHouseholdMembers,
} from '../src/lib/householdEngine';

const MEMBERS: FamilyMember[] = [
  { id: 'm1', name: 'Self', relationship: 'Self' },
  { id: 'm2', name: 'Spouse', relationship: 'Spouse' },
  { id: 'm3', name: 'Child', relationship: 'Son' },
];

function asset(id: string, value: number, category: Asset['category'], ownerMemberIds?: string[]): Asset {
  return { id, name: id, value, returnRate: 10, category, currency: 'INR', liquidateAtRetirement: true, ownerMemberIds };
}

function planWith(assets: Asset[], members: FamilyMember[] = MEMBERS): MasterPlanInputs {
  const plan = createEmptyPlan();
  plan.assets = assets;
  plan.client.familyMembers = members;
  return plan;
}

describe('householdEngine', () => {
  it('enforces the max household size of 5', () => {
    const plan = createEmptyPlan();
    for (let i = 0; i < MAX_HOUSEHOLD_MEMBERS; i++) {
      assert.equal(canAddHouseholdMember(plan), true);
      plan.client.familyMembers = [...(plan.client.familyMembers ?? []), { id: `m${i}`, name: `M${i}`, relationship: 'Self' }];
    }
    assert.equal(plan.client.familyMembers?.length, MAX_HOUSEHOLD_MEMBERS);
    assert.equal(canAddHouseholdMember(plan), false);
  });

  it('getHouseholdMembers safely returns an empty array when unset', () => {
    const plan = createEmptyPlan();
    assert.deepEqual(getHouseholdMembers(plan), []);
  });

  it('assetOwners resolves joint assets to every member and tagged assets to their owners', () => {
    const joint = asset('a-joint', 100, 'equity');
    const sole = asset('a-sole', 200, 'debt', ['m2']);
    assert.deepEqual(assetOwners(joint, MEMBERS), ['m1', 'm2', 'm3']);
    assert.deepEqual(assetOwners(sole, MEMBERS), ['m2']);
  });

  it('assetOwners drops ids that no longer match a member', () => {
    const orphan = asset('a-orphan', 100, 'equity', ['m2', 'ghost']);
    assert.deepEqual(assetOwners(orphan, MEMBERS), ['m2']);
    const dangling = asset('a-dangling', 100, 'equity', ['ghost']);
    assert.deepEqual(assetOwners(dangling, MEMBERS), []);
  });

  it('buildHouseholdViews splits joint vs individual totals without double counting', () => {
    const assets = [
      asset('joint-equity', 1000, 'equity'),
      asset('joint-liquid', 500, 'liquid'),
      asset('self-equity', 700, 'equity', ['m1']),
      asset('self-debt', 300, 'debt', ['m1']),
      asset('spouse-gold', 400, 'gold', ['m2']),
      asset('co-owned', 600, 'equity', ['m1', 'm2']),
    ];
    const views = buildHouseholdViews(planWith(assets));

    assert.equal(views.group.totalValue, 3500);
    assert.equal(views.group.byCategory.equity, 2300);
    assert.equal(views.group.byCategory.debt, 300);
    assert.equal(views.group.byCategory.gold, 400);
    assert.equal(views.group.byCategory.liquid, 500);

    assert.equal(views.joint.totalValue, 1500);
    assert.equal(views.joint.assetCount, 2);
    assert.equal(views.joint.byCategory.equity, 1000);
    assert.equal(views.joint.byCategory.liquid, 500);

    const self = views.members.find((m) => m.memberId === 'm1');
    assert.ok(self);
    assert.equal(self.totalValue, 1600); // 700 + 300 + co-owned 600
    assert.equal(self.assetCount, 3);
    assert.equal(self.byCategory.equity, 1300);
    assert.equal(self.byCategory.debt, 300);

    const spouse = views.members.find((m) => m.memberId === 'm2');
    assert.ok(spouse);
    assert.equal(spouse.totalValue, 1000); // 400 gold + co-owned 600
    assert.equal(spouse.byCategory.gold, 400);

    // Member totals must exclude joint assets entirely.
    const memberSum = views.members.reduce((sum, m) => sum + m.totalValue, 0);
    assert.equal(memberSum, 2600);
    assert.equal(memberSum, views.group.totalValue - views.joint.totalValue + 600); // co-owned counted per member
  });

  it('buildHouseholdViews returns a zero allocation for members with no tagged assets', () => {
    const views = buildHouseholdViews(planWith([asset('joint', 100, 'equity')]));
    const child = views.members.find((m) => m.memberId === 'm3');
    assert.ok(child);
    assert.equal(child.totalValue, 0);
    assert.equal(child.assetCount, 0);
    assert.deepEqual(child.byCategory, { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 });
  });

  it('filterAssetsForView handles all three view kinds', () => {
    const assets = [
      asset('joint', 100, 'equity'),
      asset('self', 200, 'equity', ['m1']),
      asset('spouse', 300, 'debt', ['m2']),
    ];
    assert.equal(filterAssetsForView(assets, { kind: 'group' }).length, 3);
    assert.deepEqual(filterAssetsForView(assets, { kind: 'joint' }).map((a) => a.id), ['joint']);
    assert.deepEqual(filterAssetsForView(assets, { kind: 'member', memberId: 'm1' }).map((a) => a.id), ['self']);
    assert.deepEqual(filterAssetsForView(assets, { kind: 'member', memberId: 'm2' }).map((a) => a.id), ['spouse']);
    assert.deepEqual(filterAssetsForView(assets, { kind: 'member', memberId: 'm3' }), []);
  });
});
