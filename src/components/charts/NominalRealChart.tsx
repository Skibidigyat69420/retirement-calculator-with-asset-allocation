import {
  ResponsiveContainer,
  AreaChart,
  Area,
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
  nominal: number;
  real: number;
}

interface NominalRealChartProps {
  data: DataPoint[];
  xKey?: string;
}

const CHART_MARGIN = { top: 10, right: 10, left: 0, bottom: 0 };

const TOOLTIP_STYLE = {
  borderRadius: '12px',
  border: 'none',
  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
};

const ACTIVE_DOT = { r: 5 };

export const NominalRealChart = ({ data, xKey = 'label' }: NominalRealChartProps) => {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={CHART_MARGIN}>
          <defs>
            <linearGradient id="colorNominal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.navy} stopOpacity={0.12} />
              <stop offset="95%" stopColor={COLORS.navy} stopOpacity={0} />
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
            contentStyle={TOOLTIP_STYLE}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" />
          <Area
            type="monotone"
            dataKey="nominal"
            name="Nominal Corpus"
            stroke={COLORS.navy}
            strokeWidth={2.5}
            fill="url(#colorNominal)"
          />
          <Line
            type="monotone"
            dataKey="real"
            name="Real Corpus (Purchasing Power)"
            stroke={COLORS.gold}
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={ACTIVE_DOT}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
