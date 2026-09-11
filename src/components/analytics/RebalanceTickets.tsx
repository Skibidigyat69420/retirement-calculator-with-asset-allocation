import { useState } from 'react';
import { MoreHorizontal, Copy, Pencil } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { Badge } from '../ui/Badge';
import { useCalculator } from '../../context/CalculatorContext';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { AssetCategory } from '../../types';
import type { CompositionRow } from './CompositionCompare';

interface RebalanceTicketsProps {
  rows: CompositionRow[];
  /** Projected terminal weight per class (0–1), for the final column. */
  projectedWeights: Record<AssetCategory, number>;
  totalBuys: number;
  totalSells: number;
  /** Opens the policy-target drawer (shared with TargetPolicyEditor). */
  onAdjustTarget: () => void;
}

/** Rebalance trade tickets in research-table style, row actions behind a ··· menu. */
export const RebalanceTickets = ({
  rows,
  projectedWeights,
  totalBuys,
  totalSells,
  onAdjustTarget,
}: RebalanceTicketsProps) => {
  const { showToast } = useCalculator();
  const [openMenu, setOpenMenu] = useState<AssetCategory | null>(null);

  const copyTrade = (row: CompositionRow) => {
    const text = `${row.action} ${ASSET_LABELS[row.category]} ${formatCurrency(Math.abs(row.trade))}`;
    navigator.clipboard?.writeText(text).then(
      () => showToast('Trade ticket copied to clipboard.', 'success'),
      () => showToast('Copy failed — clipboard unavailable.', 'error'),
    );
    setOpenMenu(null);
  };

  return (
    <section className="rounded-lg border border-border bg-raised shadow-card p-5 md:p-6" aria-label="Rebalancing tickets">
      <SectionHeader
        title="Rebalancing Tickets"
        description="Disciplined buy/sell orders to restore policy targets. Threshold: ±2% portfolio drift."
        action={
          <div className="flex items-center gap-2">
            {totalBuys > 0 && <Badge tone="positive">Buys +{formatCurrencyCompact(totalBuys)}</Badge>}
            {totalSells > 0 && <Badge tone="negative">Sells −{formatCurrencyCompact(totalSells)}</Badge>}
          </div>
        }
      />

      <div className="overflow-x-auto -mx-5 md:-mx-6 px-5 md:px-6" tabIndex={0} role="region" aria-label="Scrollable rebalancing tickets table">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
              <th className="py-2 pr-4 font-medium">Asset class</th>
              <th className="py-2 pr-4 text-right font-medium">Current value</th>
              <th className="py-2 pr-4 text-right font-medium">Current %</th>
              <th className="py-2 pr-4 text-right font-medium">Target %</th>
              <th className="py-2 pr-4 text-right font-medium">Terminal %</th>
              <th className="py-2 pr-4 text-right font-medium">Gap (₹)</th>
              <th className="py-2 pr-2 text-right font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {rows.map((r) => {
              const projectedPct = (projectedWeights[r.category] || 0) * 100;
              return (
                <tr key={r.category} className="group hover:bg-sunken/40 transition-colors">
                  <td className="py-2.5 pr-4">
                    <span className="inline-flex items-center gap-2 font-medium text-ink">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[r.category] }} />
                      {ASSET_LABELS[r.category]}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">
                    {formatCurrency(r.current)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">
                    {formatPercent(r.currentPct)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums font-semibold text-ink">
                    {formatPercent(r.targetPct)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-muted">
                    {formatPercent(projectedPct)}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-mono tabular-nums font-semibold">
                    <span className={r.trade > 0 ? 'text-positive' : r.trade < 0 ? 'text-negative' : 'text-faint'}>
                      {r.trade > 0 ? '+' : ''}
                      {formatCurrency(r.trade)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2 text-right">
                    <div className="relative inline-flex items-center justify-end gap-2">
                      {r.action === 'Hold' ? (
                        <Badge tone="neutral" dot={false}>Hold</Badge>
                      ) : r.action === 'Buy' ? (
                        <Badge tone="positive" dot={false}>Buy</Badge>
                      ) : (
                        <Badge tone="negative" dot={false}>Sell</Badge>
                      )}
                      <button
                        type="button"
                        aria-label={`Actions for ${ASSET_LABELS[r.category]}`}
                        aria-expanded={openMenu === r.category}
                        onClick={() => setOpenMenu(openMenu === r.category ? null : r.category)}
                        className={cn(
                          'p-1 rounded-sm text-muted hover:text-ink hover:bg-sunken transition-colors cursor-pointer',
                          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                          openMenu === r.category && 'opacity-100',
                        )}
                      >
                        <MoreHorizontal size={14} strokeWidth={1.8} aria-hidden="true" />
                      </button>
                      {openMenu === r.category && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenu(null)} aria-hidden="true" />
                          <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-md border border-border bg-raised shadow-popover py-1 text-left">
                            <button
                              type="button"
                              onClick={() => copyTrade(r)}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ink-soft hover:bg-sunken hover:text-ink transition-colors cursor-pointer"
                            >
                              <Copy size={12} strokeWidth={1.6} aria-hidden="true" /> Copy trade value
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenMenu(null);
                                onAdjustTarget();
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-ink-soft hover:bg-sunken hover:text-ink transition-colors cursor-pointer"
                            >
                              <Pencil size={12} strokeWidth={1.6} aria-hidden="true" /> Adjust target…
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <table className="sr-only">
        <caption>Policy drift per asset class: current weight minus target weight in percentage points</caption>
        <thead>
          <tr><th>Asset class</th><th>Current %</th><th>Target %</th><th>Drift (pp)</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category}>
              <td>{ASSET_LABELS[r.category]}</td>
              <td>{r.currentPct.toFixed(1)}%</td>
              <td>{r.targetPct.toFixed(1)}%</td>
              <td>{(r.currentPct - r.targetPct).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};
