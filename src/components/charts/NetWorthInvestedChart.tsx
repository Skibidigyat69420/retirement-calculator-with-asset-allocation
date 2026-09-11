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
import {
  getChartTheme,
  useChartMotion,
  TOOLTIP_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  LEGEND_WRAPPER_STYLE,
} from './chartPrimitives';

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

export const NetWorthInvestedChart = ({
  data,
  xKey = 'label',
  ariaLabel = 'Net worth evolution with cumulative invested capital overlay',
}: NetWorthInvestedChartProps) => {
  const theme = getChartTheme();
  const motion = useChartMotion();

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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: theme.axisLabel }}
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
            formatter={(value: unknown) =>
              formatCurrencyCompact(typeof value === 'number' ? value : Number(value))
            }
            contentStyle={TOOLTIP_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={LEGEND_WRAPPER_STYLE} />
          <Area
            type="monotone"
            dataKey="netWorth"
            name="Net Worth"
            stroke={theme.primary}
            strokeWidth={2}
            fill={theme.primaryFill}
            fillOpacity={0.1}
            animationDuration={motion}
          />
          <Line
            type="monotone"
            dataKey="invested"
            name="Cumulative Capital Invested"
            stroke={theme.reference}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            animationDuration={motion}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
