import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';
import { COLORS } from '../../lib/constants';
import type { MonteCarloYearlyPercentile } from '../../types';

interface MonteCarloFanChartProps {
  data: MonteCarloYearlyPercentile[];
}

export const MonteCarloFanChart = ({ data }: MonteCarloFanChartProps) => {
  const chartData = data.map((d) => ({
    age: d.age,
    p5: d.p5,
    p25: d.p25,
    p50: d.p50,
    p75: d.p75,
    p95: d.p95,
  }));

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorFan90" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.12} />
              <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="colorFan50" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.navy} stopOpacity={0.15} />
              <stop offset="95%" stopColor={COLORS.navy} stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 12, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
            tickMargin={10}
            label={{ value: 'Age', position: 'insideBottom', offset: -5, fill: '#78716c', fontSize: 12 }}
          />
          <YAxis
            tickFormatter={formatCurrencyCompact}
            tick={{ fontSize: 12, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: any, name: any) => [formatCurrencyCompact(typeof value === 'number' ? value : Number(value)), name]}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
          />
          <Area
            type="monotone"
            dataKey="p95"
            name="95th Pct (Optimistic)"
            stroke="#B68B40"
            strokeDasharray="4 4"
            strokeWidth={1}
            fill="url(#colorFan90)"
          />
          <Area
            type="monotone"
            dataKey="p75"
            name="75th Pct (Favorable)"
            stroke="#1A233A"
            strokeWidth={1}
            fill="url(#colorFan50)"
          />
          <Area
            type="monotone"
            dataKey="p50"
            name="50th Pct (Median)"
            stroke={COLORS.gold}
            strokeWidth={2.5}
            fill="none"
          />
          <Area
            type="monotone"
            dataKey="p25"
            name="25th Pct (Cautious)"
            stroke="#78716c"
            strokeWidth={1}
            fill="none"
          />
          <Area
            type="monotone"
            dataKey="p5"
            name="5th Pct (Stress)"
            stroke="#e11d48"
            strokeDasharray="3 3"
            strokeWidth={1.5}
            fill="none"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
