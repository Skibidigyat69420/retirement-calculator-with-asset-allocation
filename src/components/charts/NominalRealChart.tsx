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
import {
  getChartTheme,
  useChartMotion,
  TOOLTIP_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  LEGEND_WRAPPER_STYLE,
} from './chartPrimitives';

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

const ACTIVE_DOT = { r: 4, fill: 'var(--color-brass)', stroke: 'var(--color-raised)', strokeWidth: 1.5 };

export const NominalRealChart = ({ data, xKey = 'label', ariaLabel }: NominalRealChartProps) => {
  const theme = getChartTheme();
  const motion = useChartMotion();

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
          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={LEGEND_WRAPPER_STYLE} />
          <Area
            type="monotone"
            dataKey="nominal"
            name="Nominal Corpus"
            stroke={theme.primary}
            strokeWidth={2}
            fill={theme.primaryFill}
            fillOpacity={0.1}
            animationDuration={motion}
          />
          <Line
            type="monotone"
            dataKey="real"
            name="Real Corpus (Purchasing Power)"
            stroke={theme.reference}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={ACTIVE_DOT}
            animationDuration={motion}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
