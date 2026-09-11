import { useMemo, useState } from 'react';
import { Wallet, TrendingUp, PiggyBank } from 'lucide-react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Slider } from '../ui/Slider';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { CalculatorShell } from './CalculatorShell';
import { calculateLumpsum } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import { getChartTheme } from '../../lib/chartTheme';
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

  const theme = getChartTheme();

  return (
    <CalculatorShell
      title="Lumpsum Calculator"
      description="Compound growth of a one-time investment over time."
      hasInput={principal > 0}
      inputs={
        <>
          <CurrencyInput label="Lumpsum Amount" value={principal} onChange={setPrincipal} step={10000} />
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
          <Button onClick={handleAddToPlan} className="w-full text-xs mt-2" variant="outline">
            Add to Master Plan Assets
          </Button>
        </>
      }
      results={
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="Invested" value={formatCurrency(principal)} icon={<Wallet size={18} strokeWidth={1.6} />} variant="default" />
          <MetricCard label="Wealth Gained" value={formatCurrency(result.gained)} icon={<TrendingUp size={18} strokeWidth={1.6} />} variant="gold" />
          <MetricCard label="Future Value" value={formatCurrency(result.total)} icon={<PiggyBank size={18} strokeWidth={1.6} />} variant="success" />
        </div>
      }
    >
      <div className="mt-6 rounded-lg border border-border bg-raised">
        <div className="px-5 pt-4 pb-3 border-b border-border-subtle">
          <div className="eyebrow">Growth Curve</div>
        </div>
        <div className="p-5">
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            {formatCurrency(principal)} at {returnRate}% grows to {formatCurrency(result.total)} in {years} years — a {result.gained > principal ? `${(result.total / Math.max(1, principal)).toFixed(1)}× multiple` : `${formatCurrency(result.gained)} gain`} on the original investment.
          </p>
          <div
            className="h-72"
            role="img"
            aria-label={`Area chart of lumpsum growth over ${years} years at ${returnRate} percent. Final value ${formatCurrency(result.total)}.`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={result.yearlyData.map((d) => ({ year: `Y${d.year}`, value: d.value }))}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="lumpsumValue" x1="0" y1="0" x2="0" y2="1">
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
                  dataKey="value"
                  name="Future Value"
                  stroke={theme.primary}
                  strokeWidth={2}
                  fill="url(#lumpsumValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Lumpsum value at the end of each year</caption>
            <thead>
              <tr><th>Year</th><th>Value</th></tr>
            </thead>
            <tbody>
              {result.yearlyData.map((d) => (
                <tr key={d.year}>
                  <td>Year {d.year}</td>
                  <td>{formatCurrency(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CalculatorShell>
  );
};
