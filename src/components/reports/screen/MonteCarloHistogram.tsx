import { useMemo } from 'react';
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
import { BarChart3 } from 'lucide-react';
import { ChartFrame, DetailTable } from './ChartFrame';
import { CHART_TOOLTIP_STYLE, CHART_TICK, CHART_GRID_STROKE, TOKEN } from './chartTheme';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../../lib/formatters';
import type { WealthEngineResult } from '../../../lib/wealthEngine';

interface MonteCarloHistogramProps {
  mc: WealthEngineResult['monteCarlo'];
}

const BIN_COUNT = 20;

interface Bin {
  binStart: number;
  count: number;
}

export const MonteCarloHistogram = ({ mc }: MonteCarloHistogramProps) => {
  const { histogram, min, max } = useMemo(() => {
    const values = mc.outcomes.map((o) => o.terminalValue);
    if (values.length === 0) return { histogram: [] as Bin[], min: 0, max: 0 };
    let lo = values[0];
    let hi = values[0];
    values.forEach((v) => {
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    });
    const span = hi - lo || 1;
    const bins: Bin[] = Array.from({ length: BIN_COUNT }, (_, i) => ({
      binStart: lo + (span * i) / BIN_COUNT,
      count: 0,
    }));
    values.forEach((v) => {
      const idx = Math.min(BIN_COUNT - 1, Math.floor(((v - lo) / span) * BIN_COUNT));
      bins[idx].count += 1;
    });
    return { histogram: bins, min: lo, max: hi };
  }, [mc.outcomes]);

  const successPct = mc.successRate * 100;
  const caption = `Median simulated terminal corpus is ${formatCurrencyCompact(mc.medianTerminal)} with an 80% confidence band of ${formatCurrencyCompact(mc.percentile5)}–${formatCurrencyCompact(mc.percentile95)}; ${formatPercent(successPct)} of paths remain sustainable.`;

  const summary = `Monte Carlo histogram of ${mc.outcomes.length} simulated terminal corpus values, ranging from ${formatCurrency(min)} to ${formatCurrency(max)}. ${caption}`;

  return (
    <ChartFrame
      title="Terminal Corpus Distribution (Monte Carlo)"
      icon={<BarChart3 size={18} className="text-muted" aria-hidden="true" />}
      caption={caption}
      summary={summary}
      detailsLabel="View percentile details"
      table={
        <DetailTable
          head={
            <>
              <th className="py-2.5 pr-4">Statistic</th>
              <th className="py-2.5 pr-4 text-right">Terminal Corpus</th>
            </>
          }
        >
          {(
            [
              ['5th percentile (stress)', mc.percentile5],
              ['25th percentile', mc.percentile25],
              ['Median (50th)', mc.medianTerminal],
              ['Mean', mc.meanTerminal],
              ['75th percentile', mc.percentile75],
              ['95th percentile (optimistic)', mc.percentile95],
              ['Minimum simulated', min],
              ['Maximum simulated', max],
            ] as [string, number][]
          ).map(([label, value]) => (
            <tr key={label}>
              <td className="py-2 pr-4 text-muted">{label}</td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(value)}</td>
            </tr>
          ))}
          <tr>
            <td className="py-2 pr-4 text-muted">Plan success rate</td>
            <td className="py-2 pr-4 text-right font-mono text-ink">{formatPercent(successPct)}</td>
          </tr>
        </DetailTable>
      }
    >
      <div className="h-72 w-full" role="img" aria-label={`Histogram of simulated terminal corpus values from ${formatCurrencyCompact(min)} to ${formatCurrencyCompact(max)}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={histogram} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis
              type="number"
              dataKey="binStart"
              domain={[min, max]}
              tickFormatter={(v: number) => formatCurrencyCompact(v)}
              tick={CHART_TICK}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
            />
            <YAxis tick={CHART_TICK} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              cursor={{ fill: 'var(--color-sunken)' }}
              formatter={(value: any, _name: any, item: any) => [
                `${item?.payload?.count ?? value} paths`,
                `from ${formatCurrencyCompact(item?.payload?.binStart ?? 0)}`,
              ]}
              contentStyle={CHART_TOOLTIP_STYLE}
            />
            <ReferenceLine
              x={mc.percentile5}
              stroke={TOKEN.negative}
              strokeDasharray="4 3"
              label={{ value: 'P5', position: 'top', fontSize: 10, fill: TOKEN.negative }}
            />
            <ReferenceLine
              x={mc.medianTerminal}
              stroke={TOKEN.accent}
              strokeWidth={2}
              label={{ value: 'Median', position: 'top', fontSize: 10, fill: TOKEN.accent }}
            />
            <ReferenceLine
              x={mc.percentile95}
              stroke={TOKEN.info}
              strokeDasharray="4 3"
              label={{ value: 'P95', position: 'top', fontSize: 10, fill: TOKEN.info }}
            />
            <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
              {histogram.map((bin) => (
                <Cell
                  key={bin.binStart}
                  fill={bin.binStart < mc.percentile5 ? TOKEN.negative : TOKEN.accent}
                  fillOpacity={bin.binStart < mc.percentile5 ? 0.85 : 0.75}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-faint mt-2">
        Bars left of the dashed P5 line (rose) are stress outcomes where the corpus fell short of the plan target.
      </p>
    </ChartFrame>
  );
};
