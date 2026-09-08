import React from 'react';
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
import { useReducedMotion } from 'framer-motion';
import { formatCompactINR, formatAxisINR, type ThemeMode } from '../../../lib/design-tokens';
import { useChartTheme, axisTickStyle, gridStrokeOpacity } from './chartTheme';
import { ChartTooltip } from './ChartTooltip';
import { ChartFigure } from './ChartFigure';

export interface NetWorthDatum {
  /** Period label, e.g. "2026" or "Age 45". */
  label: string;
  /** Total net worth at that point. */
  netWorth: number;
  /** Cumulative amount invested (cost basis). */
  invested: number;
}

export interface NetWorthAreaProps {
  data: NetWorthDatum[];
  valueFormatter?: (value: number) => string;
  axisFormatter?: (value: number) => string;
  /** Accessible title + summary (§242). */
  title: string;
  summary: string;
  height?: number;
  showDataTable?: boolean;
  mode?: ThemeMode;
  className?: string;
}

/**
 * Net-worth trajectory: net worth area over cumulative invested capital —
 * the gap between the curves is growth. Theme-aware, tabular data toggle.
 */
export const NetWorthArea: React.FC<NetWorthAreaProps> = ({
  data,
  valueFormatter = formatCompactINR,
  axisFormatter = formatAxisINR,
  title,
  summary,
  height = 300,
  showDataTable = true,
  mode,
  className,
}) => {
  const theme = useChartTheme(mode);
  const reduceMotion = useReducedMotion();

  const dataTable = showDataTable
    ? {
        headings: ['Period', 'Net worth', 'Invested'],
        rows: data.map((datum) => [datum.label, valueFormatter(datum.netWorth), valueFormatter(datum.invested)]),
      }
    : undefined;

  return (
    <ChartFigure title={title} summary={summary} dataTable={dataTable} className={className}>
      <div style={{ width: '100%', height }} role="img" aria-label={`${title}. ${summary}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" strokeOpacity={gridStrokeOpacity} vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisTickStyle}
              tickLine={false}
              axisLine={{ stroke: theme.grid }}
              minTickGap={24}
              stroke={theme.axis}
            />
            <YAxis
              tick={axisTickStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={axisFormatter}
              width={52}
              stroke={theme.axis}
            />
            <Tooltip content={<ChartTooltip />} />
            <Legend
              iconType="plainline"
              iconSize={16}
              formatter={(value: string) => (
                <span style={{ color: theme.tooltipText, fontSize: 11, fontFamily: axisTickStyle.fontFamily }}>
                  {value}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="netWorth"
              name="Net worth"
              stroke={theme.series[0]}
              strokeWidth={2.2}
              fill={theme.bandFill[1]}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              isAnimationActive={!reduceMotion}
            />
            <Area
              type="monotone"
              dataKey="invested"
              name="Invested"
              stroke={theme.series[1]}
              strokeWidth={1.8}
              strokeDasharray="5 4"
              fill="transparent"
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={!reduceMotion}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  );
};
