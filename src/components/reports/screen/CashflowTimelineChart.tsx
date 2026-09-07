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
import { Banknote } from 'lucide-react';
import { ChartFrame, DetailTable } from './ChartFrame';
import { CHART_TOOLTIP_STYLE, CHART_TICK, CHART_GRID_STROKE, TOKEN } from './chartTheme';
import { formatCurrency, formatCurrencyCompact } from '../../../lib/formatters';
import type { WealthSnapshot } from '../../../lib/wealthEngine';

interface CashflowTimelineChartProps {
  snapshots: WealthSnapshot[];
}

interface CashflowRow {
  age: number;
  label: string;
  sip: number;
  stp: number;
  swp: number;
}

export const CashflowTimelineChart = ({ snapshots }: CashflowTimelineChartProps) => {
  const { data, totals } = useMemo(() => {
    const rows: CashflowRow[] = snapshots.map((s) => {
      const sum = (type: string) => s.cashFlows.filter((cf) => cf.type === type).reduce((a, cf) => a + cf.amount, 0);
      return {
        age: s.age,
        label: `Age ${s.age}`,
        sip: sum('sip'),
        stp: sum('stp'),
        swp: sum('withdrawal'),
      };
    });
    const totals = {
      sip: rows.reduce((a, r) => a + r.sip, 0),
      stp: rows.reduce((a, r) => a + r.stp, 0),
      swp: rows.reduce((a, r) => a + r.swp, 0),
    };
    return { data: rows, totals };
  }, [snapshots]);

  const hasStp = totals.stp > 0;
  const hasSwp = totals.swp > 0;

  const caption = `The plan deploys ${formatCurrencyCompact(totals.sip)} of SIP contributions and ${formatCurrencyCompact(totals.stp)} of STP deployment during accumulation, then draws ${formatCurrencyCompact(totals.swp)} of SWP withdrawals across retirement.`;

  const summary = `Cash flow timeline across ages ${data[0]?.age ?? 0} to ${data[data.length - 1]?.age ?? 0}. Total SIP contributions ${formatCurrency(totals.sip)}. Total STP deployment ${formatCurrency(totals.stp)}. Total SWP withdrawals ${formatCurrency(totals.swp)}.`;

  const sampleStep = Math.max(1, Math.floor(data.length / 14));

  return (
    <ChartFrame
      title="Cash Flow Timeline — SIP / STP / SWP Streams"
      icon={<Banknote size={18} className="text-muted" aria-hidden="true" />}
      caption={caption}
      summary={summary}
      detailsLabel="View yearly cash flows"
      table={
        <DetailTable
          head={
            <>
              <th className="py-2.5 pr-4">Age</th>
              <th className="py-2.5 pr-4 text-right">SIP Contributions</th>
              <th className="py-2.5 pr-4 text-right">STP Deployment</th>
              <th className="py-2.5 pr-4 text-right">SWP Withdrawals</th>
            </>
          }
        >
          {data
            .filter((_, i) => i % sampleStep === 0 || i === data.length - 1)
            .map((row) => (
              <tr key={row.age}>
                <td className="py-2 pr-4 font-mono text-ink">{row.age}</td>
                <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(row.sip)}</td>
                <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(row.stp)}</td>
                <td className="py-2 pr-4 text-right font-mono text-ink">{formatCurrency(row.swp)}</td>
              </tr>
            ))}
        </DetailTable>
      }
    >
      <div className="h-80 w-full" role="img" aria-label={`Bar chart of annual SIP, STP, and SWP cash flows from age ${data[0]?.age ?? 0} to ${data[data.length - 1]?.age ?? 0}`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="25%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_STROKE} />
            <XAxis
              dataKey="age"
              tickFormatter={(a: number) => `${a}`}
              tick={CHART_TICK}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              minTickGap={28}
            />
            <YAxis tickFormatter={formatCurrencyCompact} tick={CHART_TICK} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              formatter={(value: any, name: any) => [formatCurrencyCompact(typeof value === 'number' ? value : Number(value)), name]}
              labelFormatter={(age: any) => `Age ${age}`}
              contentStyle={CHART_TOOLTIP_STYLE}
            />
            <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="sip" name="SIP Contributions" fill={TOKEN.accent} fillOpacity={0.85} />
            {hasStp && <Bar dataKey="stp" name="STP Deployment" fill={TOKEN.info} fillOpacity={0.85} />}
            {hasSwp && <Bar dataKey="swp" name="SWP Withdrawals" fill={TOKEN.warning} fillOpacity={0.85} radius={[3, 3, 0, 0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[11px] text-faint mt-2">
        Positive bars are contributions into the plan (accumulation); withdrawal bars show gross annual SWP draws during retirement.
      </p>
    </ChartFrame>
  );
};
