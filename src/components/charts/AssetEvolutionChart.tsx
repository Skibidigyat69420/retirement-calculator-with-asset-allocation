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

const CHART_MARGIN = { top: 10, right: 10, left: 0, bottom: 0 };

const TOOLTIP_STYLE = {
  borderRadius: '14px',
  border: '1px solid rgba(226, 232, 240, 0.9)',
  backgroundColor: 'rgba(255, 255, 255, 0.96)',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
  padding: '10px 14px',
};

export const AssetEvolutionChart = ({ data, xKey = 'label' }: AssetEvolutionChartProps) => {
  return (
    <div className="h-80 w-full">
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
