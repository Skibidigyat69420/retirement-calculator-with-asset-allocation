import React from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { useReducedMotion } from 'framer-motion';
import { formatCompactINR, formatPercent, type ThemeMode } from '../../../lib/design-tokens';
import { useChartTheme, axisTickStyle } from './chartTheme';
import { ChartTooltip } from './ChartTooltip';
import { ChartFigure } from './ChartFigure';

export interface DonutAllocationDatum {
  name: string;
  value: number;
  /** Optional explicit color; defaults to the theme series palette (§115). */
  color?: string;
}

export interface DonutAllocationProps {
  data: DonutAllocationDatum[];
  /** Center label (top line), e.g. "Total corpus". */
  centerLabel?: string;
  /** Center value (bottom line), e.g. "₹4.86 Cr". */
  centerValue?: string;
  valueFormatter?: (value: number) => string;
  /** Accessible title + summary (§242). */
  title: string;
  summary: string;
  height?: number;
  mode?: ThemeMode;
  className?: string;
}

/**
 * Allocation donut (§115 chart contract): responsive, theme-aware series
 * colors, compact INR formatting, accessible figure wrapper.
 */
export const DonutAllocation: React.FC<DonutAllocationProps> = ({
  data,
  centerLabel,
  centerValue,
  valueFormatter = formatCompactINR,
  title,
  summary,
  height = 280,
  mode,
  className,
}) => {
  const theme = useChartTheme(mode);
  const reduceMotion = useReducedMotion();
  const total = data.reduce((sum, datum) => sum + datum.value, 0);

  const legendFormatter = (value: string, entry: { payload?: { value?: number } }) => {
    const amount = entry.payload?.value ?? 0;
    return (
      <span style={{ color: theme.tooltipText, fontSize: 11, fontFamily: axisTickStyle.fontFamily }}>
        {value} · {formatPercent(total > 0 ? (amount / total) * 100 : 0)} ({valueFormatter(amount)})
      </span>
    );
  };

  return (
    <ChartFigure title={title} summary={summary} className={className}>
      <div style={{ width: '100%', height }} role="img" aria-label={`${title}. ${summary}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip content={<ChartTooltip />} />
            <Legend
              verticalAlign="middle"
              align="right"
              layout="vertical"
              iconType="circle"
              iconSize={8}
              formatter={legendFormatter}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="58%"
              outerRadius="88%"
              paddingAngle={2}
              cornerRadius={4}
              strokeWidth={0}
              isAnimationActive={!reduceMotion}
            >
              {data.map((datum, index) => (
                <Cell
                  key={datum.name}
                  fill={datum.color ?? theme.series[index % theme.series.length]}
                />
              ))}
            </Pie>
            {(centerLabel ?? centerValue) && (
              <text
                x="38%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ fill: theme.tooltipText }}
              >
                {centerLabel && (
                  <tspan x="38%" dy="-0.6em" fontSize={11} fill={theme.axis} fontFamily={axisTickStyle.fontFamily}>
                    {centerLabel}
                  </tspan>
                )}
                {centerValue && (
                  <tspan x="38%" dy="1.4em" fontSize={16} fontWeight={700} fontFamily={axisTickStyle.fontFamily}>
                    {centerValue}
                  </tspan>
                )}
              </text>
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartFigure>
  );
};
