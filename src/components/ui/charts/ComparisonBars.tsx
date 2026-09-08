import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from 'recharts';
import { useReducedMotion } from 'framer-motion';
import { formatCompactINR, type ThemeMode } from '../../../lib/design-tokens';
import { useChartTheme, axisTickStyle, gridStrokeOpacity } from './chartTheme';
import { ChartTooltip } from './ChartTooltip';
import { ChartFigure } from './ChartFigure';

export interface ComparisonBarDatum {
  label: string;
  value: number;
  /** Optional per-bar color override; defaults to theme series[0]. */
  color?: string;
  /** Secondary line under the label, e.g. "Current plan". */
  sublabel?: string;
}

export interface ComparisonBarsProps {
  /** Ordered scenarios/values compared left→right. */
  data: ComparisonBarDatum[];
  valueFormatter?: (value: number) => string;
  /** Accessible title + summary (§242). */
  title: string;
  summary: string;
  height?: number;
  mode?: ThemeMode;
  className?: string;
}

/**
 * Comparison bars: scenario A vs B vs C (e.g. what-if outcomes) with
 * value labels and compact INR formatting (§82, §115).
 */
export const ComparisonBars: React.FC<ComparisonBarsProps> = ({
  data,
  valueFormatter = formatCompactINR,
  title,
  summary,
  height = 260,
  mode,
  className,
}) => {
  const theme = useChartTheme(mode);
  const reduceMotion = useReducedMotion();

  return (
    <ChartFigure title={title} summary={summary} className={className}>
      <div style={{ width: '100%', height }} role="img" aria-label={`${title}. ${summary}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 16, right: 8, bottom: 4, left: 8 }} barCategoryGap="28%">
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" strokeOpacity={gridStrokeOpacity} vertical={false} />
            <XAxis
              dataKey="label"
              tick={axisTickStyle}
              tickLine={false}
              axisLine={{ stroke: theme.grid }}
              stroke={theme.axis}
              tickFormatter={(value: string) => value}
            />
            <YAxis
              tick={axisTickStyle}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompactINR(value)}
              width={56}
              stroke={theme.axis}
            />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: theme.bandFill[0] }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} isAnimationActive={!reduceMotion} maxBarSize={72}>
              <LabelList
                dataKey="value"
                position="top"
                formatter={(value) => valueFormatter(Number(value))}
                style={{ fill: theme.tooltipText, fontSize: 11, fontFamily: axisTickStyle.fontFamily, fontWeight: 600 }}
              />
              {data.map((datum, index) => (
                <Cell key={datum.label} fill={datum.color ?? theme.series[index % theme.series.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  );
};
