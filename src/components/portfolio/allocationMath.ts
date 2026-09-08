/**
 * Allocation target validation + drift/rebalance math for the portfolio
 * analytics UX (spec §90–91). Pure functions only — every rule here is
 * unit-tested in tests/portfolio/. The quant engine in src/lib stays the
 * single source of financial truth; this module only shapes UX decisions
 * (thresholds, action labels, trade-ticket grouping).
 */
import type { AssetCategory } from '../../types';

export const ASSET_CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

/** Pattern A tolerance: equity drift beyond ±5pp from target triggers a warning. */
export const EQUITY_DRIFT_TOLERANCE_PP = 5;

/** Trade tickets below this fraction of portfolio value are 'Hold' (§90 drift table). */
export const DEFAULT_HOLD_THRESHOLD_PCT = 2;

const SUM_TOLERANCE = 0.1;

export type ValidationPattern = 'A' | 'B' | 'C';

export interface TargetIssue {
  pattern: ValidationPattern;
  severity: 'error' | 'warning';
  code: 'sum-not-100' | 'equity-drift' | 'glide-path-conflict' | 'equity-band';
  message: string;
}

export interface TargetValidationContext {
  /** Current portfolio weights as fractions (0–1) — enables Pattern A. */
  currentAllocation?: Partial<Record<AssetCategory, number>>;
  /** Risk profile bands — enables Pattern C. */
  riskProfile?: { targets: Record<AssetCategory, number>; maxEquity: number; minEquity: number; label?: string } | null;
  /** Glide-path equity at the client's current age (%) — enables Pattern C. */
  glidePathEquity?: number | null;
}

export interface TargetValidation {
  sum: number;
  valid: boolean;
  issues: TargetIssue[];
}

export function sumTargets(targets: Record<AssetCategory, number>): number {
  return ASSET_CATEGORIES.reduce((acc, cat) => acc + (targets[cat] || 0), 0);
}

/**
 * §91 — the UI must never leave the user with an impossible allocation state.
 * Pattern B is a hard error (sum ≠ 100); Patterns A and C are warnings that
 * carry an actionable suggestion.
 */
export function validateTargets(
  targets: Record<AssetCategory, number>,
  ctx: TargetValidationContext = {},
): TargetValidation {
  const issues: TargetIssue[] = [];
  const sum = sumTargets(targets);

  // Pattern B — editable percentages must total exactly 100%.
  if (Math.abs(sum - 100) > SUM_TOLERANCE) {
    issues.push({
      pattern: 'B',
      severity: 'error',
      code: 'sum-not-100',
      message:
        sum < 100
          ? `Targets total ${sum.toFixed(1)}% — ${(100 - sum).toFixed(1)}% is unallocated. Normalize to close the gap.`
          : `Targets total ${sum.toFixed(1)}% — ${(sum - 100).toFixed(1)}% over-allocated. Normalize before applying.`,
    });
  }

  // Pattern A — equity drift beyond ±5pp from target → rebalance suggestion.
  const currentEquityPct = ctx.currentAllocation ? (ctx.currentAllocation.equity || 0) * 100 : null;
  if (currentEquityPct !== null) {
    const driftPp = currentEquityPct - (targets.equity || 0);
    if (Math.abs(driftPp) > EQUITY_DRIFT_TOLERANCE_PP) {
      issues.push({
        pattern: 'A',
        severity: 'warning',
        code: 'equity-drift',
        message: `Equity is ${driftPp > 0 ? 'over' : 'under'} target by ${Math.abs(driftPp).toFixed(1)}pp (current ${currentEquityPct.toFixed(1)}% vs target ${(targets.equity || 0).toFixed(1)}%) — beyond the ±${EQUITY_DRIFT_TOLERANCE_PP}pp tolerance. Rebalance to restore policy.`,
      });
    }
  }

  // Pattern C — target conflicts with the risk-profile glide path.
  const profile = ctx.riskProfile ?? null;
  if (profile) {
    const targetEquity = targets.equity || 0;
    if (targetEquity > profile.maxEquity + SUM_TOLERANCE) {
      issues.push({
        pattern: 'C',
        severity: 'warning',
        code: 'equity-band',
        message: `Target equity ${targetEquity.toFixed(1)}% exceeds the ${profile.label ?? ''} maximum of ${profile.maxEquity}% — conflicts with the risk-profile glide path.`.replace('  ', ' '),
      });
    } else if (targetEquity < profile.minEquity - SUM_TOLERANCE) {
      issues.push({
        pattern: 'C',
        severity: 'warning',
        code: 'equity-band',
        message: `Target equity ${targetEquity.toFixed(1)}% is below the ${profile.label ?? ''} minimum of ${profile.minEquity}% — conflicts with the risk-profile glide path.`.replace('  ', ' '),
      });
    }
    if (ctx.glidePathEquity !== null && ctx.glidePathEquity !== undefined) {
      const gap = targetEquity - ctx.glidePathEquity;
      if (Math.abs(gap) > 10) {
        issues.push({
          pattern: 'C',
          severity: 'warning',
          code: 'glide-path-conflict',
          message: `Target equity ${targetEquity.toFixed(1)}% departs ${Math.abs(gap).toFixed(1)}pp from the glide-path equity (${ctx.glidePathEquity.toFixed(1)}%) at the client's current age.`,
        });
      }
    }
  }

  return { sum, valid: !issues.some((i) => i.severity === 'error'), issues };
}

/**
 * Pattern C — normalize on commit with an explicit explanation. Scales every
 * weight proportionally so the total is exactly 100; a zero-sum set falls
 * back to an equal split (never returns an impossible state).
 */
export function normalizeTargetWeights(targets: Record<AssetCategory, number>): Record<AssetCategory, number> {
  const sum = sumTargets(targets);
  if (sum <= 0) {
    const equal = 100 / ASSET_CATEGORIES.length;
    return Object.fromEntries(ASSET_CATEGORIES.map((c) => [c, equal])) as Record<AssetCategory, number>;
  }
  return Object.fromEntries(
    ASSET_CATEGORIES.map((c) => [c, ((targets[c] || 0) / sum) * 100]),
  ) as Record<AssetCategory, number>;
}

export type RebalanceAction = 'Buy' | 'Sell' | 'Hold';

export interface DriftRow {
  category: AssetCategory;
  currentPct: number;
  targetPct: number;
  driftPp: number;
  currentValue: number;
  targetValue: number;
  trade: number;
  action: RebalanceAction;
}

/** §90 drift table: current %, target %, drift and Buy/Sell/Hold with ₹ amounts. */
export function computeDriftRows(
  currentAllocation: Partial<Record<AssetCategory, number>>,
  targets: Record<AssetCategory, number>,
  totalValue: number,
  holdThresholdPct: number = DEFAULT_HOLD_THRESHOLD_PCT,
): DriftRow[] {
  return ASSET_CATEGORIES.map((category) => {
    const currentPct = (currentAllocation[category] || 0) * 100;
    const targetPct = targets[category] || 0;
    const driftPp = currentPct - targetPct;
    const currentValue = (currentAllocation[category] || 0) * totalValue;
    const targetValue = (targetPct / 100) * totalValue;
    const trade = targetValue - currentValue;
    const action: RebalanceAction =
      Math.abs(trade) < totalValue * (holdThresholdPct / 100) ? 'Hold' : trade > 0 ? 'Buy' : 'Sell';
    return { category, currentPct, targetPct, driftPp, currentValue, targetValue, trade, action };
  });
}

export interface RebalanceTrade {
  category: AssetCategory;
  action: Exclude<RebalanceAction, 'Hold'>;
  amount: number;
}

export interface RebalancePlan {
  trades: RebalanceTrade[];
  totalBuys: number;
  totalSells: number;
  turnoverPct: number;
  /** Buys funded by sells before touching external cash (₹). */
  selfFunded: boolean;
}

/** Build the executable trade list from drift rows (Holds dropped). */
export function buildRebalancePlan(rows: DriftRow[], totalValue: number): RebalancePlan {
  const trades: RebalanceTrade[] = rows
    .filter((r) => r.action !== 'Hold' && Math.abs(r.trade) > 0)
    .map((r) => ({ category: r.category, action: r.action as Exclude<RebalanceAction, 'Hold'>, amount: Math.abs(r.trade) }));
  const totalBuys = trades.filter((t) => t.action === 'Buy').reduce((s, t) => s + t.amount, 0);
  const totalSells = trades.filter((t) => t.action === 'Sell').reduce((s, t) => s + t.amount, 0);
  const traded = totalBuys + totalSells;
  return {
    trades,
    totalBuys,
    totalSells,
    turnoverPct: totalValue > 0 ? (traded / 2 / totalValue) * 100 : 0,
    selfFunded: totalBuys <= totalSells + 1,
  };
}

/** Suggested SIP/STP equity split derived from equity:debt target ratio (0–100). */
export function equitySplitFromTargets(targets: Record<AssetCategory, number>): number {
  const investable = (targets.equity || 0) + (targets.debt || 0);
  return investable > 0 ? Math.round(((targets.equity || 0) / investable) * 100) : 50;
}

/** Piecewise-linear equity weight of a {age, equity} glide path at a given age. */
export function interpolateGlideEquity(points: { age: number; equity: number }[], age: number): number {
  if (points.length === 0) return 0;
  if (age <= points[0].age) return points[0].equity;
  for (let i = 1; i < points.length; i++) {
    if (age <= points[i].age) {
      const prev = points[i - 1];
      const next = points[i];
      const t = (age - prev.age) / (next.age - prev.age || 1);
      return prev.equity + (next.equity - prev.equity) * t;
    }
  }
  return points[points.length - 1].equity;
}
