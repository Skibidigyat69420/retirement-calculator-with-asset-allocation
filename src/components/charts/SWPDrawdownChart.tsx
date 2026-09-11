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
import {
  getChartTheme,
  useChartMotion,
  TOOLTIP_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  LEGEND_WRAPPER_STYLE,
} from './chartPrimitives';

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

export const SWPDrawdownChart = ({ data, xKey = 'label', ariaLabel }: SWPDrawdownChartProps) => {
  const theme = getChartTheme();
  const motion = useChartMotion();

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
      <Area
        type="monotone"
        dataKey="p95"
        name="P95 (Optimistic)"
        stroke={theme.muted}
        strokeDasharray="4 3"
        strokeWidth={1}
        fill="none"
        animationDuration={motion}
      />
      <Area
        type="monotone"
        dataKey="p50"
        name="P50 (Median Path)"
        stroke={theme.reference}
        strokeWidth={1.5}
        strokeDasharray="4 3"
        fill="none"
        animationDuration={motion}
      />
      <Area
        type="monotone"
        dataKey="p5"
        name="P5 (Stress Path)"
        stroke={theme.negative}
        strokeDasharray="4 3"
        strokeWidth={1.5}
        fill="none"
        animationDuration={motion}
      />
    </>
  ) : null;

  if (hasWithdrawals) {
    return (
      <div className="h-80 w-full" role="img" aria-label={bandLabel}>
        <span className="sr-only">{summary}</span>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11, fill: theme.axisLabel }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              yAxisId="left"
              tickFormatter={formatCurrencyCompact}
              tick={{ fontSize: 11, fill: theme.axisLabel, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={formatCurrencyCompact}
              tick={{ fontSize: 11, fill: theme.axisLabel, fontFamily: 'var(--font-mono)' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: any, name: any) => [
                formatCurrencyCompact(typeof value === 'number' ? value : Number(value)),
                name,
              ]}
              contentStyle={TOOLTIP_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
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
              fill={theme.secondary}
              fillOpacity={0.35}
              radius={[4, 4, 0, 0]}
              animationDuration={motion}
            />
            {bandAreas}
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="corpus"
              name="Remaining Corpus"
              stroke={theme.primary}
              strokeWidth={2}
              fill={theme.primaryFill}
              fillOpacity={0.1}
              animationDuration={motion}
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
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 11, fill: theme.axisLabel }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={formatCurrencyCompact}
            tick={{ fontSize: 11, fill: theme.axisLabel, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: unknown) =>
              formatCurrencyCompact(typeof value === 'number' ? value : Number(value))
            }
            contentStyle={TOOLTIP_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
          />
          {bandAreas}
          <Area
            type="monotone"
            dataKey="corpus"
            name="Corpus Left"
            stroke={theme.primary}
            strokeWidth={2}
            fill={theme.primaryFill}
            fillOpacity={0.1}
            animationDuration={motion}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
