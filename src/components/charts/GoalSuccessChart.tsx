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

const TOOLTIP_STYLE = {
  borderRadius: '14px',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
  padding: '10px 14px',
};

/**
 * Monte Carlo feasibility comparison: one bar per goal showing its simulated
 * success rate against the risk-profile success threshold.
 */
export const GoalSuccessChart = ({
  data,
  threshold,
  ariaLabel,
}: GoalSuccessChartProps) => {
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
        <p className="text-sm text-zinc-600">Add goals to compare Monte Carlo feasibility.</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full" role="img" aria-label={ariaLabel ?? `Monte Carlo feasibility by goal: ${summary}`}>
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--color-faint)' }}
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
            tick={{ fontSize: 11, fill: 'var(--color-faint)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: any) => [formatPercent(Number(value)), 'Success rate']}
            contentStyle={TOOLTIP_STYLE}
          />
          <ReferenceLine
            y={threshold}
            stroke="var(--color-ink)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: `Target ${formatPercent(threshold)}`, position: 'insideTopRight', fill: 'var(--color-muted)', fontSize: 10, fontWeight: 600 }}
          />
          <Bar dataKey="successRate" name="Monte Carlo success rate" radius={[4, 4, 0, 0]} maxBarSize={56}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={
                  entry.successRate >= threshold
                    ? 'var(--color-positive)'
                    : entry.successRate >= threshold * 0.6
                      ? 'var(--color-warning)'
                      : 'var(--color-negative)'
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
