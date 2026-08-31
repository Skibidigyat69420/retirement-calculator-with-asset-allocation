import { useMemo, useState } from 'react';
import { TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { CalculatorShell } from './CalculatorShell';
import { calculateSIP } from '../../lib/calculators';
import { formatCurrency } from '../../lib/formatters';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

export const SIPCalculator = () => {
  const [amount, setAmount] = useState(10000);
  const [returnRate, setReturnRate] = useState(12);
  const [years, setYears] = useState(15);
  const [stepUp, setStepUp] = useState(5);

  const result = useMemo(
    () => calculateSIP(amount, returnRate, years, stepUp),
    [amount, returnRate, years, stepUp],
  );

  const chartData = result.yearlyData.map((d) => ({
    year: `Y${d.year}`,
    value: d.value,
    invested: d.invested,
  }));

  return (
    <CalculatorShell
      title="SIP Calculator"
      description="See how monthly compounding grows your wealth. Includes annual step-up."
      inputs={
        <>
          <NumberInput label="Monthly Investment" value={amount} onChange={setAmount} />
          <NumberInput label="Expected Return" value={returnRate} onChange={setReturnRate} suffix="%" />
          <NumberInput label="Duration" value={years} onChange={setYears} />
          <NumberInput label="Annual Step-up" value={stepUp} onChange={setStepUp} suffix="%" />
        </>
      }
      results={
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard
            label="Total Invested"
            value={formatCurrency(result.invested)}
            icon={<Wallet size={18} />}
            variant="navy"
          />
          <MetricCard
            label="Wealth Gained"
            value={formatCurrency(result.gained)}
            icon={<TrendingUp size={18} />}
            variant="gold"
          />
          <MetricCard
            label="Future Value"
            value={formatCurrency(result.total)}
            icon={<PiggyBank size={18} />}
            variant="success"
          />
        </div>
      }
    >
      <Card>
        <h4 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-4">
          Growth Curve
        </h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sipValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#111111" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#111111" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e7e5e4" />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `₹${(Number(v) / 100000).toFixed(1)}L`}
                tick={{ fontSize: 12, fill: '#78716c' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="Future Value"
                stroke="#111111"
                strokeWidth={2}
                fill="url(#sipValue)"
              />
              <Area
                type="monotone"
                dataKey="invested"
                name="Invested"
                stroke="#A31621"
                strokeWidth={2}
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </CalculatorShell>
  );
};
