import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCurrencyCompact } from '../../../lib/formatters';
import { COLORS } from '../../../lib/constants';

export type CashflowKind = 'income' | 'expense' | 'sip' | 'surplus';

export interface CashflowWaterfallDatum {
  name: string;
  base: number;
  value: number;
  kind: CashflowKind;
}

interface CashflowWaterfallChartProps {
  data: CashflowWaterfallDatum[];
  ariaLabel: string;
  summary: string;
}

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: '1px solid #2b3444',
  backgroundColor: '#161b26',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.55), 0 8px 10px -6px rgba(0, 0, 0, 0.45)',
  padding: '10px 14px',
};

const KIND_COLORS: Record<CashflowKind, string> = {
  income: COLORS.navy,
  expense: COLORS.red,
  sip: '#7dd3fc',
  surplus: COLORS.success,
};

export const CashflowWaterfallChart = ({ data, ariaLabel, summary }: CashflowWaterfallChartProps) => {
  const hasValues = data.some((d) => d.value > 0);

  if (!hasValues) {
    return (
      <div className="h-64 w-full flex items-center justify-center" role="img" aria-label={ariaLabel}>
        <p className="text-sm text-muted text-center px-6">Add income and expenses in the Master Plan to see the annual cashflow waterfall.</p>
        <p className="sr-only">{summary}</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full" role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} barCategoryGap="28%">
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            tickFormatter={formatCurrencyCompact}
            tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ fill: 'rgba(139, 149, 165, 0.06)' }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const datum = payload[0].payload as CashflowWaterfallDatum;
              return (
                <div style={TOOLTIP_STYLE}>
                  <div className="text-[11px] font-bold text-ink">{datum.name}</div>
                  <div className="text-[11px] text-muted tabular-nums">{formatCurrencyCompact(datum.value)}</div>
                </div>
              );
            }}
          />
          <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} aria-hidden="true" />
          <Bar dataKey="value" stackId="wf" radius={[4, 4, 0, 0]} name="Amount">
            {data.map((d, index) => (
              <Cell key={`wf-${index}`} fill={KIND_COLORS[d.kind]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="sr-only">{summary}</p>
    </div>
  );
};
