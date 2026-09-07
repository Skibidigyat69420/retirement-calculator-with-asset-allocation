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
import { ShieldAlert } from 'lucide-react';
import { ChartFrame, DetailTable } from './ChartFrame';
import { CHART_TOOLTIP_STYLE, CHART_TICK, CHART_GRID_STROKE, TOKEN } from './chartTheme';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../../lib/formatters';
import { Badge } from '../../ui/Badge';
import type { StressTestImpact } from '../../../lib/stressTest';

interface StressScenarioChartProps {
  results: StressTestImpact[];
}

interface ScenarioRow {
  id: string;
  name: string;
  baseline: number;
  shocked: number;
}

export const StressScenarioChart = ({ results }: StressScenarioChartProps) => {
  const rows: ScenarioRow[] = useMemo(
    () =>
      results.map((r) => ({
        id: r.scenario.id,
        name: r.scenario.name.replace(/^(2008|2020|2000) /, ''),
        baseline: r.baselineCorpusAtRetirement,
        shocked: r.shockedCorpusAtRetirement,
      })),
    [results],
  );

  const worst = useMemo(
    () => results.reduce((w, r) => (r.corpusDelta < w.corpusDelta ? r : w), results[0]),
    [results],
  );

  const caption = worst
    ? `Under the ${worst.scenario.name} the corpus at retirement falls ${formatCurrencyCompact(Math.abs(worst.corpusDelta))} (${formatPercent((worst.corpusDelta / (worst.baselineCorpusAtRetirement || 1)) * 100)}); the plan remains sustainable in ${results.filter((r) => r.shockedSustainable).length} of ${results.length} scenarios.`
    : 'No stress scenarios available.';

  const summary = `Stress scenario comparison of corpus at retirement, baseline versus shocked. ${results
    .map((r) => `${r.scenario.name}: baseline ${formatCurrency(r.baselineCorpusAtRetirement)}, shocked ${formatCurrency(r.shockedCorpusAtRetirement)}, change ${formatCurrency(r.corpusDelta)}, resilience score ${r.resilienceScore} out of 100`)
    .join('. ')}.`;

  return (
    <ChartFrame
      title="Stress Scenarios — Corpus at Retirement"
      icon={<ShieldAlert size={18} className="text-muted" aria-hidden="true" />}
      caption={caption}
      summary={summary}
      detailsLabel="View scenario impact table"
      table={
        <DetailTable
          head={
            <>
              <th className="py-2.5 pr-4">Scenario</th>
              <th className="py-2.5 pr-4 text-right">Baseline Corpus</th>
              <th className="py-2.5 pr-4 text-right">Shocked Corpus</th>
              <th className="py-2.5 pr-4 text-right">Change</th>
              <th className="py-2.5 pr-4 text-right">Resilience</th>
              <th className="py-2.5 pr-4">Outcome</th>
            </>
          }
        >
          {results.map((r) => (
            <tr key={r.scenario.id}>
              <td className="py-2 pr-4">
                <div className="font-semibold text-ink">{r.scenario.name}</div>
                <div className="text-[11px] text-muted">{r.scenario.historicalPeriod}</div>
              </td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(r.baselineCorpusAtRetirement)}</td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(r.shockedCorpusAtRetirement)}</td>
              <td className="py-2 pr-4 text-right font-mono text-negative">{formatCurrency(r.corpusDelta)}</td>
              <td className="py-2 pr-4 text-right font-mono text-ink">{r.resilienceScore}/100</td>
              <td className="py-2 pr-4">
                <Badge variant={r.shockedSustainable ? 'success' : 'danger'}>
                  {r.shockedSustainable ? 'Sustainable' : `Depletes age ${r.shockedDepletionAge ?? '—'}`}
                </Badge>
              </td>
            </tr>
          ))}
        </DetailTable>
      }
    >
      <div className="h-72 w-full" role="img" aria-label={`Grouped bar chart comparing baseline and shocked corpus at retirement across ${rows.length} historical crisis scenarios`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis dataKey="name" tick={CHART_TICK} axisLine={false} tickLine={false} tickMargin={8} interval={0} />
            <YAxis tickFormatter={formatCurrencyCompact} tick={CHART_TICK} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              formatter={(value: any, name: any) => [formatCurrencyCompact(typeof value === 'number' ? value : Number(value)), name]}
              contentStyle={CHART_TOOLTIP_STYLE}
            />
            <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="baseline" name="Baseline Corpus at Retirement" fill={TOKEN.muted} fillOpacity={0.6} radius={[3, 3, 0, 0]} />
            <Bar dataKey="shocked" name="Shocked Corpus at Retirement" fill={TOKEN.negative} fillOpacity={0.85} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
};
