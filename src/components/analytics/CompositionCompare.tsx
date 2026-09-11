import { ArrowDownRight, ArrowUpRight, Minus, TrendingUp } from 'lucide-react';
import { SectionHeader } from '../ui/SectionHeader';
import { StatusBadge } from '../ui/StatusBadge';
import { DonutChart } from '../charts/DonutChart';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { AssetCategory } from '../../types';

export interface CompositionRow {
  category: AssetCategory;
  currentPct: number;
  targetPct: number;
  current: number;
  trade: number;
  action: 'Buy' | 'Sell' | 'Hold';
}

interface CompositionCompareProps {
  rows: CompositionRow[];
  totalValue: number;
  /** Supporting visual — projected terminal mix at the plan horizon. */
  projectedData: { name: string; value: number; color: string }[];
  projectedTotal: number;
  projectionSuccess: number | null;
  horizonYears: number | null;
}

/** A single 100%-stacked horizontal bar with token category colors. */
const StackedBar = ({
  label,
  amount,
  segments,
  emphasized,
}: {
  label: string;
  amount: string;
  segments: { category: AssetCategory; pct: number }[];
  emphasized?: boolean;
}) => (
  <div>
    <div className="flex items-baseline justify-between gap-3 mb-1.5">
      <span className="eyebrow">{label}</span>
      <span className={cn('font-mono text-xs tabular-nums', emphasized ? 'text-ink font-semibold' : 'text-muted')}>
        {amount}
      </span>
    </div>
    <div
      className="flex h-7 w-full overflow-hidden rounded-sm border border-border-subtle bg-sunken"
      role="img"
      aria-label={`${label} allocation: ${segments.map((s) => `${ASSET_LABELS[s.category]} ${s.pct.toFixed(1)}%`).join(', ')}`}
    >
      {segments
        .filter((s) => s.pct > 0.05)
        .map((s) => (
          <div
            key={s.category}
            className="h-full border-r border-raised/60 last:border-r-0"
            style={{ width: `${s.pct}%`, backgroundColor: ASSET_COLORS[s.category] }}
            title={`${ASSET_LABELS[s.category]} — ${s.pct.toFixed(1)}%`}
          />
        ))}
    </div>
  </div>
);

export const CompositionCompare = ({
  rows,
  totalValue,
  projectedData,
  projectedTotal,
  projectionSuccess,
  horizonYears,
}: CompositionCompareProps) => {
  const activeRows = rows.filter((r) => r.currentPct > 0.05 || r.targetPct > 0.05);
  const maxDrift = Math.max(0, ...rows.map((r) => Math.abs(r.currentPct - r.targetPct)));
  const driftStatus = maxDrift > 10 ? 'at-risk' : maxDrift > 5 ? 'needs-review' : 'on-track';

  const rebalancingActions = rows
    .filter((r) => r.action !== 'Hold')
    .sort((a, b) => Math.abs(b.trade) - Math.abs(a.trade));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Primary visual — current vs target composition */}
      <section className="lg:col-span-2 rounded-lg border border-border bg-raised shadow-card p-5 md:p-6" aria-label="Current versus target allocation">
        <SectionHeader
          title="Current vs Target Composition"
          description="Live holdings against strategic policy weights, by asset class."
          action={<StatusBadge status={driftStatus} className="mt-0.5" />}
        />

        <div className="space-y-5">
          <StackedBar
            label="Current"
            amount={formatCurrencyCompact(totalValue)}
            emphasized
            segments={activeRows.map((r) => ({ category: r.category, pct: r.currentPct }))}
          />
          <StackedBar
            label="Target"
            amount={formatPercent(rows.reduce((s, r) => s + r.targetPct, 0), 0)}
            segments={activeRows.map((r) => ({ category: r.category, pct: r.targetPct }))}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
            {activeRows.map((r) => (
              <span key={r.category} className="inline-flex items-center gap-1.5 text-[11px] text-muted">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[r.category] }} />
                {ASSET_LABELS[r.category]}
              </span>
            ))}
          </div>
        </div>

        {/* Per-class rows */}
        <div className="mt-6 overflow-x-auto" tabIndex={0} role="region" aria-label="Allocation by asset class">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[10px] uppercase tracking-[0.08em] text-faint">
                <th className="py-2 pr-4 font-medium">Asset class</th>
                <th className="py-2 pr-4 text-right font-medium">Current</th>
                <th className="py-2 pr-4 text-right font-medium">Target</th>
                <th className="py-2 pr-2 text-right font-medium">Drift</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {activeRows.map((r) => {
                const drift = r.currentPct - r.targetPct;
                return (
                  <tr key={r.category} className="hover:bg-sunken/40 transition-colors">
                    <td className="py-2.5 pr-4">
                      <span className="inline-flex items-center gap-2 font-medium text-ink">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[r.category] }} />
                        {ASSET_LABELS[r.category]}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">
                      {formatPercent(r.currentPct)}
                    </td>
                    <td className="py-2.5 pr-4 text-right font-mono tabular-nums text-ink-soft">
                      {formatPercent(r.targetPct)}
                    </td>
                    <td className="py-2.5 pr-2 text-right">
                      <span
                        className={cn(
                          'inline-flex items-center justify-end gap-0.5 font-mono tabular-nums font-semibold',
                          drift > 5 ? 'text-negative' : drift < -5 ? 'text-warning' : 'text-muted',
                        )}
                      >
                        {Math.abs(drift) < 0.05 ? (
                          <Minus size={12} strokeWidth={1.8} aria-hidden="true" />
                        ) : drift > 0 ? (
                          <ArrowUpRight size={12} strokeWidth={1.8} aria-hidden="true" />
                        ) : (
                          <ArrowDownRight size={12} strokeWidth={1.8} aria-hidden="true" />
                        )}
                        {drift > 0 ? '+' : ''}
                        {drift.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Rebalancing needed — quiet action list */}
        {rebalancingActions.length > 0 && (
          <div className="mt-6 border-t border-border-subtle pt-4">
            <div className="eyebrow mb-3">Rebalancing needed</div>
            <ul className="divide-y divide-border-subtle">
              {rebalancingActions.map((r) => {
                const severity = Math.abs(r.currentPct - r.targetPct) > 10 ? 'high' : Math.abs(r.currentPct - r.targetPct) > 5 ? 'medium' : 'low';
                return (
                  <li key={r.category} className="flex items-center justify-between gap-3 py-2.5 text-xs">
                    <span className="inline-flex items-center gap-2 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[r.category] }} />
                      <span className="text-ink font-medium truncate">{ASSET_LABELS[r.category]}</span>
                      <span className="text-muted hidden sm:inline">
                        {r.action === 'Buy' ? 'underweight' : 'overweight'} by {Math.abs(r.currentPct - r.targetPct).toFixed(1)} pp
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          'font-mono tabular-nums font-semibold',
                          severity === 'high' ? 'text-negative' : severity === 'medium' ? 'text-warning' : 'text-muted',
                        )}
                      >
                        {r.action} {r.action === 'Sell' ? '−' : '+'}
                        {formatCurrencyCompact(Math.abs(r.trade))}
                      </span>
                      <StatusBadge status={severity === 'high' ? 'at-risk' : severity === 'medium' ? 'needs-review' : 'on-track'} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </section>

      {/* Supporting visual — projected terminal mix */}
      <section className="rounded-lg border border-border bg-raised shadow-card p-5 md:p-6 flex flex-col" aria-label="Projected terminal allocation">
        <SectionHeader
          title="Projected Terminal"
          description="Simulated mix at the plan horizon under the target policy."
        />
        <div className="flex-1 min-h-0">
          <DonutChart data={projectedData} />
        </div>
        <dl className="mt-4 border-t border-border-subtle pt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">Corpus</dt>
            <dd className="font-mono tabular-nums font-semibold text-ink">{formatCurrencyCompact(projectedTotal)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <dt className="text-muted">Horizon</dt>
            <dd className="font-mono tabular-nums font-semibold text-ink">{horizonYears !== null ? `${horizonYears}y` : '—'}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-2 col-span-2">
            <dt className="text-muted">Goal success</dt>
            <dd className="font-mono tabular-nums font-semibold text-ink">
              {projectionSuccess !== null ? formatPercent(projectionSuccess, 0) : '—'}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-faint leading-relaxed flex items-start gap-1.5">
          <TrendingUp size={12} strokeWidth={1.6} className="shrink-0 mt-0.5" aria-hidden="true" />
          Median simulated path; success reflects all goals funded under the target mix.
        </p>
      </section>
    </div>
  );
};
