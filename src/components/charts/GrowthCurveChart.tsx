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

export const GrowthCurveChart = ({
  data,
  name = 'Value',
  color = COLORS.navy,
  xKey = 'label',
}: GrowthCurveChartProps) => {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            }}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" />
          <Line
            type="monotone"
            dataKey="value"
            name={name}
            stroke={color}
            strokeWidth={2.5}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
