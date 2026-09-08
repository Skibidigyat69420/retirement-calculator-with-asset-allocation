import React from 'react';
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
import { useReducedMotion } from 'framer-motion';
import { formatCompactINR, formatAxisINR, type ThemeMode } from '../../../lib/design-tokens';
import { useChartTheme, axisTickStyle, gridStrokeOpacity } from './chartTheme';
import { ChartTooltip } from './ChartTooltip';
import { ChartFigure } from './ChartFigure';

export interface FanChartDatum {
  /** Age (or year) along the x-axis. */
  age: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface AreaFanChartProps {
  /** Monte Carlo percentile series (§81: P10 P25 P50 P75 P90). */
  data: FanChartDatum[];
  /** Lifecycle markers drawn as vertical reference lines. */
  markers?: { today?: number; retirement?: number; lifeExpectancy?: number };
  /** Tooltip / data-table formatting; defaults to formatCompactINR. */
  valueFormatter?: (value: number) => string;
  /** Y-axis tick compaction; defaults to formatAxisINR. */
  axisFormatter?: (value: number) => string;
  height?: number;
  /** Accessible title + textual summary (§81, §242). */
  title: string;
  summary: string;
  showDataTable?: boolean;
  mode?: ThemeMode;
  className?: string;
}

interface TransformedDatum extends FanChartDatum {
  outerBase: number;
  outerRange: number;
  midBase: number;
  midRange: number;
}

/**
 * Monte Carlo fan chart (§81): translucent P10–P90 and P25–P75 percentile
 * bands with a dominant median line, plus Today / Retirement / Life
 * expectancy markers. Fully theme-aware and accessibility-wrapped.
 */
export const AreaFanChart = ({
  data,
  markers,
  valueFormatter = formatCompactINR,
  axisFormatter = formatAxisINR,
  height = 320,
  title,
  summary,
  showDataTable = true,
  mode,
  className,
}: AreaFanChartProps) => {
  const theme = useChartTheme(mode);
  const reduceMotion = useReducedMotion();

  const transformed = React.useMemo<TransformedDatum[]>(
    () =>
      data.map((datum) => ({
        ...datum,
        outerBase: datum.p10,
        outerRange: Math.max(0, datum.p90 - datum.p10),
        midBase: datum.p25,
        midRange: Math.max(0, datum.p75 - datum.p25),
      })),
    [data],
  );

  const markerDefs = [
    { value: markers?.today, label: 'Today', dash: '3 3' },
    { value: markers?.retirement, label: 'Retirement', dash: undefined },
    { value: markers?.lifeExpectancy, label: 'Life expectancy', dash: '3 3' },
  ].filter((marker): marker is { value: number; label: string; dash?: string } => marker.value !== undefined);

  const dataTable = showDataTable
    ? {
        headings: ['Age', 'P10', 'P25', 'P50', 'P75', 'P90'],
        rows: data.map((datum) => [
          datum.age,
          valueFormatter(datum.p10),
          valueFormatter(datum.p25),
          valueFormatter(datum.p50),
          valueFormatter(datum.p75),
          valueFormatter(datum.p90),
        ]),
      }
    : undefined;

  return (
    <ChartFigure title={title} summary={summary} dataTable={dataTable} className={className}>
      <div style={{ width: '100%', height }} role="img" aria-label={`${title}. ${summary}`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={transformed} margin={{ top: 8, right: 8, bottom: 4, left: 4 }}>
            <CartesianGrid stroke={theme.grid} strokeDasharray="3 3" strokeOpacity={gridStrokeOpacity} vertical={false} />
            <XAxis
              dataKey="age"
              tick={axisTickStyle}
              tickLine={false}
              axisLine={{ stroke: theme.grid }}
              tickFormatter={(value: number) => `${value}`}
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
            {/* Outer band P10–P90 */}
            <Area
              type="monotone"
              dataKey="outerBase"
              stackId="outer"
              stroke="none"
              fill="transparent"
              isAnimationActive={!reduceMotion}
            />
            <Area
              type="monotone"
              dataKey="outerRange"
              stackId="outer"
              stroke="none"
              fill={theme.bandFill[2]}
              name="P10–P90"
              isAnimationActive={!reduceMotion}
            />
            {/* Inner band P25–P75 */}
            <Area
              type="monotone"
              dataKey="midBase"
              stackId="mid"
              stroke="none"
              fill="transparent"
              isAnimationActive={!reduceMotion}
            />
            <Area
              type="monotone"
              dataKey="midRange"
              stackId="mid"
              stroke="none"
              fill={theme.bandFill[1]}
              name="P25–P75"
              isAnimationActive={!reduceMotion}
            />
            {/* Median */}
            <Line
              type="monotone"
              dataKey="p50"
              stroke={theme.series[0]}
              strokeWidth={2.4}
              dot={false}
              name="Median (P50)"
              isAnimationActive={!reduceMotion}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
            {markerDefs.map((marker) => (
              <ReferenceLine
                key={marker.label}
                x={marker.value}
                stroke={theme.axis}
                strokeDasharray={marker.dash}
                label={{
                  value: marker.label,
                  position: 'top',
                  fill: theme.axis,
                  fontSize: 10,
                  fontFamily: axisTickStyle.fontFamily,
                }}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  );
};
