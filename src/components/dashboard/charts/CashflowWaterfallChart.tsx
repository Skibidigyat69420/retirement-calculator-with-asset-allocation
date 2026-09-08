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
  borderRadius: '14px',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
  padding: '10px 14px',
};

const KIND_COLORS: Record<CashflowKind, string> = {
  income: COLORS.navy,
  expense: COLORS.red,
  sip: '#2563eb',
  surplus: COLORS.success,
};

export const CashflowWaterfallChart = ({ data, ariaLabel, summary }: CashflowWaterfallChartProps) => {
  const hasValues = data.some((d) => d.value > 0);

  if (!hasValues) {
    return (
      <div className="h-64 w-full flex items-center justify-center" role="img" aria-label={ariaLabel}>
        <p className="text-sm text-zinc-600 text-center px-6">Add income and expenses in the Master Plan to see the annual cashflow waterfall.</p>
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
            tick={{ fontSize: 11, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            tickMargin={8}
          />
          <YAxis
            tickFormatter={formatCurrencyCompact}
            tick={{ fontSize: 11, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const datum = payload[0].payload as CashflowWaterfallDatum;
              return (
                <div style={TOOLTIP_STYLE}>
                  <div className="text-[11px] font-bold text-zinc-800">{datum.name}</div>
                  <div className="text-[11px] text-zinc-600 tabular-nums">{formatCurrencyCompact(datum.value)}</div>
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
