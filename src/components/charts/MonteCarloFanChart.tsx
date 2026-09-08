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
import { COLORS } from '../../lib/constants';
import type { MonteCarloYearlyPercentile } from '../../types';

interface MonteCarloFanChartProps {
  data: MonteCarloYearlyPercentile[];
  className?: string;
  /** Accessible name for the chart container. */
  ariaLabel?: string;
}

const CHART_MARGIN = { top: 10, right: 10, left: 0, bottom: 0 };

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid #2b3444',
  backgroundColor: '#161b26',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.55), 0 8px 10px -6px rgba(0, 0, 0, 0.45)',
  padding: '10px 14px',
};

const LEGEND_WRAPPER_STYLE = { fontSize: '11px', paddingBottom: '8px', color: 'var(--color-muted)' };

const XAXIS_LABEL = { value: 'Age', position: 'insideBottom' as const, offset: -5, fill: 'var(--color-muted)', fontSize: 11 };

export const MonteCarloFanChart = ({ data, className, ariaLabel }: MonteCarloFanChartProps) => {
  const chartData = data.map((d) => ({
    age: d.age,
    p5: d.p5,
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
          <defs>
            <linearGradient id="colorFan90" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.12} />
              <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="colorFan50" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.navy} stopOpacity={0.15} />
              <stop offset="95%" stopColor={COLORS.navy} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            label={XAXIS_LABEL}
          />
          <YAxis
            tickFormatter={formatCurrencyCompact}
            tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: any, name: any) => [formatCurrencyCompact(typeof value === 'number' ? value : Number(value)), name]}
            contentStyle={TOOLTIP_STYLE}
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
            stroke="#7dd3fc"
            strokeDasharray="4 4"
            strokeWidth={1}
            fill="url(#colorFan90)"
          />
          <Area
            type="monotone"
            dataKey="p75"
            name="75th Pct (Favorable)"
            stroke="var(--color-muted)"
            strokeWidth={1}
            fill="url(#colorFan50)"
          />
          <Area
            type="monotone"
            dataKey="p50"
            name="50th Pct (Median)"
            stroke="#8cff2e"
            strokeWidth={2.5}
            fill="none"
          />
          <Area
            type="monotone"
            dataKey="p25"
            name="25th Pct (Cautious)"
            stroke="var(--color-muted)"
            strokeWidth={1}
            fill="none"
          />
          <Area
            type="monotone"
            dataKey="p5"
            name="5th Pct (Stress)"
            stroke="#fb7185"
            strokeDasharray="3 3"
            strokeWidth={1.5}
            fill="none"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
