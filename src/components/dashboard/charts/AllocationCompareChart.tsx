import type { AssetCategory } from '../../../types';
import { ASSET_COLORS, ASSET_LABELS } from '../../../lib/constants';
import { formatPercent } from '../../../lib/formatters';
import { cn } from '../../../lib/utils';

interface AllocationCompareChartProps {
  /** Fractions (0–1) per asset category. */
  current: Record<AssetCategory, number>;
  /** Fractions (0–1) per asset category. */
  target: Record<AssetCategory, number>;
  ariaLabel: string;
  summary: string;
}

const CATEGORY_ORDER: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];

export const AllocationCompareChart = ({ current, target, ariaLabel, summary }: AllocationCompareChartProps) => {
  const categories = CATEGORY_ORDER.filter((c) => (current[c] || 0) > 0 || (target[c] || 0) > 0);

  if (categories.length === 0) {
    return (
      <div className="h-64 w-full flex items-center justify-center" role="img" aria-label={ariaLabel}>
        <p className="text-sm text-ink-soft text-center px-6">No allocation recorded yet — add holdings in the Master Plan.</p>
        <p className="sr-only">{summary}</p>
      </div>
    );
  }

  const rows = [
    { label: 'Current', values: current },
    { label: 'Target', values: target },
  ];

  const driftText = (drift: number) =>
    `${drift > 0 ? '+' : ''}${drift.toFixed(1)} pp`;

  return (
    <div className="space-y-5">
      <p className="sr-only">{summary}</p>

      {/* Paired horizontal stacked bars */}
      <div className="space-y-4" role="img" aria-label={ariaLabel}>
        {rows.map((row) => (
          <div key={row.label} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted">{row.label}</span>
            </div>
            <div className="flex h-10 w-full overflow-hidden rounded-xl border border-border bg-surface shadow-2xs">
              {categories.map((c) => {
                const pct = (row.values[c] || 0) * 100;
                if (pct <= 0) return null;
                return (
                  <div
                    key={c}
                    className="h-full flex items-center justify-center border-r border-white/40 last:border-r-0"
                    style={{ width: `${pct}%`, backgroundColor: ASSET_COLORS[c] }}
                    title={`${ASSET_LABELS[c]}: ${formatPercent(pct)} of ${row.label.toLowerCase()} allocation`}
                  >
                    {pct >= 9 && (
                      <span className="text-[10px] font-bold text-deep tabular-nums">{formatPercent(pct, 0)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
        {categories.map((c) => (
          <span key={c} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ASSET_COLORS[c] }} aria-hidden="true" />
            {ASSET_LABELS[c]}
          </span>
        ))}
      </div>

      {/* Drift table — textual representation of the same data */}
      <div className="overflow-x-auto rounded-xl border border-border/80">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-border bg-surface/80 text-muted uppercase tracking-wider text-[10px]">
              <th className="py-2 px-3">Asset Class</th>
              <th className="py-2 px-3 text-right">Current</th>
              <th className="py-2 px-3 text-right">Target</th>
              <th className="py-2 px-3 text-right">Drift</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {categories.map((c) => {
              const curPct = (current[c] || 0) * 100;
              const tgtPct = (target[c] || 0) * 100;
              const drift = curPct - tgtPct;
              return (
                <tr key={c} className="hover:bg-surface/80 transition-colors">
                  <td className="py-2 px-3 font-semibold text-ink">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: ASSET_COLORS[c] }} aria-hidden="true" />
                      {ASSET_LABELS[c]}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink-soft">{formatPercent(curPct)}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-ink-soft">{formatPercent(tgtPct)}</td>
                  <td
                    className={cn(
                      'py-2 px-3 text-right tabular-nums font-bold',
                      Math.abs(drift) < 1 ? 'text-faint' : drift > 0 ? 'text-warning' : 'text-accent-strong',
                    )}
                  >
                    {Math.abs(drift) < 0.05 ? '—' : driftText(drift)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
