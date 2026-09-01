import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';
import { COLORS } from '../../lib/constants';

interface DataPoint {
  label: string;
  corpus: number;
}

interface SWPDrawdownChartProps {
  data: DataPoint[];
  xKey?: string;
}

export const SWPDrawdownChart = ({ data, xKey = 'label' }: SWPDrawdownChartProps) => {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCorpus" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.2} />
              <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Area
            type="monotone"
            dataKey="corpus"
            name="Corpus Left"
            stroke={COLORS.gold}
            strokeWidth={2.5}
            fill="url(#colorCorpus)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
