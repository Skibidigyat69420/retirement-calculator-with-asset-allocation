import { useMemo, useState } from 'react';
import { Wallet, TrendingUp, PiggyBank } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { CalculatorShell } from './CalculatorShell';
import { calculateLumpsum } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import { COLORS } from '../../lib/constants';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';

export const LumpsumCalculator = () => {
  const { addAsset, showToast } = useCalculator();
  const [principal, setPrincipal] = useState(500000);
  const [returnRate, setReturnRate] = useState(12);
  const [years, setYears] = useState(15);

  const result = useMemo(
    () => calculateLumpsum(principal, returnRate, years),
    [principal, returnRate, years],
  );

  const handleAddToPlan = () => {
    addAsset({
      name: `Lumpsum Investment (${years}Y @ ${returnRate}%)`,
      value: principal,
      returnRate,
      category: 'equity',
      currency: 'INR',
      liquidateAtRetirement: true,
    });
    showToast(`Added ${formatCurrency(principal)} investment to Master Plan assets!`, 'success');
  };

  return (
    <CalculatorShell
      title="Lumpsum Calculator"
      description="Compound growth of a one-time investment over time."
      inputs={
        <>
          <NumberInput label="Lumpsum Amount" value={principal} onChange={setPrincipal} />
          <NumberInput label="Expected Return" value={returnRate} onChange={setReturnRate} suffix="%" />
          <NumberInput label="Duration" value={years} onChange={setYears} />
          <Button onClick={handleAddToPlan} className="w-full mt-2" variant="outline">
            Add to Master Plan Assets
          </Button>
        </>
      }
      results={
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Invested" value={formatCurrency(principal)} icon={<Wallet size={18} />} variant="navy" />
          <MetricCard label="Wealth Gained" value={formatCurrency(result.gained)} icon={<TrendingUp size={18} />} variant="gold" />
          <MetricCard label="Future Value" value={formatCurrency(result.total)} icon={<PiggyBank size={18} />} variant="success" />
        </div>
      }
    >
      <Card>
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700 mb-4">Growth Curve</h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={result.yearlyData.map((d) => ({ year: `Y${d.year}`, value: d.value }))}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="lumpsumValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.ink} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={COLORS.ink} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#78716c' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={formatCurrencyCompact}
                tick={{ fontSize: 12, fill: '#78716c' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{
                  borderRadius: '14px',
                  border: '1px solid rgba(226, 232, 240, 0.9)',
                  backgroundColor: 'rgba(255, 255, 255, 0.96)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 10px 25px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.04)',
                  padding: '10px 14px',
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                name="Future Value"
                stroke={COLORS.ink}
                strokeWidth={2}
                fill="url(#lumpsumValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </CalculatorShell>
  );
};
