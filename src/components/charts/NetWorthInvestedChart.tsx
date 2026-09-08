import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';
import { COLORS } from '../../lib/constants';

export interface NetWorthDataPoint {
  label: string;
  netWorth: number;
  invested: number;
}

interface NetWorthInvestedChartProps {
  data: NetWorthDataPoint[];
  xKey?: string;
  ariaLabel?: string;
}

const CHART_MARGIN = { top: 10, right: 10, left: 0, bottom: 0 };

const TOOLTIP_STYLE = {
  borderRadius: '14px',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
  padding: '10px 14px',
};

export const NetWorthInvestedChart = ({
  data,
  xKey = 'label',
  ariaLabel = 'Net worth evolution with cumulative invested capital overlay',
}: NetWorthInvestedChartProps) => {
  const summary = useMemo(() => {
    if (data.length === 0) return 'No projection data available.';
    const first = data[0];
    const last = data[data.length - 1];
    const growthMultiple = first.netWorth > 0 ? last.netWorth / first.netWorth : 0;
    return (
      `Projected net worth grows from ${formatCurrencyCompact(first.netWorth)} at ${first.label} ` +
      `to ${formatCurrencyCompact(last.netWorth)} at ${last.label}, while cumulative invested capital reaches ` +
      `${formatCurrencyCompact(last.invested)} — a ${growthMultiple.toFixed(1)}× multiple on the starting net worth.`
    );
  }, [data]);

  return (
    <div
      className="h-80 w-full"
      role="img"
      aria-label={ariaLabel}
    >
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.navy} stopOpacity={0.12} />
              <stop offset="95%" stopColor={COLORS.navy} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: 'var(--color-faint)' }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={formatCurrencyCompact}
            tick={{ fontSize: 12, fill: 'var(--color-faint)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: any) =>
              formatCurrencyCompact(typeof value === 'number' ? value : Number(value))
            }
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" />
          <Area
            type="monotone"
            dataKey="netWorth"
            name="Net Worth"
            stroke={COLORS.navy}
            strokeWidth={2.5}
            fill="url(#colorNetWorth)"
          />
          <Line
            type="monotone"
            dataKey="invested"
            name="Cumulative Capital Invested"
            stroke="var(--color-accent)"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
