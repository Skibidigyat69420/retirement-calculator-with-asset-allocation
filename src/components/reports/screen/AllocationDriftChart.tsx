import { useMemo } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { ChartFrame, DetailTable } from './ChartFrame';
import { TOKEN } from './chartTheme';
import { Badge } from '../../ui/Badge';
import { formatCurrency, formatPercent } from '../../../lib/formatters';
import { ASSET_COLORS, ASSET_LABELS } from '../../../lib/constants';
import type { AssetCategory } from '../../../types';

interface AllocationDriftChartProps {
  /** Current allocation as fractions (0–1) per category. */
  current: Record<AssetCategory, number>;
  /** Target allocation as percentages (0–100) per category. */
  targets: Record<AssetCategory, number>;
  netWorth: number;
}

const CATEGORIES: AssetCategory[] = ['equity', 'debt', 'gold', 'realestate', 'liquid', 'other'];
/** Rebalance band: drift beyond ±5pp is flagged for rebalancing. */
const REBALANCE_BAND = 5;

interface DriftRow {
  category: AssetCategory;
  label: string;
  currentPct: number;
  targetPct: number;
  drift: number;
  tradeAmount: number;
}

export const AllocationDriftChart = ({ current, targets, netWorth }: AllocationDriftChartProps) => {
  const rows = useMemo<DriftRow[]>(() => {
    const list = CATEGORIES.map((category) => {
      const currentPct = (current[category] ?? 0) * 100;
      const targetPct = targets[category] ?? 0;
      return {
        category,
        label: ASSET_LABELS[category],
        currentPct,
        targetPct,
        drift: currentPct - targetPct,
        tradeAmount: (targetPct / 100 - (current[category] ?? 0)) * netWorth,
      };
    });
    // Show only categories that have a position or a target, sorted by target weight
    return list
      .filter((r) => r.currentPct > 0 || r.targetPct > 0)
      .sort((a, b) => b.targetPct - a.targetPct);
  }, [current, targets, netWorth]);

  const maxPct = Math.max(100, ...rows.flatMap((r) => [r.currentPct, r.targetPct]));
  const needsRebalance = rows.filter((r) => Math.abs(r.drift) > REBALANCE_BAND).length;

  const caption =
    needsRebalance > 0
      ? `${needsRebalance} of ${rows.length} categories sit outside the ±${REBALANCE_BAND}pp rebalancing band — largest drift is ${formatPercent(Math.max(...rows.map((r) => Math.abs(r.drift))))}.`
      : `All categories are within the ±${REBALANCE_BAND}pp rebalancing band — the portfolio closely tracks its target allocation.`;

  const summary = `Allocation drift, current versus target weight per category. ${rows
    .map((r) => `${r.label}: current ${formatPercent(r.currentPct)}, target ${formatPercent(r.targetPct)}, drift ${r.drift >= 0 ? '+' : ''}${formatPercent(r.drift)}`)
    .join('. ')}.`;

  const pct = (value: number) => `${(value / maxPct) * 100}%`;

  return (
    <ChartFrame
      title="Allocation Drift — Current vs Target"
      icon={<SlidersHorizontal size={18} className="text-muted" aria-hidden="true" />}
      caption={caption}
      summary={summary}
      detailsLabel="View drift table"
      table={
        <DetailTable
          head={
            <>
              <th className="py-2.5 pr-4">Category</th>
              <th className="py-2.5 pr-4 text-right">Current</th>
              <th className="py-2.5 pr-4 text-right">Target</th>
              <th className="py-2.5 pr-4 text-right">Drift</th>
              <th className="py-2.5 pr-4 text-right">Trade to Target</th>
            </>
          }
        >
          {rows.map((row) => (
            <tr key={row.category}>
              <td className="py-2 pr-4">
                <span className="inline-flex items-center gap-2 font-semibold text-ink">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[row.category] }} aria-hidden="true" />
                  {row.label}
                </span>
              </td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{formatPercent(row.currentPct)}</td>
              <td className="py-2 pr-4 text-right font-mono text-muted">{formatPercent(row.targetPct)}</td>
              <td className="py-2 pr-4 text-right font-mono">
                <span className={Math.abs(row.drift) > REBALANCE_BAND ? 'text-negative font-semibold' : 'text-ink'}>
                  {row.drift >= 0 ? '+' : ''}
                  {formatPercent(row.drift)}
                </span>
              </td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(row.tradeAmount)}</td>
            </tr>
          ))}
        </DetailTable>
      }
    >
      <div className="space-y-4">
        {rows.map((row) => {
          const lo = Math.min(row.currentPct, row.targetPct);
          const hi = Math.max(row.currentPct, row.targetPct);
          const flagged = Math.abs(row.drift) > REBALANCE_BAND;
          return (
            <div
              key={row.category}
              className="relative"
              role="img"
              aria-label={`${row.label}: current ${formatPercent(row.currentPct)}, target ${formatPercent(row.targetPct)}, drift ${row.drift >= 0 ? '+' : ''}${formatPercent(row.drift)}`}
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="inline-flex items-center gap-2 text-xs font-semibold text-ink">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[row.category] }} aria-hidden="true" />
                  {row.label}
                </span>
                <span className="inline-flex items-center gap-2 text-[11px] font-mono">
                  <span className="text-ink">{formatPercent(row.currentPct)}</span>
                  <span className="text-faint" aria-hidden="true">→</span>
                  <span className="text-muted">{formatPercent(row.targetPct)}</span>
                  <Badge variant={flagged ? 'danger' : 'success'} className="font-mono normal-case">
                    {row.drift >= 0 ? '+' : ''}
                    {formatPercent(row.drift)}
                  </Badge>
                </span>
              </div>
              <div className="relative h-2.5 rounded-full" style={{ backgroundColor: TOKEN.sunken }}>
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full"
                  style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})`, backgroundColor: ASSET_COLORS[row.category], opacity: 0.35 }}
                  aria-hidden="true"
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full border-2 border-surface shadow-sm"
                  style={{ left: pct(row.currentPct), backgroundColor: ASSET_COLORS[row.category] }}
                  title={`Current: ${formatPercent(row.currentPct)}`}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full border-2 bg-surface"
                  style={{ left: pct(row.targetPct), borderColor: ASSET_COLORS[row.category] }}
                  title={`Target: ${formatPercent(row.targetPct)}`}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-4 mt-4 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-border-strong bg-ink" aria-hidden="true" />
          Current weight
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-border-strong bg-surface" aria-hidden="true" />
          Target weight
        </span>
        <span className="ml-auto">Scale 0–{Math.ceil(maxPct)}%</span>
      </div>
    </ChartFrame>
  );
};
