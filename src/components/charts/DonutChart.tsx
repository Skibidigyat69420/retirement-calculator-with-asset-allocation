import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';
import {
  TOOLTIP_STYLE,
  TOOLTIP_ITEM_STYLE,
  TOOLTIP_LABEL_STYLE,
  LEGEND_WRAPPER_STYLE,
  resolveSliceColor,
} from './chartPrimitives';

interface DataPoint {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DataPoint[];
  innerRadius?: number;
  outerRadius?: number;
  className?: string;
}

export const DonutChart = ({ data, innerRadius = 60, outerRadius = 90, className }: DonutChartProps) => {
  const total = data.reduce((acc, d) => acc + d.value, 0);

  if (total <= 0) {
    return (
      <div className={className || "h-72 w-full flex items-center justify-center"}>
        <p className="text-sm text-muted text-center px-6">No allocation to display — the projected corpus is depleted at this horizon.</p>
      </div>
    );
  }

  return (
    <div className={className || "h-72 w-full relative"}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            stroke="var(--color-surface)"
            strokeWidth={1}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={resolveSliceColor(entry.name, entry.color, index)} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: any, name: any) => [
              formatCurrencyCompact(typeof value === 'number' ? value : Number(value)),
              String(name),
            ]}
            contentStyle={TOOLTIP_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
          />
          <Legend
            verticalAlign="bottom"
            height={48}
            iconType="circle"
            iconSize={8}
            wrapperStyle={LEGEND_WRAPPER_STYLE}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ bottom: 48 }}>
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-wider text-muted">Total</div>
          <div className="text-sm font-mono tabular-nums text-ink">{formatCurrencyCompact(total)}</div>
        </div>
      </div>
    </div>
  );
};
