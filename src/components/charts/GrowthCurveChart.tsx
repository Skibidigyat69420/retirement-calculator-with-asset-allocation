import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useMemo } from 'react';
import { formatCurrencyCompact } from '../../lib/formatters';
import { COLORS } from '../../lib/constants';

interface DataPoint {
  label: string;
  value: number;
}

interface GrowthCurveChartProps {
  data: DataPoint[];
  name?: string;
  color?: string;
  xKey?: string;
}

const CHART_MARGIN = { top: 10, right: 10, left: 0, bottom: 0 };

const TOOLTIP_STYLE = {
  borderRadius: '14px',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
  padding: '10px 14px',
};

const ACTIVE_DOT = { r: 6 };

export const GrowthCurveChart = ({
  data,
  name = 'Value',
  color = COLORS.navy,
  xKey = 'label',
}: GrowthCurveChartProps) => {
  const dot = useMemo(() => ({ r: 3, fill: color, strokeWidth: 0 }), [color]);
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={CHART_MARGIN}>
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
            formatter={(value: any) =>
              formatCurrencyCompact(typeof value === 'number' ? value : Number(value))
            }
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" />
          <Line
            type="monotone"
            dataKey="value"
            name={name}
            stroke={color}
            strokeWidth={2.5}
            dot={dot}
            activeDot={ACTIVE_DOT}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
