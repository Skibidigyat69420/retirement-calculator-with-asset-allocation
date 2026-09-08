import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';

export interface NetWorthGrowthPoint {
  age: number;
  nominal: number;
  real: number;
}

interface NetWorthGrowthChartProps {
  data: NetWorthGrowthPoint[];
  retirementAge: number;
  /** Accessible name for the chart (announced by screen readers). */
  ariaLabel: string;
  /** Visually-hidden textual summary of the same data. */
  summary: string;
}

const CHART_MARGIN = { top: 10, right: 12, left: 0, bottom: 0 };

const TOOLTIP_STYLE = {
  borderRadius: '10px',
  border: '1px solid var(--color-border)',
  backgroundColor: 'var(--color-surface)',
  fontSize: '12px',
  padding: '8px 12px',
};

/**
 * Deterministic net-worth trajectory with a retirement-year marker.
 * Rendered as SVG inside a fixed-height container so it prints reliably
 * in Chromium print-to-PDF; a ReferenceLine flags the retirement age.
 */
export const NetWorthGrowthChart = ({ data, retirementAge, ariaLabel, summary }: NetWorthGrowthChartProps) => {
  if (!data.length) return null;

  return (
    <figure role="img" aria-label={ariaLabel} className="m-0">
      <div className="h-60 print:h-56 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="colorNominalNW" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-ink)" stopOpacity={0.10} />
                <stop offset="95%" stopColor="var(--color-ink)" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
            <XAxis
              dataKey="age"
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              label={{ value: 'Age', position: 'insideBottom' as const, offset: -4, fill: 'var(--color-muted)', fontSize: 11 }}
            />
            <YAxis
              tickFormatter={formatCurrencyCompact}
              tick={{ fontSize: 11, fill: 'var(--color-muted)' }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              formatter={(value: any, name: any) => [formatCurrencyCompact(typeof value === 'number' ? value : Number(value)), name]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: '6px' }} />
            <ReferenceLine
              x={retirementAge}
              stroke="var(--color-negative)"
              strokeDasharray="4 3"
              label={{ value: `Retirement (${retirementAge})`, position: 'insideTopLeft', fill: 'var(--color-negative)', fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="nominal"
              name="Nominal Net Worth"
              stroke="var(--color-ink)"
              strokeWidth={2}
              fill="url(#colorNominalNW)"
            />
            <Line
              type="monotone"
              dataKey="real"
              name="Real (Today's ₹)"
              stroke="var(--color-warning)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
};
