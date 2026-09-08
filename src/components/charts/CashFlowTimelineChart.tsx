import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';
import type { WealthSnapshot } from '../../lib/wealthEngine';

interface CashFlowTimelineChartProps {
  snapshots: WealthSnapshot[];
  ariaLabel?: string;
}

interface YearFlow {
  label: string;
  invested: number;
  goals: number;
  withdrawn: number;
  taxes: number;
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

/**
 * Aggregates per-year cash flow events from the wealth engine snapshots:
 * SIP/STP contributions (invested), goal funding, SWP withdrawals and taxes.
 */
export const CashFlowTimelineChart = ({
  snapshots,
  ariaLabel = 'Annual cash flow events: invested contributions, goal funding, withdrawals and taxes by age',
}: CashFlowTimelineChartProps) => {
  const { chartData, summary } = useMemo(() => {
    const rows: YearFlow[] = [];
    for (let i = 1; i < snapshots.length; i++) {
      const s = snapshots[i];
      const prev = snapshots[i - 1];
      const sumByType = (type: string) =>
        s.cashFlows.filter((cf) => cf.type === type).reduce((sum, cf) => sum + cf.amount, 0);
      rows.push({
        label: `Age ${s.age}`,
        invested: Math.max(0, s.invested - prev.invested),
        goals: sumByType('goal'),
        withdrawn: Math.max(0, s.withdrawn - prev.withdrawn),
        taxes: sumByType('tax'),
      });
    }

    const totalInvested = rows.reduce((sum, r) => sum + r.invested, 0);
    const totalGoals = rows.reduce((sum, r) => sum + r.goals, 0);
    const totalWithdrawn = rows.reduce((sum, r) => sum + r.withdrawn, 0);
    const totalTaxes = rows.reduce((sum, r) => sum + r.taxes, 0);
    const summaryText =
      `Across the projection, total invested contributions reach ${formatCurrencyCompact(totalInvested)}, ` +
      `${formatCurrencyCompact(totalGoals)} is deployed to fund milestone goals, ` +
      `${formatCurrencyCompact(totalWithdrawn)} is withdrawn as retirement income, and ` +
      `${formatCurrencyCompact(totalTaxes)} is paid in estimated taxes.`;
    return { chartData: rows, summary: summaryText };
  }, [snapshots]);

  if (chartData.length === 0) {
    return (
      <div className="h-80 w-full flex items-center justify-center" role="img" aria-label={ariaLabel}>
        <span className="sr-only">No cash flow events in the projection.</span>
        <p className="text-sm text-zinc-600">No cash flow events to display.</p>
      </div>
    );
  }

  return (
    <div className="h-80 w-full" role="img" aria-label={ariaLabel}>
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={formatCurrencyCompact}
            tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: 'rgba(139, 149, 165, 0.06)' }}
            formatter={(value: any, name: any) => [
              formatCurrencyCompact(typeof value === 'number' ? value : Number(value)),
              String(name),
            ]}
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend
            verticalAlign="top"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={LEGEND_WRAPPER_STYLE}
          />
          <Bar dataKey="invested" name="Invested (SIP + STP)" stackId="in" fill="var(--color-accent)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="goals" name="Goal Funding" stackId="out" fill="var(--color-warning)" />
          <Bar dataKey="withdrawn" name="SWP Withdrawals" stackId="out" fill="var(--color-negative)" />
          <Bar dataKey="taxes" name="Taxes" stackId="out" fill="var(--color-info)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
