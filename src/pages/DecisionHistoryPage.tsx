import { useMemo, useState } from 'react';
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
import { PageHeader } from '../components/ui/PageHeader';
import { SectionHeader } from '../components/ui/SectionHeader';
import { useCalculator } from '../context/CalculatorContext';
import { guardNumber } from '../lib/planState';
import { formatCurrency, formatCurrencyCompact, formatDate } from '../lib/formatters';
import { getChartTheme } from '../lib/chartTheme';
import { WorkflowFooter } from '../components/layout/WorkflowFooter';

export const DecisionHistoryPage = () => {
  const { decisionHistory, wealthResult, inputs } = useCalculator();
  const chartTheme = getChartTheme();

  // Chronological activity timeline: cumulative decision count overlaid with
  // the plan's projected net worth interpolated at the client's age on each
  // decision date (snapshots are age-indexed). Only rendered when the plan is
  // configured — an empty plan must never show ₹0 projections as if they were
  // results.
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

  const showTimeline =
    decisionHistory.length > 1 &&
    wealthResult.isConfigured &&
    timelineData.every((d) => guardNumber(d.netWorth) !== null);

  const oldest = decisionHistory.reduce<(typeof decisionHistory)[number] | undefined>(
    (a, b) => (a === undefined || new Date(a.timestamp) > new Date(b.timestamp) ? b : a),
    undefined,
  );
  const newest = decisionHistory.reduce<(typeof decisionHistory)[number] | undefined>(
    (a, b) => (a === undefined || new Date(a.timestamp) < new Date(b.timestamp) ? b : a),
    undefined,
  );
  const latestNetWorth = guardNumber(timelineData[timelineData.length - 1]?.netWorth);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Governance · Audit Trail"
        title="Decision History"
        description="A chronological record of every strategic calibration — what changed, why it changed, and the projected impact — with the ability to revert."
      />

      {decisionHistory.length > 1 && wealthResult.isConfigured && (
        <section className="rounded-lg border border-border bg-raised shadow-card">
          <div className="px-5 md:px-6 pt-5">
            <SectionHeader
              title="Decision activity timeline"
              description="Cumulative recorded decisions plotted against the plan's projected net worth at the client's age on each decision date."
            />
          </div>
          {showTimeline ? (
            <>
              <p className="px-5 md:px-6 text-xs text-muted">
                {decisionHistory.length} decisions span {oldest ? formatDate(oldest.timestamp) : '—'} –{' '}
                {newest ? formatDate(newest.timestamp) : '—'}; interpolated plan net worth at the latest decision is{' '}
                <span className="font-mono font-medium text-ink">
                  {latestNetWorth !== null ? formatCurrency(latestNetWorth) : '—'}
                </span>.
              </p>
              <div
                className="h-72 w-full px-2 pb-4"
                role="img"
                aria-label={`Combined chart of cumulative decision count (${decisionHistory.length} total) and interpolated plan net worth at each decision date, ranging from ${formatCurrency(timelineData[0]?.netWorth ?? 0)} to ${formatCurrency(timelineData[timelineData.length - 1]?.netWorth ?? 0)}.`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={timelineData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.grid} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: chartTheme.axisLabel }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="left"
                      dataKey="cumulative"
                      allowDecimals={false}
                      tick={{ fontSize: 11, fill: chartTheme.axisLabel }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      dataKey="netWorth"
                      tickFormatter={(v: number) => formatCurrencyCompact(v)}
                      tick={{ fontSize: 11, fill: chartTheme.axisLabel }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: unknown, name: unknown) => [
                        name === 'cumulative' ? `${Number(value)} decisions` : formatCurrency(Number(value)),
                        name === 'cumulative' ? 'Cumulative decisions' : 'Plan net worth (interpolated)',
                      ]}
                      contentStyle={{
                        borderRadius: '6px',
                        border: `1px solid ${chartTheme.tooltipBorder}`,
                        backgroundColor: chartTheme.tooltipBg,
                        color: chartTheme.tooltipText,
                        padding: '10px 14px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend verticalAlign="top" height={32} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    <Bar yAxisId="right" dataKey="netWorth" name="Plan net worth (interpolated)" fill={chartTheme.primary} fillOpacity={0.5} radius={[3, 3, 0, 0]} isAnimationActive={false} />
                    <Line yAxisId="left" type="monotone" dataKey="cumulative" name="Cumulative decisions" stroke={chartTheme.secondary} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
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
            </>
          ) : (
            <p className="px-5 md:px-6 pb-5 text-xs text-muted">
              Configure the client plan to see projected net worth alongside each decision date.
            </p>
          )}
        </section>
      )}

      <section>
        <DecisionHistoryPanel />
      </section>

      <div className="pb-4">
        <WorkflowFooter
          prev={{ path: '/meeting-workflow', label: 'Client Meeting' }}
          next={{ path: '/reports', label: 'Reports' }}
          flowHint="Audit trail provides compliance transparency, accountability, and the ability to revert decisions."
        />
      </div>
    </div>
  );
};
