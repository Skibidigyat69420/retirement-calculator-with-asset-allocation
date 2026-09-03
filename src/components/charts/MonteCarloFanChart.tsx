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

const CHART_MARGIN = { top: 10, right: 10, left: 0, bottom: 0 };

const TOOLTIP_STYLE = {
  borderRadius: '14px',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
  padding: '10px 14px',
};

const LEGEND_WRAPPER_STYLE = { fontSize: '11px', paddingBottom: '8px' };

const XAXIS_LABEL = { value: 'Age', position: 'insideBottom' as const, offset: -5, fill: '#78716c', fontSize: 12 };

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
        <AreaChart data={chartData} margin={CHART_MARGIN}>
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
            label={XAXIS_LABEL}
          />
          <YAxis
            tickFormatter={formatCurrencyCompact}
            tick={{ fontSize: 12, fill: '#78716c' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            formatter={(value: any, name: any) => [formatCurrencyCompact(typeof value === 'number' ? value : Number(value)), name]}
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={LEGEND_WRAPPER_STYLE}
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
