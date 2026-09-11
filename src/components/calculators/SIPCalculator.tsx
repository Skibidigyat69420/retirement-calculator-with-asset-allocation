import { useMemo, useState } from 'react';
import { TrendingUp, Wallet, PiggyBank } from 'lucide-react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Slider } from '../ui/Slider';
import { MetricCard } from '../ui/MetricCard';
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
import { getChartTheme } from '../../lib/chartTheme';
import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';

export const SIPCalculator = () => {
  const { inputs, updateInputs, showToast } = useCalculator();
  const [amount, setAmount] = useState(inputs.sip.amount);
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

  const theme = getChartTheme();

  return (
    <CalculatorShell
      title="SIP Calculator"
      description="See how monthly compounding grows your wealth. Includes annual step-up."
      hasInput={amount > 0}
      inputs={
        <>
          <CurrencyInput label="Monthly Investment" value={amount} onChange={setAmount} step={1000} />
          <Slider
            label="Expected Return"
            value={returnRate}
            onChange={setReturnRate}
            min={0}
            max={30}
            step={0.5}
            suffix="%"
          />
          <NumberInput label="Duration" value={years} onChange={setYears} suffix="years" min={1} max={50} />
          <NumberInput label="Annual Step-up" value={stepUp} onChange={setStepUp} suffix="%" min={0} max={50} />
          <div className="flex gap-2 pt-2 border-t border-border-subtle">
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
            icon={<Wallet size={18} strokeWidth={1.6} />}
            variant="default"
          />
          <MetricCard
            label="Wealth Gained"
            value={formatCurrency(result.gained)}
            icon={<TrendingUp size={18} strokeWidth={1.6} />}
            variant="gold"
          />
          <MetricCard
            label="Future Value"
            value={formatCurrency(result.total)}
            icon={<PiggyBank size={18} strokeWidth={1.6} />}
            variant="success"
          />
        </div>
      }
    >
      <div className="mt-6 rounded-lg border border-border bg-raised">
        <div className="px-5 pt-4 pb-3 border-b border-border-subtle">
          <div className="eyebrow">Growth Curve</div>
        </div>
        <div className="p-5">
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            Compounding does the heavy lifting: {formatCurrency(result.gained)} of the final {formatCurrency(result.total)} is growth on a {formatCurrency(result.invested)} contribution base.
          </p>
          <div
            className="h-72"
            role="img"
            aria-label={`Area chart of SIP growth over ${years} years. Total invested ${formatCurrency(result.invested)}, future value ${formatCurrency(result.total)}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="sipValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={theme.primary} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: theme.axisLabel }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={formatCurrencyCompact}
                  tick={{ fontSize: 12, fill: theme.axisLabel }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value))}
                  contentStyle={{
                    borderRadius: '8px',
                    border: `1px solid ${theme.tooltipBorder}`,
                    backgroundColor: theme.tooltipBg,
                    color: theme.tooltipText,
                    padding: '10px 14px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Future Value"
                  stroke={theme.primary}
                  strokeWidth={2}
                  fill="url(#sipValue)"
                />
                <Area
                  type="monotone"
                  dataKey="invested"
                  name="Invested"
                  stroke={theme.secondary}
                  strokeWidth={2}
                  fill="transparent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>SIP growth: cumulative invested amount and future value at each year-end</caption>
            <thead>
              <tr><th>Year</th><th>Invested</th><th>Future value</th></tr>
            </thead>
            <tbody>
              {chartData.map((d) => (
                <tr key={d.year}>
                  <td>{d.year}</td>
                  <td>{formatCurrency(d.invested)}</td>
                  <td>{formatCurrency(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CalculatorShell>
  );
};
