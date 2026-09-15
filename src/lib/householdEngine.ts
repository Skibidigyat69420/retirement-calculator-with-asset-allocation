import type {
  Asset,
  AssetCategory,
  HouseholdMember,
  HouseholdView,
  MasterPlanInputs,
  MemberAllocation,
} from '../types';

export const MAX_HOUSEHOLD_MEMBERS = 5;

function emptyByCategory(): Record<AssetCategory, number> {
  return { equity: 0, debt: 0, gold: 0, realestate: 0, liquid: 0, other: 0 };
}

function sumByCategory(assets: Asset[]): Record<AssetCategory, number> {
  const sums = emptyByCategory();
  assets.forEach((a) => (sums[a.category] += a.value));
  return sums;
}

function totalValue(assets: Asset[]): number {
  return assets.reduce((sum, a) => sum + a.value, 0);
}

function isJointAsset(asset: Asset): boolean {
  return !asset.ownerMemberIds || asset.ownerMemberIds.length === 0;
}

export function getHouseholdMembers(inputs: MasterPlanInputs): HouseholdMember[] {
  return inputs.client.familyMembers ?? [];
}

export function canAddHouseholdMember(inputs: MasterPlanInputs): boolean {
  return getHouseholdMembers(inputs).length < MAX_HOUSEHOLD_MEMBERS;
}

/**
 * Effective owners of an asset. Absent/empty ownerMemberIds means the asset is
 * jointly held, so every household member is an owner. Ids that no longer
 * match a member (e.g. after a member is removed) are dropped; an asset whose
 * ids all dangle is owned by nobody rather than silently becoming joint.
 */
export function assetOwners(asset: Asset, members: HouseholdMember[]): string[] {
  if (isJointAsset(asset)) return members.map((m) => m.id);
  const validIds = new Set(members.map((m) => m.id));
  return (asset.ownerMemberIds ?? []).filter((id) => validIds.has(id));
}

export interface HouseholdViews {
  group: { totalValue: number; byCategory: Record<AssetCategory, number> };
  joint: { totalValue: number; byCategory: Record<AssetCategory, number>; assetCount: number };
  members: MemberAllocation[];
}

/**
 * Three consistent slices of the household balance sheet. `group` covers every
 * asset; `joint` covers assets without explicit owners; each member allocation
 * covers only assets explicitly tagged to that member (joint assets never
 * double-count into individual members).
 */
export function buildHouseholdViews(inputs: MasterPlanInputs): HouseholdViews {
  const members = getHouseholdMembers(inputs);
  const assets = inputs.assets ?? [];

  const jointAssets = assets.filter(isJointAsset);
  const memberAllocations = members.map((member) => {
    const owned = assets.filter((a) => !isJointAsset(a) && (a.ownerMemberIds ?? []).includes(member.id));
    return {
      memberId: member.id,
      name: member.name,
      totalValue: totalValue(owned),
      byCategory: sumByCategory(owned),
      assetCount: owned.length,
    };
  });

  return {
    group: { totalValue: totalValue(assets), byCategory: sumByCategory(assets) },
    joint: {
      totalValue: totalValue(jointAssets),
      byCategory: sumByCategory(jointAssets),
      assetCount: jointAssets.length,
    },
    members: memberAllocations,
  };
}

export function filterAssetsForView(assets: Asset[], view: HouseholdView): Asset[] {
  if (view.kind === 'group') return assets;
  if (view.kind === 'joint') return assets.filter(isJointAsset);
  return assets.filter((a) => !isJointAsset(a) && (a.ownerMemberIds ?? []).includes(view.memberId));
}
