import { useState } from 'react';
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
import { formatCurrencyCompact } from '../../../lib/formatters';
import { COLORS } from '../../../lib/constants';
import { cn } from '../../../lib/utils';

export interface NetWorthPoint {
  label: string;
  nominal: number;
  real: number;
}

type ViewMode = 'nominal' | 'both' | 'real';

interface NetWorthEvolutionChartProps {
  data: NetWorthPoint[];
  ariaLabel: string;
  summary: string;
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

const MODES: { id: ViewMode; label: string }[] = [
  { id: 'nominal', label: 'Nominal' },
  { id: 'both', label: 'Both' },
  { id: 'real', label: 'Real' },
];

export const NetWorthEvolutionChart = ({ data, ariaLabel, summary }: NetWorthEvolutionChartProps) => {
  const [mode, setMode] = useState<ViewMode>('both');

  if (data.length === 0) {
    return (
      <div className="h-80 w-full flex items-center justify-center" role="img" aria-label={ariaLabel}>
        <p className="text-sm text-muted text-center px-6">No projection data yet — add assets and cashflows in the Master Plan.</p>
        <p className="sr-only">{summary}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <div className="flex items-center gap-0.5 rounded-lg bg-sunken border border-border p-0.5" role="group" aria-label="Toggle nominal versus real view">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              className={cn(
                'px-2.5 py-1 text-[11px] font-semibold rounded-md transition-colors',
                mode === m.id ? 'bg-raised text-ink shadow-2xs' : 'text-muted hover:text-ink',
              )}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-80 w-full" role="img" aria-label={ariaLabel}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="dashNominalFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.navy} stopOpacity={0.12} />
                <stop offset="95%" stopColor={COLORS.navy} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
            <XAxis
              dataKey="label"
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
            {mode === 'both' && <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={LEGEND_WRAPPER_STYLE} />}
            {mode !== 'real' && (
              <Area
                type="monotone"
                dataKey="nominal"
                name="Nominal Corpus"
                stroke={COLORS.navy}
                strokeWidth={2.5}
                fill="url(#dashNominalFill)"
              />
            )}
            {mode !== 'nominal' && (
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
            )}
          </AreaChart>
        </ResponsiveContainer>
        <p className="sr-only">{summary}</p>
      </div>
    </div>
  );
};
