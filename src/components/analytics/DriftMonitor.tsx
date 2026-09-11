import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { SectionHeader } from '../ui/SectionHeader';
import { getChartTheme } from '../../lib/chartTheme';
import { ASSET_COLORS, ASSET_LABELS } from '../../lib/constants';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { cn } from '../../lib/utils';
import type { AssetCategory } from '../../types';
import type { CompositionRow } from './CompositionCompare';
import type { simulateRebalancing } from '../../lib/implementationShortfall';

type RebalancingSim = ReturnType<typeof simulateRebalancing> | null;

interface DriftMonitorProps {
  rows: CompositionRow[];
  maxDrift: number;
  rebalancingSim: RebalancingSim;
  tradeImpactData: { category: AssetCategory; label: string; trade: number; impactBps: number }[];
}

/** Diverging policy-drift bars + pre-trade market-impact estimate for the rebalance program. */
export const DriftMonitor = ({ rows, maxDrift, rebalancingSim, tradeImpactData }: DriftMonitorProps) => {
  const chart = getChartTheme();
  const worst = rows.reduce(
    (a, b) => (Math.abs(b.currentPct - b.targetPct) > Math.abs(a.currentPct - a.targetPct) ? b : a),
    rows[0],
  );
  const driftNarrative =
    maxDrift > 10
      ? `${ASSET_LABELS[worst.category]} is the largest policy breach at ${maxDrift.toFixed(1)}% drift — the tickets below restore the target mix.`
      : maxDrift > 5
        ? `All asset classes sit within ±10% of policy; ${ASSET_LABELS[worst.category]} shows the widest gap at ${maxDrift.toFixed(1)}%.`
        : 'Portfolio is well balanced — every asset class is within ±5% of its strategic policy weight.';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Policy drift monitor */}
      <section className="rounded-lg border border-border bg-raised shadow-card p-5 md:p-6" aria-label="Policy drift monitor">
        <SectionHeader title="Policy Drift Monitor" description={driftNarrative} />
        <div role="img" aria-label={`Diverging bar chart of current versus target allocation per asset class. Maximum drift is ${maxDrift.toFixed(1)} percentage points.`}>
          <div className="space-y-3">
            {rows.map((r) => {
              const drift = r.currentPct - r.targetPct;
              const width = Math.min(Math.abs(drift) * 5, 50);
              return (
                <div key={r.category} className="flex items-center gap-3 text-xs">
                  <span className="w-24 shrink-0 flex items-center gap-1.5 font-medium text-ink">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ASSET_COLORS[r.category] }} />
                    {ASSET_LABELS[r.category]}
                  </span>
                  <div className="flex-1 flex items-center h-5">
                    <div className="w-1/2 flex justify-end pr-1">
                      {drift < 0 && (
                        <div
                          className="h-3.5 rounded-l-sm bg-warning"
                          style={{ width: `${width}%`, opacity: 0.85 }}
                          title={`${drift.toFixed(1)}% under target`}
                        />
                      )}
                    </div>
                    <div className="w-px h-5 bg-border-strong shrink-0" />
                    <div className="w-1/2 pl-1">
                      {drift > 0 && (
                        <div
                          className="h-3.5 rounded-r-sm bg-negative"
                          style={{ width: `${width}%`, opacity: 0.85 }}
                          title={`+${drift.toFixed(1)}% over target`}
                        />
                      )}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'w-16 shrink-0 text-right font-mono tabular-nums font-semibold',
                      drift > 5 ? 'text-negative' : drift < -5 ? 'text-warning' : 'text-muted',
                    )}
                  >
                    {drift > 0 ? '+' : ''}
                    {drift.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 text-[11px] text-muted">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-negative" /> Over target</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-warning" /> Under target</span>
            <span className="text-faint">Center line = policy weight</span>
          </div>
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

      {/* Trade impact estimate */}
      <section className="rounded-lg border border-border bg-raised shadow-card p-5 md:p-6" aria-label="Rebalance trade impact estimate">
        <SectionHeader
          title="Trade Impact Estimate"
          description={
            rebalancingSim && rebalancingSim.trades.length > 0
              ? `Square-root market impact vs an assumed 2%-of-portfolio daily liquidity. Weighted cost ${rebalancingSim.totalImpactBps.toFixed(1)} bps on ${formatPercent(rebalancingSim.totalTurnover * 50)} one-way turnover.`
              : 'Estimated implementation shortfall for the full rebalance program.'
          }
        />
        {rebalancingSim && rebalancingSim.trades.length > 0 ? (
          <>
            <div
              className="h-64 w-full"
              role="img"
              aria-label={`Bar chart of rebalance trade value per asset class. Weighted estimated market impact is ${rebalancingSim.totalImpactBps.toFixed(1)} basis points.`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tradeImpactData} layout="vertical" margin={{ top: 5, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={chart.grid} />
                  <XAxis
                    type="number"
                    tickFormatter={(v: number) => formatCurrencyCompact(v)}
                    tick={{ fontSize: 11, fill: chart.axisLabel, fontFamily: 'var(--font-mono)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={92}
                    tick={{ fontSize: 11, fill: chart.axisLabel }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any, _name: any, item: any) => [
                      `${formatCurrency(Number(value))} · est. impact ${Number(item?.payload?.impactBps ?? 0).toFixed(1)} bps`,
                      'Rebalance trade',
                    ]}
                    contentStyle={{
                      borderRadius: '8px',
                      border: `1px solid ${chart.tooltipBorder}`,
                      backgroundColor: chart.tooltipBg,
                      padding: '8px 12px',
                      fontSize: '12px',
                    }}
                  />
                  <ReferenceLine x={0} stroke={chart.muted} />
                  <Bar dataKey="trade" name="Rebalance trade" radius={[3, 3, 3, 3]} minPointSize={2}>
                    {tradeImpactData.map((d) => (
                      <Cell
                        key={d.category}
                        style={{ fill: d.trade >= 0 ? chart.positive : chart.negative }}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Rebalance trade value and estimated market impact per asset class</caption>
              <thead>
                <tr><th>Asset class</th><th>Trade value</th><th>Estimated impact (bps)</th></tr>
              </thead>
              <tbody>
                {tradeImpactData.map((d) => (
                  <tr key={d.category}>
                    <td>{d.label}</td>
                    <td>{formatCurrency(d.trade)}</td>
                    <td>{d.impactBps.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p className="text-xs text-muted leading-relaxed">
            No material trades required — current allocation already matches policy targets.
          </p>
        )}
      </section>
    </div>
  );
};
