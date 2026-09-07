import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';

export interface SWPSurvivalPoint {
  age: number;
  p5: number;
  p50: number;
  p95: number;
}

interface SWPSurvivalChartProps {
  data: SWPSurvivalPoint[];
  retirementAge: number;
  lifeExpectancy: number;
  /** Accessible name for the chart (announced by screen readers). */
  ariaLabel: string;
  /** Visually-hidden textual summary of the same data. */
  summary: string;
}

const CHART_MARGIN = { top: 10, right: 12, left: 0, bottom: 0 };

const TOOLTIP_STYLE = {
  borderRadius: '10px',
  border: '1px solid var(--color-border)',
  backgroundColor: '#ffffff',
  fontSize: '12px',
  padding: '8px 12px',
};

/**
 * Post-retirement corpus survival curves: median path with a P5–P95
 * confidence band, computed from Monte Carlo outcome yearly values.
 * Fixed-height SVG container so the band prints cleanly on A4.
 */
export const SWPSurvivalChart = ({ data, retirementAge, lifeExpectancy, ariaLabel, summary }: SWPSurvivalChartProps) => {
  if (!data.length) return null;

  return (
    <figure role="img" aria-label={ariaLabel} className="m-0">
      <div className="h-60 print:h-56 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={CHART_MARGIN}>
            <defs>
              <linearGradient id="colorSurvivalBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-positive)" stopOpacity={0.14} />
                <stop offset="95%" stopColor="var(--color-positive)" stopOpacity={0.02} />
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
              stroke="var(--color-info)"
              strokeDasharray="4 3"
              label={{ value: `Retirement (${retirementAge})`, position: 'insideTopLeft', fill: 'var(--color-info)', fontSize: 10 }}
            />
            <ReferenceLine
              x={lifeExpectancy}
              stroke="var(--color-muted)"
              strokeDasharray="2 3"
              label={{ value: `Horizon (${lifeExpectancy})`, position: 'insideTopRight', fill: 'var(--color-muted)', fontSize: 10 }}
            />
            <Area
              type="monotone"
              dataKey="p95"
              name="P95 (Optimistic)"
              stroke="var(--color-positive)"
              strokeDasharray="4 4"
              strokeWidth={1}
              fill="url(#colorSurvivalBand)"
            />
            <Area
              type="monotone"
              dataKey="p50"
              name="Median Corpus"
              stroke="var(--color-ink)"
              strokeWidth={2.5}
              fill="none"
            />
            <Area
              type="monotone"
              dataKey="p5"
              name="P5 (Stress)"
              stroke="var(--color-negative)"
              strokeDasharray="3 3"
              strokeWidth={1.5}
              fill="none"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">{summary}</figcaption>
    </figure>
  );
};
