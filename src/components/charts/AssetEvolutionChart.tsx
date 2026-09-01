import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { formatCurrencyCompact } from '../../lib/formatters';
import { ASSET_COLORS, COLORS } from '../../lib/constants';

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
}

export const AssetEvolutionChart = ({ data, xKey = 'label' }: AssetEvolutionChartProps) => {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
            contentStyle={{
              borderRadius: '12px',
              border: 'none',
              boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
            }}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" />
          <Bar dataKey="equity" name="Equity" stackId="a" fill={ASSET_COLORS.equity} radius={[0, 0, 0, 0]} />
          <Bar dataKey="debt" name="Debt" stackId="a" fill={ASSET_COLORS.debt} />
          <Bar dataKey="gold" name="Gold" stackId="a" fill={ASSET_COLORS.gold} />
          <Bar dataKey="realestate" name="Real Estate" stackId="a" fill={ASSET_COLORS.realestate} />
          <Bar dataKey="liquid" name="Liquid" stackId="a" fill={ASSET_COLORS.liquid} />
          <Bar dataKey="other" name="Other" stackId="a" fill={ASSET_COLORS.other} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
