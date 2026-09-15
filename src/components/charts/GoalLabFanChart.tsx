import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';
import type { GoalYearlyPercentile } from '../../lib/goalMonteCarlo';
import {
  getChartTheme,
  useChartMotion,
  TOOLTIP_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
} from './chartPrimitives';

export interface GoalHorizonMarker {
  year: number;
  name: string;
  cost: number;
}

interface GoalLabFanChartProps {
  data: GoalYearlyPercentile[];
  markers: GoalHorizonMarker[];
  /** Cumulative inflated goal cost at each year (deterministic). */
  cumulativeCost: { year: number; cost: number }[];
  className?: string;
  ariaLabel?: string;
}

const CHART_MARGIN = { top: 10, right: 12, left: 0, bottom: 0 };

/**
 * Household corpus fan (p5–p95 with median) against the cumulative goal-cost
 * line, with a dashed marker at each goal horizon. Corpora below the cost
 * line at a marker are failing paths.
 */
export const GoalLabFanChart = ({ data, markers, cumulativeCost, className, ariaLabel }: GoalLabFanChartProps) => {
  const theme = getChartTheme();
  const motion = useChartMotion();

  const costByYear = new Map(cumulativeCost.map((c) => [c.year, c.cost]));
  const chartData = data.map((d) => ({
    year: d.year,
    p5: d.p5,
    band: Math.max(0, d.p95 - d.p5),
    p50: d.p50,
    p95: d.p95,
    goalCost: costByYear.get(d.year) ?? null,
  }));

  const last = chartData[chartData.length - 1];
  const summary =
    chartData.length === 0 || !last
      ? 'No simulation data.'
      : `Corpus fan over ${last.year} years: median ${formatCurrencyCompact(last.p50)}, ` +
        `stress 5th percentile ${formatCurrencyCompact(last.p5)}.`;

  return (
    <div className={className || 'h-80 w-full'} role="img" aria-label={ariaLabel ?? 'Goal funding fan chart'}>
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: theme.axisLabel, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={(v: number) => formatCurrencyCompact(v)}
            tick={{ fontSize: 11, fill: theme.axisLabel, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: any, name: any) => [
              value == null ? '—' : formatCurrencyCompact(typeof value === 'number' ? value : Number(value)),
              name,
            ]}
            contentStyle={TOOLTIP_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
          />
          <Area
            type="monotone"
            dataKey="band"
            stackId="fan"
            stroke="none"
            fill={theme.primaryFill}
            fillOpacity={0.09}
            isAnimationActive={false}
            legendType="none"
            tooltipType="none"
          />
          <Area
            type="monotone"
            dataKey="p5"
            stackId="fan"
            stroke="none"
            fill="none"
            isAnimationActive={false}
            legendType="none"
            tooltipType="none"
          />
          <Line
            type="monotone"
            dataKey="p95"
            name="95th pct"
            stroke={theme.muted}
            strokeDasharray="4 3"
            strokeWidth={1}
            dot={false}
            animationDuration={motion}
          />
          <Line
            type="stepAfter"
            dataKey="goalCost"
            name="Cumulative goal cost"
            stroke={theme.secondary}
            strokeWidth={1.5}
            strokeDasharray="2 3"
            dot={{ r: 2.5, fill: theme.secondary, strokeWidth: 0 }}
            connectNulls={false}
            animationDuration={motion}
          />
          <Line
            type="monotone"
            dataKey="p50"
            name="Median corpus"
            stroke={theme.primary}
            strokeWidth={2}
            dot={false}
            animationDuration={motion}
          />
          {markers.map((m) => (
            <ReferenceLine
              key={`${m.year}-${m.name}`}
              x={m.year}
              stroke={theme.reference}
              strokeDasharray="3 3"
              strokeWidth={1}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
