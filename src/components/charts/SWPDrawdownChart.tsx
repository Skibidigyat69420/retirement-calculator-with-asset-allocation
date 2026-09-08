import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ComposedChart,
  Bar,
  Legend,
} from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';
import { COLORS } from '../../lib/constants';

export interface SWPDataPoint {
  label: string;
  corpus: number;
  withdrawal?: number;
  /** Optional Monte Carlo survival band for the same age/period. */
  p5?: number;
  p50?: number;
  p95?: number;
}

interface SWPDrawdownChartProps {
  data: SWPDataPoint[];
  xKey?: string;
  /** Accessible name for the chart container. */
  ariaLabel?: string;
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

export const SWPDrawdownChart = ({ data, xKey = 'label', ariaLabel }: SWPDrawdownChartProps) => {
  const hasWithdrawals = data.some((d) => d.withdrawal !== undefined && d.withdrawal > 0);
  const hasBand = data.some((d) => d.p5 !== undefined && d.p95 !== undefined);
  const first = data[0];
  const last = data[data.length - 1];
  const summary =
    data.length === 0
      ? 'No SWP projection data.'
      : `Remaining corpus starts at ${formatCurrencyCompact(first?.corpus ?? 0)}${first ? ` at ${first.label}` : ''} ` +
        `and ends at ${formatCurrencyCompact(last?.corpus ?? 0)}${last ? ` at ${last.label}` : ''}` +
        (hasBand && first && last && first.p5 !== undefined && last.p5 !== undefined
          ? `. Monte Carlo band: pessimistic path falls from ${formatCurrencyCompact(first.p5)} to ${formatCurrencyCompact(last.p5)}.`
          : '.');
  const bandLabel = ariaLabel ?? 'SWP corpus drawdown chart';

  const bandAreas = hasBand ? (
    <>
      <defs>
        <linearGradient id="colorBand95" x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={COLORS.navy} stopOpacity={0.08} />
          <stop offset="95%" stopColor={COLORS.navy} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey="p95"
        name="P95 (Optimistic)"
        stroke="#7dd3fc"
        strokeDasharray="4 4"
        strokeWidth={1}
        fill="url(#colorBand95)"
        legendType="none"
      />
      <Area
        type="monotone"
        dataKey="p50"
        name="P50 (Median Path)"
        stroke="#8cff2e"
        strokeWidth={1.5}
        strokeDasharray="6 3"
        fill="none"
      />
      <Area
        type="monotone"
        dataKey="p5"
        name="P5 (Stress Path)"
        stroke="#fb7185"
        strokeDasharray="3 3"
        strokeWidth={1.5}
        fill="none"
      />
    </>
  ) : null;

  if (hasWithdrawals) {
    return (
      <div className="h-80 w-full" role="img" aria-label={bandLabel}>
        <span className="sr-only">{summary}</span>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="colorCorpus" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.25} />
                <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatCurrencyCompact}
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatCurrencyCompact}
              tick={{ fontSize: 11, fill: '#7dd3fc' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: any, name: any) => [
                formatCurrencyCompact(typeof value === 'number' ? value : Number(value)),
                name,
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
            <Bar
              yAxisId="right"
              dataKey="withdrawal"
              name="Annual SWP Cash Flow"
              fill="#7dd3fc"
              opacity={0.8}
              radius={[4, 4, 0, 0]}
            />
            {bandAreas}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="corpus"
              name="Remaining Corpus"
              stroke={COLORS.gold}
              strokeWidth={2.5}
              fill="url(#colorCorpus)"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="h-80 w-full" role="img" aria-label={bandLabel}>
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="colorCorpus" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.2} />
              <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
          <XAxis
            dataKey={xKey}
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
            formatter={(value: any) =>
              formatCurrencyCompact(typeof value === 'number' ? value : Number(value))
            }
            contentStyle={TOOLTIP_STYLE}
          />
          {bandAreas}
          <Area
            type="monotone"
            dataKey="corpus"
            name="Corpus Left"
            stroke={COLORS.gold}
            strokeWidth={2.5}
            fill="url(#colorCorpus)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
