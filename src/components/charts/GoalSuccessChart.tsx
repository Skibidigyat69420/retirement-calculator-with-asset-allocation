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
import { formatPercent } from '../../lib/formatters';
import {
  getChartTheme,
  useChartMotion,
  TOOLTIP_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
} from './chartPrimitives';

export interface GoalSuccessDatum {
  name: string;
  successRate: number; // 0–100
}

interface GoalSuccessChartProps {
  data: GoalSuccessDatum[];
  threshold: number; // 0–100
  ariaLabel?: string;
}

const CHART_MARGIN = { top: 10, right: 10, left: 0, bottom: 0 };

/**
 * Monte Carlo feasibility comparison: one bar per goal showing its simulated
 * success rate against the risk-profile success threshold.
 */
export const GoalSuccessChart = ({
  data,
  threshold,
  ariaLabel,
}: GoalSuccessChartProps) => {
  const theme = getChartTheme();
  const motion = useChartMotion();

  const { summary } = useMemo(() => {
    const funded = data.filter((d) => d.successRate >= threshold).length;
    const summaryText =
      data.length === 0
        ? 'No goals configured.'
        : `${funded} of ${data.length} goals meet the ${formatPercent(threshold)} success threshold.` +
          (funded < data.length
            ? ` Lowest feasibility: ${formatPercent(Math.min(...data.map((d) => d.successRate)))}.`
            : '');
    return { fundedCount: funded, summary: summaryText };
  }, [data, threshold]);

  if (data.length === 0) {
    return (
      <div className="h-72 w-full flex items-center justify-center" role="img" aria-label={ariaLabel ?? 'Goal feasibility chart, no goals'}>
        <span className="sr-only">No goals configured.</span>
        <p className="text-sm text-muted">Add goals to compare Monte Carlo feasibility.</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full" role="img" aria-label={ariaLabel ?? `Monte Carlo feasibility by goal: ${summary}`}>
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: theme.axisLabel }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            interval={0}
            angle={-20}
            textAnchor="end"
            height={50}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: theme.axisLabel, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: unknown) => [formatPercent(Number(value)), 'Success rate']}
            contentStyle={TOOLTIP_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
          />
          <ReferenceLine
            y={threshold}
            stroke={theme.reference}
            strokeDasharray="4 3"
            strokeWidth={1.5}
            label={{ value: `Target ${formatPercent(threshold)}`, position: 'insideTopRight', fill: theme.axisLabel, fontSize: 10, fontWeight: 600 }}
          />
          <Bar dataKey="successRate" name="Monte Carlo success rate" radius={[4, 4, 0, 0]} maxBarSize={56} animationDuration={motion}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.successRate >= threshold
                    ? theme.positive
                    : entry.successRate >= threshold * 0.6
                      ? theme.warning
                      : theme.negative
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
