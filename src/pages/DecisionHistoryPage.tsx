import { useMemo, useState } from 'react';
import { Activity } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { DecisionHistoryPanel } from '../components/analytics/DecisionHistoryPanel';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { useCalculator } from '../context/CalculatorContext';
import { formatCurrency, formatCurrencyCompact, formatDate } from '../lib/formatters';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';

export const DecisionHistoryPage = () => {
  const { decisionHistory, wealthResult, inputs } = useCalculator();

  // Chronological activity timeline: cumulative decision count overlaid with
  // the plan's projected net worth interpolated at the client's age on each
  // decision date (snapshots are age-indexed).
  const [now] = useState(() => Date.now());
  const timelineData = useMemo(() => {
    const sorted = [...decisionHistory].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const yearMs = 365.25 * 24 * 60 * 60 * 1000;
    return sorted.map((entry, i) => {
      const ageAtDecision = inputs.currentAge - (now - new Date(entry.timestamp).getTime()) / yearMs;
      const snapshot = ageAtDecision >= inputs.currentAge
        ? wealthResult.snapshots.find((s) => s.age === Math.round(ageAtDecision))
        : undefined;
      const nearest = snapshot ??
        wealthResult.snapshots.reduce<(typeof wealthResult.snapshots)[number] | undefined>(
          (best, s) =>
            best === undefined || Math.abs(s.age - ageAtDecision) < Math.abs(best.age - ageAtDecision) ? s : best,
          undefined,
        );
      return {
        date: formatDate(entry.timestamp),
        cumulative: i + 1,
        netWorth: nearest?.total ?? wealthResult.netWorth,
      };
    });
  }, [decisionHistory, wealthResult.snapshots, wealthResult.netWorth, inputs.currentAge, now]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Plan Decision History & Audit Trail"
        subtitle="Complete chronological audit trail of all strategic planning calibrations, advisory rationale, portfolio rebalancing events, and client approvals."
        badge="Governance"
      />

      {decisionHistory.length > 1 && (
        <Card className="border border-zinc-200/90 shadow-sm space-y-4">
          <div className="border-b border-zinc-100 pb-3">
            <h3 className="text-base font-sans font-bold text-zinc-900 flex items-center gap-2">
              <Activity size={18} className="text-zinc-800" />
              Decision Activity Timeline
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Cumulative recorded decisions plotted against the plan&rsquo;s projected net worth at the client&rsquo;s age on each decision date.
            </p>
          </div>
          <p className="text-xs text-zinc-600">
            {decisionHistory.length} decisions span{' '}
            {formatDate(decisionHistory.reduce((a, b) => (new Date(a.timestamp) < new Date(b.timestamp) ? a : b)).timestamp)} –{' '}
            {formatDate(decisionHistory.reduce((a, b) => (new Date(a.timestamp) > new Date(b.timestamp) ? a : b)).timestamp)}; the plan&rsquo;s interpolated net worth at the latest decision is{' '}
            <span className="font-mono font-bold text-zinc-900">{formatCurrency(timelineData[timelineData.length - 1]?.netWorth ?? wealthResult.netWorth)}</span>.
          </p>
          <div
            className="h-72 w-full"
            role="img"
            aria-label={`Combined chart of cumulative decision count (${decisionHistory.length} total) and interpolated plan net worth at each decision date, ranging from ${formatCurrency(timelineData[0]?.netWorth ?? 0)} to ${formatCurrency(timelineData[timelineData.length - 1]?.netWorth ?? 0)}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--color-muted)' }} axisLine={false} tickLine={false} />
                <YAxis
                  yAxisId="left"
                  dataKey="cumulative"
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  dataKey="netWorth"
                  tickFormatter={(v: number) => formatCurrencyCompact(v)}
                  tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    name === 'cumulative' ? `${Number(value)} decisions` : formatCurrency(Number(value)),
                    name === 'cumulative' ? 'Cumulative decisions' : 'Plan net worth (interpolated)',
                  ]}
                  contentStyle={{
                    borderRadius: '14px',
                    border: '1px solid var(--color-border)',
                    backgroundColor: 'rgba(255, 255, 255, 0.96)',
                    padding: '10px 14px',
                  }}
                />
                <Legend verticalAlign="top" height={32} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Bar yAxisId="right" dataKey="netWorth" name="Plan net worth (interpolated)" fill="var(--color-accent)" fillOpacity={0.55} radius={[4, 4, 0, 0]} />
                <Line yAxisId="left" type="monotone" dataKey="cumulative" name="Cumulative decisions" stroke="var(--color-info)" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Cumulative decisions and interpolated plan net worth by decision date</caption>
            <thead>
              <tr><th>Date</th><th>Cumulative decisions</th><th>Interpolated net worth</th></tr>
            </thead>
            <tbody>
              {timelineData.map((d) => (
                <tr key={d.date}>
                  <td>{d.date}</td>
                  <td>{d.cumulative}</td>
                  <td>{formatCurrency(d.netWorth)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <DecisionHistoryPanel />

      <WorkflowFooter
        prev={{ path: '/meeting-workflow', label: 'Client Meeting' }}
        next={{ path: '/reports', label: 'Reports' }}
        flowHint="Audit trail provides compliance transparency, accountability, and the ability to revert decisions."
      />
    </div>
  );
};
