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
            <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#B68B40" stopOpacity={0.08} />
              <stop offset="95%" stopColor="#B68B40" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorP75" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1A233A" stopOpacity={0.1} />
              <stop offset="95%" stopColor="#1A233A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
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
            formatter={(value: any) => formatCurrencyCompact(typeof value === 'number' ? value : Number(value))}
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            }}
          />
          <Area type="monotone" dataKey="p95" stroke="none" fill="url(#colorP95)" />
          <Area type="monotone" dataKey="p75" stroke="none" fill="url(#colorP75)" />
          <Area
            type="monotone"
            dataKey="p50"
            name="Median Corpus"
            stroke="#B68B40"
            strokeWidth={2.5}
            fill="none"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
