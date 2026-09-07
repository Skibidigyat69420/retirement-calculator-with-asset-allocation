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
import { Layers } from 'lucide-react';
import { ChartFrame, DetailTable } from './ChartFrame';
import { CHART_TOOLTIP_STYLE, CHART_TICK, CHART_GRID_STROKE, TOKEN } from './chartTheme';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../../lib/formatters';
import { Badge } from '../../ui/Badge';
import type { GoalConflictResult } from '../../../lib/goalConflictEngine';

interface GoalFundingChartProps {
  conflict: GoalConflictResult;
}

interface FundingRow {
  id: string;
  name: string;
  funded: number;
  shortfall: number;
  futureCost: number;
  coveragePercent: number;
  status: string;
}

export const GoalFundingChart = ({ conflict }: GoalFundingChartProps) => {
  const rows: FundingRow[] = useMemo(
    () =>
      conflict.evaluatedGoals.map((g) => ({
        id: g.id,
        name: g.name.length > 22 ? `${g.name.slice(0, 21)}…` : g.name,
        funded: Math.max(0, g.futureCost - g.shortfall),
        shortfall: g.shortfall,
        futureCost: g.futureCost,
        coveragePercent: g.coveragePercent,
        status: g.fundedStatus,
      })),
    [conflict.evaluatedGoals],
  );

  const totalShortfall = conflict.evaluatedGoals.reduce((s, g) => s + g.shortfall, 0);
  const caption = conflict.isFullyFunded
    ? `All ${rows.length} goals are fully funded from projected wealth of ${formatCurrencyCompact(conflict.projectedAvailableWealth)} against total demand of ${formatCurrencyCompact(conflict.totalHouseholdDemand)}.`
    : `Total household demand is ${formatCurrencyCompact(conflict.totalHouseholdDemand)} against projected available wealth of ${formatCurrencyCompact(conflict.projectedAvailableWealth)} — an aggregate shortfall of ${formatCurrencyCompact(Math.max(0, totalShortfall))} across under-funded goals.`;

  const summary = `Goal funding analysis. ${caption} Per goal: ${conflict.evaluatedGoals
    .map((g) => `${g.name}: cost ${formatCurrency(g.futureCost)}, allocated ${formatCurrency(g.allocatedWealth)}, shortfall ${formatCurrency(g.shortfall)}, coverage ${formatPercent(g.coveragePercent)}, status ${g.fundedStatus}`)
    .join('. ')}.`;

  const statusVariant = (status: string): 'success' | 'warning' | 'danger' =>
    status === 'Fully Funded' ? 'success' : status === 'Partially Funded' ? 'warning' : 'danger';

  return (
    <ChartFrame
      title="Goal Funding vs Shortfall"
      icon={<Layers size={18} className="text-muted" aria-hidden="true" />}
      caption={caption}
      summary={summary}
      detailsLabel="View per-goal funding table"
      table={
        <DetailTable
          head={
            <>
              <th className="py-2.5 pr-4">Goal</th>
              <th className="py-2.5 pr-4 text-right">Future Cost</th>
              <th className="py-2.5 pr-4 text-right">Allocated</th>
              <th className="py-2.5 pr-4 text-right">Shortfall</th>
              <th className="py-2.5 pr-4 text-right">Coverage</th>
              <th className="py-2.5 pr-4">Status</th>
            </>
          }
        >
          {conflict.evaluatedGoals.map((g) => (
            <tr key={g.id}>
              <td className="py-2 pr-4 font-semibold text-ink">{g.name}</td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(g.futureCost)}</td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(g.allocatedWealth)}</td>
              <td className="py-2 pr-4 text-right font-mono text-negative">{formatCurrency(g.shortfall)}</td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{formatPercent(g.coveragePercent)}</td>
              <td className="py-2 pr-4">
                <Badge variant={statusVariant(g.fundedStatus)}>{g.fundedStatus}</Badge>
              </td>
            </tr>
          ))}
        </DetailTable>
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No goals defined yet — add goals in the Goal Planner to see funding coverage.</p>
      ) : (
        <div className="h-72 w-full" role="img" aria-label={`Stacked bar chart of funding versus shortfall for ${rows.length} goals`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_GRID_STROKE} />
              <XAxis type="number" tickFormatter={formatCurrencyCompact} tick={CHART_TICK} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={CHART_TICK} axisLine={false} tickLine={false} width={120} />
              <Tooltip
                formatter={(value: any, name: any) => [formatCurrencyCompact(typeof value === 'number' ? value : Number(value)), name]}
                contentStyle={CHART_TOOLTIP_STYLE}
              />
              <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
              <Bar dataKey="funded" name="Funded (PV allocated)" stackId="funding" fill={TOKEN.accent} fillOpacity={0.85} />
              <Bar dataKey="shortfall" name="Shortfall" stackId="funding" fill={TOKEN.negative} fillOpacity={0.85} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartFrame>
  );
};
