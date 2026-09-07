import { useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceArea,
} from 'recharts';
import { LineChart } from 'lucide-react';
import { ChartFrame, DetailTable } from './ChartFrame';
import { CHART_TOOLTIP_STYLE, CHART_TICK, CHART_GRID_STROKE, TOKEN } from './chartTheme';
import { formatCurrency, formatCurrencyCompact } from '../../../lib/formatters';
import type { WealthSnapshot } from '../../../lib/wealthEngine';

interface NetWorthTrajectoryProps {
  snapshots: WealthSnapshot[];
}

interface TrajectoryRow {
  age: number;
  label: string;
  total: number;
  realTotal: number;
}

export const NetWorthTrajectory = ({ snapshots }: NetWorthTrajectoryProps) => {
  const { data, distributionStart } = useMemo(() => {
    const rows: TrajectoryRow[] = snapshots.map((s) => ({
      age: s.age,
      label: `Age ${s.age}`,
      total: s.total,
      realTotal: s.realTotal,
    }));
    const dist = snapshots.find((s) => s.phase === 'distribution')?.age ?? null;
    return { data: rows, distributionStart: dist };
  }, [snapshots]);

  const peak = useMemo(
    () => data.reduce((best, r) => (r.total > best.total ? r : best), data[0] ?? { age: 0, total: 0, realTotal: 0 }),
    [data],
  );
  const terminal = data[data.length - 1];

  const caption = terminal
    ? `Net worth peaks around age ${peak.age} at ${formatCurrencyCompact(peak.total)} and ends at ${formatCurrencyCompact(terminal.total)} (real purchasing power ${formatCurrencyCompact(terminal.realTotal)}); the shaded band marks the retirement distribution phase${distributionStart ? ` from age ${distributionStart}` : ''}.`
    : 'No projection data available.';

  const summary = `Net worth trajectory across ages ${data[0]?.age ?? 0} to ${terminal?.age ?? 0}. Peak net worth ${formatCurrency(peak.total)} at age ${peak.age}. Terminal net worth ${formatCurrency(terminal?.total ?? 0)}, terminal real (inflation-adjusted) value ${formatCurrency(terminal?.realTotal ?? 0)}. ${distributionStart ? `Distribution phase begins at age ${distributionStart}.` : ''}`;

  const sampleStep = Math.max(1, Math.floor(data.length / 10));

  return (
    <ChartFrame
      title="Net Worth Trajectory — Accumulation vs Distribution"
      icon={<LineChart size={18} className="text-muted" aria-hidden="true" />}
      caption={caption}
      summary={summary}
      detailsLabel="View yearly trajectory"
      table={
        <DetailTable
          head={
            <>
              <th className="py-2.5 pr-4">Age</th>
              <th className="py-2.5 pr-4">Phase</th>
              <th className="py-2.5 pr-4 text-right">Net Worth (Nominal)</th>
              <th className="py-2.5 pr-4 text-right">Net Worth (Real)</th>
            </>
          }
        >
          {data
            .filter((_, i) => i % sampleStep === 0 || i === data.length - 1)
            .map((row) => (
              <tr key={row.age}>
                <td className="py-2 pr-4 font-mono text-ink">{row.age}</td>
                <td className="py-2 pr-4">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      distributionStart !== null && row.age >= distributionStart
                        ? 'bg-warning-soft text-warning'
                        : 'bg-positive-soft text-positive'
                    }`}
                  >
                    {distributionStart !== null && row.age >= distributionStart ? 'Distribution' : 'Accumulation'}
                  </span>
                </td>
                <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(row.total)}</td>
                <td className="py-2 pr-4 text-right font-mono text-muted">{formatCurrency(row.realTotal)}</td>
              </tr>
            ))}
        </DetailTable>
      }
    >
      <div className="h-80 w-full" role="img" aria-label={`Area chart of net worth from age ${data[0]?.age ?? 0} to ${terminal?.age ?? 0} with distribution phase shaded`}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNetWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={TOKEN.ink} stopOpacity={0.14} />
                <stop offset="95%" stopColor={TOKEN.ink} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis
              dataKey="age"
              tickFormatter={(a: number) => `Age ${a}`}
              tick={CHART_TICK}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              minTickGap={32}
            />
            <YAxis tickFormatter={formatCurrencyCompact} tick={CHART_TICK} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              formatter={(value: any, name: any) => [formatCurrencyCompact(typeof value === 'number' ? value : Number(value)), name]}
              labelFormatter={(age: any) => `Age ${age}`}
              contentStyle={CHART_TOOLTIP_STYLE}
            />
            <Legend verticalAlign="top" height={32} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            {distributionStart !== null && (
              <ReferenceArea
                x1={distributionStart}
                x2={terminal?.age}
                fill={TOKEN.warning}
                fillOpacity={0.07}
                label={{ value: 'Distribution', position: 'insideTop', fontSize: 10, fill: TOKEN.warning }}
              />
            )}
            <Area
              type="monotone"
              dataKey="total"
              name="Net Worth (Nominal)"
              stroke={TOKEN.ink}
              strokeWidth={2.5}
              fill="url(#colorNetWorth)"
            />
            <Line
              type="monotone"
              dataKey="realTotal"
              name="Net Worth (Real, Inflation-Adjusted)"
              stroke={TOKEN.info}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
};
