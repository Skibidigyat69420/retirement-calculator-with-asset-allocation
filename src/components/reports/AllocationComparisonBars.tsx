import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { formatPercent } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { AssetCategory } from '../../types';

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

interface AllocationComparisonBarsProps {
  /** Current weights per category as fractions (0–1). */
  current: Record<AssetCategory, number>;
  /** Strategic target weights per category as fractions (0–1). */
  target: Record<AssetCategory, number>;
  /** Accessible name for the visual (announced by screen readers). */
  ariaLabel: string;
  className?: string;
}

const weightPct = (w: number) => w * 100;

/**
 * Current vs target allocation as paired horizontal 100% stacked bars,
 * rendered with pure divs (the most print-reliable option for A4 PDF).
 * Per-category variance chips below carry the same numbers in text, so
 * colour is never the only encoder. The full drift table stays alongside.
 */
export const AllocationComparisonBars = ({ current, target, ariaLabel, className }: AllocationComparisonBarsProps) => {
  const visible = CATEGORIES.filter((c) => weightPct(current[c]) >= 0.5 || weightPct(target[c]) >= 0.5);

  const bar = (weights: Record<AssetCategory, number>, label: string) => (
    <div className="flex items-center gap-3">
      <span className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      <div
        className="flex-1 h-6 rounded-md border border-border overflow-hidden flex"
        role="img"
        aria-label={`${label} allocation: ${visible
          .map((c) => `${ASSET_LABELS[c]} ${formatPercent(weightPct(weights[c]), 0)}`)
          .join(', ')}`}
      >
        {visible.map((c) => {
          const pct = weightPct(weights[c]);
          if (pct < 0.5) return null;
          return (
            <div
              key={c}
              className="h-full flex items-center justify-center"
              style={{ width: `${pct}%`, backgroundColor: ASSET_COLORS[c] }}
              title={`${ASSET_LABELS[c]} ${formatPercent(pct)}`}
            >
              {pct >= 9 && (
                <span className="text-[9px] font-bold text-ink whitespace-nowrap">{formatPercent(pct, 0)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn('space-y-3', className)} aria-label={ariaLabel}>
      <div className="space-y-2">
        {bar(current, 'Current')}
        {bar(target, 'Target')}
      </div>

      {/* Legend + per-category variance chips */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {visible.map((c) => {
          const cur = weightPct(current[c]);
          const tgt = weightPct(target[c]);
          const diff = cur - tgt;
          return (
            <span key={c} className="inline-flex items-center gap-1.5 text-[11px] text-ink">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[c] }} />
              <span className="font-medium">{ASSET_LABELS[c]}</span>
              <span className="font-mono text-muted">
                {formatPercent(cur, 0)} vs {formatPercent(tgt, 0)}
              </span>
              <span
                className={cn(
                  'font-mono font-semibold',
                  Math.abs(diff) <= 2 ? 'text-muted' : diff > 0 ? 'text-info' : 'text-warning',
                )}
              >
                {diff > 0 ? `+${formatPercent(diff)}` : formatPercent(diff)}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
};
