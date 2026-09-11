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
import { ASSET_LABELS } from '../../lib/constants';
import {
  getChartTheme,
  useChartMotion,
  TOOLTIP_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  LEGEND_WRAPPER_STYLE,
  CATEGORY_TOKEN_COLORS,
} from './chartPrimitives';

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
  { key: 'equity', name: ASSET_LABELS.equity, color: CATEGORY_TOKEN_COLORS[ASSET_LABELS.equity] },
  { key: 'debt', name: ASSET_LABELS.debt, color: CATEGORY_TOKEN_COLORS[ASSET_LABELS.debt] },
  { key: 'gold', name: ASSET_LABELS.gold, color: CATEGORY_TOKEN_COLORS[ASSET_LABELS.gold] },
  { key: 'realestate', name: ASSET_LABELS.realestate, color: CATEGORY_TOKEN_COLORS[ASSET_LABELS.realestate] },
  { key: 'liquid', name: ASSET_LABELS.liquid, color: CATEGORY_TOKEN_COLORS[ASSET_LABELS.liquid] },
  { key: 'other', name: ASSET_LABELS.other, color: CATEGORY_TOKEN_COLORS[ASSET_LABELS.other] },
];

const CHART_MARGIN = { top: 10, right: 10, left: 0, bottom: 0 };

export const AssetEvolutionChart = ({
  data,
  xKey = 'label',
  variant = 'bar',
  ariaLabel,
}: AssetEvolutionChartProps) => {
  const theme = getChartTheme();
  const motion = useChartMotion();

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

  const axes = (
    <>
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
    </>
  );

  const tooltip = (
    <Tooltip
      formatter={(value: any, name: any) => [
        formatCurrencyCompact(typeof value === 'number' ? value : Number(value)),
        String(name),
      ]}
      contentStyle={TOOLTIP_STYLE}
      itemStyle={TOOLTIP_ITEM_STYLE}
      labelStyle={TOOLTIP_LABEL_STYLE}
    />
  );

  if (variant === 'area') {
    return (
      <div {...containerProps}>
        <span className="sr-only">{summary}</span>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={CHART_MARGIN}>
            {axes}
            {tooltip}
            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={LEGEND_WRAPPER_STYLE} />
            {CATEGORIES.map((cat, idx) => (
              <Area
                key={cat.key}
                type="monotone"
                dataKey={cat.key}
                name={cat.name}
                stackId="assets"
                stroke={cat.color}
                strokeWidth={1.5}
                fill={cat.color}
                fillOpacity={0.5}
                animationDuration={idx === 0 ? motion : 0}
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
          {axes}
          {tooltip}
          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={LEGEND_WRAPPER_STYLE} />
          <Bar dataKey="equity" name={ASSET_LABELS.equity} stackId="a" fill={CATEGORIES[0].color} radius={[0, 0, 0, 0]} animationDuration={motion} />
          <Bar dataKey="debt" name={ASSET_LABELS.debt} stackId="a" fill={CATEGORIES[1].color} animationDuration={motion} />
          <Bar dataKey="gold" name={ASSET_LABELS.gold} stackId="a" fill={CATEGORIES[2].color} animationDuration={motion} />
          <Bar dataKey="realestate" name={ASSET_LABELS.realestate} stackId="a" fill={CATEGORIES[3].color} animationDuration={motion} />
          <Bar dataKey="liquid" name={ASSET_LABELS.liquid} stackId="a" fill={CATEGORIES[4].color} animationDuration={motion} />
          <Bar dataKey="other" name={ASSET_LABELS.other} stackId="a" fill={CATEGORIES[5].color} radius={[4, 4, 0, 0]} animationDuration={motion} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
