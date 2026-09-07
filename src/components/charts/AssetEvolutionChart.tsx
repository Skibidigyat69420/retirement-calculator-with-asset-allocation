import { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';
import { ASSET_COLORS, ASSET_LABELS, COLORS } from '../../lib/constants';

interface DataPoint {
  label: string;
  equity: number;
  debt: number;
  gold: number;
  realestate: number;
  liquid: number;
  other: number;
}

interface AssetEvolutionChartProps {
  data: DataPoint[];
  xKey?: string;
  /** 'bar' (default) keeps the original stacked-bar rendering; 'area' renders a stacked-area stream. */
  variant?: 'bar' | 'area';
  /** Accessible name for the chart container. */
  ariaLabel?: string;
}

const CATEGORIES: { key: keyof DataPoint; name: string; color: string }[] = [
  { key: 'equity', name: ASSET_LABELS.equity, color: ASSET_COLORS.equity },
  { key: 'debt', name: ASSET_LABELS.debt, color: ASSET_COLORS.debt },
  { key: 'gold', name: ASSET_LABELS.gold, color: ASSET_COLORS.gold },
  { key: 'realestate', name: ASSET_LABELS.realestate, color: ASSET_COLORS.realestate },
  { key: 'liquid', name: ASSET_LABELS.liquid, color: ASSET_COLORS.liquid },
  { key: 'other', name: ASSET_LABELS.other, color: ASSET_COLORS.other },
];

const CHART_MARGIN = { top: 10, right: 10, left: 0, bottom: 0 };

const TOOLTIP_STYLE = {
  borderRadius: '14px',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
  padding: '10px 14px',
};

export const AssetEvolutionChart = ({
  data,
  xKey = 'label',
  variant = 'bar',
  ariaLabel,
}: AssetEvolutionChartProps) => {
  const summary = useMemo(() => {
    if (data.length === 0) return 'No asset evolution data.';
    const last = data[data.length - 1];
    const total = CATEGORIES.reduce((sum, c) => sum + (last[c.key] as number), 0);
    const parts = CATEGORIES.filter((c) => (last[c.key] as number) > 0)
      .map((c) => `${c.name} ${formatCurrencyCompact(last[c.key] as number)}`)
      .join(', ');
    return `Total projected assets reach ${formatCurrencyCompact(total)} at ${last.label}, composed of ${parts}.`;
  }, [data]);

  const containerProps = {
    className: 'h-80 w-full',
    role: 'img' as const,
    'aria-label': ariaLabel ?? 'Asset class evolution chart',
  };

  if (variant === 'area') {
    return (
      <div {...containerProps}>
        <span className="sr-only">{summary}</span>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 12, fill: '#78716c' }}
              axisLine={false}
              tickLine={false}
              tickMargin={10}
            />
            <YAxis
              tickFormatter={formatCurrencyCompact}
              tick={{ fontSize: 12, fill: '#78716c' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value: any, name: any) => [
                formatCurrencyCompact(typeof value === 'number' ? value : Number(value)),
                String(name),
              ]}
              contentStyle={TOOLTIP_STYLE}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" />
            {CATEGORIES.map((cat) => (
              <Area
                key={cat.key}
                type="monotone"
                dataKey={cat.key}
                name={cat.name}
                stackId="assets"
                stroke={cat.color}
                strokeWidth={1.5}
                fill={cat.color}
                fillOpacity={0.55}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div {...containerProps}>
      <span className="sr-only">{summary}</span>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={CHART_MARGIN}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
          />
          <YAxis
            tickFormatter={formatCurrencyCompact}
            tick={{ fontSize: 12, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: any, name: any) => [
              formatCurrencyCompact(typeof value === 'number' ? value : Number(value)),
              String(name),
            ]}
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" />
          <Bar dataKey="equity" name={ASSET_LABELS.equity} stackId="a" fill={ASSET_COLORS.equity} radius={[0, 0, 0, 0]} />
          <Bar dataKey="debt" name={ASSET_LABELS.debt} stackId="a" fill={ASSET_COLORS.debt} />
          <Bar dataKey="gold" name={ASSET_LABELS.gold} stackId="a" fill={ASSET_COLORS.gold} />
          <Bar dataKey="realestate" name={ASSET_LABELS.realestate} stackId="a" fill={ASSET_COLORS.realestate} />
          <Bar dataKey="liquid" name={ASSET_LABELS.liquid} stackId="a" fill={ASSET_COLORS.liquid} />
          <Bar dataKey="other" name={ASSET_LABELS.other} stackId="a" fill={ASSET_COLORS.other} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
