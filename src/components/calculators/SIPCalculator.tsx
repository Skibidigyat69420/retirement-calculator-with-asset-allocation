import { useMemo, useState } from 'react';
import { TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { CalculatorShell } from './CalculatorShell';
import { calculateSIP } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
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
import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';

export const SIPCalculator = () => {
  const { inputs, updateInputs, showToast } = useCalculator();
  const [amount, setAmount] = useState(inputs.sip.amount || 25000);
  const [returnRate, setReturnRate] = useState(12);
  const [years, setYears] = useState(15);
  const [stepUp, setStepUp] = useState(inputs.sip.stepUp || 0);

  const result = useMemo(
    () => calculateSIP(amount, returnRate, years, stepUp),
    [amount, returnRate, years, stepUp],
  );

  const chartData = useMemo(() => {
    const data = [];
    for (let y = 1; y <= years; y++) {
      const r = calculateSIP(amount, returnRate, y, stepUp);
      data.push({
        year: `Yr ${y}`,
        invested: r.invested,
        total: r.total,
      });
    }
    return data;
  }, [amount, returnRate, years, stepUp]);

  const handleApply = () => {
    updateInputs({
      sip: {
        ...inputs.sip,
        amount,
        stepUp,
      },
    });
    showToast('SIP settings applied to Master Plan.', 'success');
  };

  const handleSyncFromPlan = () => {
    setAmount(inputs.sip.amount);
    setStepUp(inputs.sip.stepUp);
    const horizon = Math.max(1, inputs.retirementAge - inputs.currentAge);
    setYears(horizon);
    showToast(`Loaded SIP (${formatCurrency(inputs.sip.amount)}/mo, ${horizon} yrs) from Master Plan.`, 'info');
  };

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
          <div className="flex gap-2 mt-2">
            <Button onClick={handleSyncFromPlan} className="flex-1 text-xs" variant="ghost">
              Sync from Plan
            </Button>
            <Button onClick={handleApply} className="flex-1 text-xs" variant="outline">
              Apply to Plan
            </Button>
          </div>
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
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700 mb-4">
          Growth Curve
        </h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sipValue" x1="0" y1="0" x2="0" y2="1">
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
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <Area
                type="monotone"
                dataKey="total"
                name="Future Value"
                stroke={COLORS.ink}
                strokeWidth={2}
                fill="url(#sipValue)"
              />
              <Area
                type="monotone"
                dataKey="invested"
                name="Invested"
                stroke={COLORS.red}
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
