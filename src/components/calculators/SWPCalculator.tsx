import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { CalculatorShell } from './CalculatorShell';
import { calculateSWP } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { COLORS } from '../../lib/constants';

export const SWPCalculator = () => {
  const { inputs, updateSWP, updateInputs, showToast } = useCalculator();
  const [corpus, setCorpus] = useState(1_00_00_000);
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState(inputs.swp.monthlyNeedToday || 50000);
  const [returnRate, setReturnRate] = useState(inputs.swp.postRetirementReturn || 9);
  const [inflation, setInflation] = useState(inputs.inflation || 5);
  const [taxRate, setTaxRate] = useState(inputs.swp.taxRate || 10);

  const result = useMemo(
    () => calculateSWP(corpus, monthlyWithdrawal, returnRate, inflation, taxRate),
    [corpus, monthlyWithdrawal, returnRate, inflation, taxRate],
  );

  const chartData = result.yearlyData.map((d) => ({
    year: `Y${d.year}`,
    corpus: d.corpusLeft,
    withdrawn: d.withdrawn,
  }));

  const handleApply = () => {
    updateSWP({
      monthlyNeedToday: monthlyWithdrawal,
      postRetirementReturn: returnRate,
      taxRate,
    });
    updateInputs({ inflation });
    showToast('Withdrawal settings applied to Master Plan.', 'success');
  };

  return (
    <CalculatorShell
      title="Corpus Sustainability (SWP)"
      description="Check how long your corpus lasts with inflation-adjusted monthly withdrawals."
      inputs={
        <>
          <NumberInput label="Starting Corpus" value={corpus} onChange={setCorpus} />
          <NumberInput label="Monthly Withdrawal (today's ₹)" value={monthlyWithdrawal} onChange={setMonthlyWithdrawal} />
          <NumberInput label="Expected Return" value={returnRate} onChange={setReturnRate} suffix="%" />
          <NumberInput label="Annual Inflation" value={inflation} onChange={setInflation} suffix="%" />
          <NumberInput label="Tax Rate on Withdrawals" value={taxRate} onChange={setTaxRate} suffix="%" />
          <Button onClick={handleApply} className="w-full mt-2" variant="outline">
            Apply to Master Plan
          </Button>
        </>
      }
      results={
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard
              label="Corpus Longevity"
              value={result.sustainable ? 'Sustainable > 50 Yrs' : `${result.years} Years`}
              icon={result.sustainable ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
              variant={result.sustainable ? 'success' : 'danger'}
            />
            <MetricCard
              label="Total Withdrawn"
              value={formatCurrency(result.totalWithdrawn)}
              icon={<Wallet size={18} />}
            />
          </div>

          <Card>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-stone-500">Drawdown Trajectory</h4>
              <Badge variant={result.sustainable ? 'success' : 'danger'}>
                {result.sustainable ? 'Sustainable' : `Depletes in Y${result.years}`}
              </Badge>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="swpCorpus" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.gold} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={COLORS.gold} stopOpacity={0} />
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
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="corpus"
                    name="Corpus Left"
                    stroke={COLORS.gold}
                    strokeWidth={2}
                    fill="url(#swpCorpus)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      }
    />
  );
};
