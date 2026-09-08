import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';
import { COLORS } from '../../lib/constants';

interface DataPoint {
  label: string;
  nominal: number;
  real: number;
}

interface NominalRealChartProps {
  data: DataPoint[];
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

const LEGEND_WRAPPER_STYLE = { fontSize: '11px', color: 'var(--color-muted)' };

const ACTIVE_DOT = { r: 5 };

export const NominalRealChart = ({ data, xKey = 'label', ariaLabel }: NominalRealChartProps) => {
  const first = data[0];
  const last = data[data.length - 1];
  const summary =
    data.length === 0
      ? 'No projection data.'
      : `Nominal corpus moves from ${formatCurrencyCompact(first.nominal)} at ${first.label} to ` +
        `${formatCurrencyCompact(last.nominal)} at ${last.label}; real purchasing-power value ends at ` +
        `${formatCurrencyCompact(last.real)}.`;

  return (
    <div className="h-80 w-full" role="img" aria-label={ariaLabel ?? 'Nominal versus real corpus trajectory chart'}>
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.navy} stopOpacity={0.12} />
              <stop offset="95%" stopColor={COLORS.navy} stopOpacity={0} />
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
          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={LEGEND_WRAPPER_STYLE} />
          <Area
            type="monotone"
            dataKey="nominal"
            name="Nominal Corpus"
            stroke={COLORS.navy}
            strokeWidth={2.5}
            fill="url(#colorNominal)"
          />
          <Line
            type="monotone"
            dataKey="real"
            name="Real Corpus (Purchasing Power)"
            stroke={COLORS.gold}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={ACTIVE_DOT}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
