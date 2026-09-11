import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';
import type { MonteCarloYearlyPercentile } from '../../types';
import {
  getChartTheme,
  useChartMotion,
  TOOLTIP_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  LEGEND_WRAPPER_STYLE,
} from './chartPrimitives';

interface MonteCarloFanChartProps {
  data: MonteCarloYearlyPercentile[];
  className?: string;
  /** Accessible name for the chart container. */
  ariaLabel?: string;
}

const CHART_MARGIN = { top: 10, right: 10, left: 0, bottom: 0 };

export const MonteCarloFanChart = ({ data, className, ariaLabel }: MonteCarloFanChartProps) => {
  const theme = getChartTheme();
  const motion = useChartMotion();

  const chartData = data.map((d) => ({
    age: d.age,
    p5: d.p5,
    band: Math.max(0, d.p95 - d.p5),
    p25: d.p25,
    p50: d.p50,
    p75: d.p75,
    p95: d.p95,
  }));

  const last = chartData[chartData.length - 1];
  const summary =
    chartData.length === 0 || !last
      ? 'No Monte Carlo percentile data.'
      : `Monte Carlo corpus fan: at age ${last.age} the median path is ${formatCurrencyCompact(last.p50)}, ` +
        `the favorable 75th percentile is ${formatCurrencyCompact(last.p75)}, and the stress 5th percentile is ` +
        `${formatCurrencyCompact(last.p5)}.`;

  return (
    <div className={className || "h-80 w-full"} role="img" aria-label={ariaLabel ?? 'Monte Carlo percentile fan chart'}>
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 11, fill: theme.axisLabel, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={formatCurrencyCompact}
            tick={{ fontSize: 11, fill: theme.axisLabel, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: any, name: any) => [formatCurrencyCompact(typeof value === 'number' ? value : Number(value)), name]}
            contentStyle={TOOLTIP_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={LEGEND_WRAPPER_STYLE}
          />
          <Area
            type="monotone"
            dataKey="p95"
            name="95th Pct (Optimistic)"
            stroke={theme.muted}
            strokeDasharray="4 3"
            strokeWidth={1}
            fill="none"
            animationDuration={motion}
          />
          <Area
            type="monotone"
            dataKey="p75"
            name="75th Pct (Favorable)"
            stroke={theme.secondary}
            strokeWidth={1}
            fill="none"
            animationDuration={motion}
          />
          <Area
            type="monotone"
            dataKey="p50"
            name="50th Pct (Median)"
            stroke={theme.primary}
            strokeWidth={2}
            fill={theme.primaryFill}
            fillOpacity={0.1}
            animationDuration={motion}
          />
          <Area
            type="monotone"
            dataKey="p25"
            name="25th Pct (Cautious)"
            stroke={theme.axisLabel}
            strokeWidth={1}
            fill="none"
            animationDuration={motion}
          />
          <Area
            type="monotone"
            dataKey="p5"
            name="5th Pct (Stress)"
            stroke={theme.negative}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            fill="none"
            animationDuration={motion}
          />
          <Area
            type="monotone"
            dataKey="band"
            name="P5–P95 Range"
            stackId="fan"
            stroke="none"
            fill={theme.primaryFill}
            fillOpacity={0.07}
            legendType="none"
            tooltipType="none"
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="p5"
            stackId="fan"
            stroke="none"
            fill="none"
            legendType="none"
            tooltipType="none"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
