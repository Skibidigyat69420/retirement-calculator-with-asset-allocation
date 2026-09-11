import { useMemo, useState } from 'react';
import { Wallet, Percent, PiggyBank } from 'lucide-react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Slider } from '../ui/Slider';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { CalculatorShell } from './CalculatorShell';
import { calculateEMI } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import { getChartTheme } from '../../lib/chartTheme';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';

import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';

export const EMICalculator = () => {
  const { inputs, updateInputs, showToast } = useCalculator();
  const [principal, setPrincipal] = useState(50_00_000);
  const [rate, setRate] = useState(9);
  const [years, setYears] = useState(20);

  const result = useMemo(() => calculateEMI(principal, rate, years), [principal, rate, years]);

  const chartData = result.yearlyData.map((d) => ({
    year: `Y${d.year}`,
    principal: d.principalPaid,
    interest: d.interestPaid,
  }));

  // Remaining outstanding balance at the end of each loan year.
  const balanceData = useMemo(
    () =>
      result.yearlyData.reduce<{ year: string; balance: number }[]>((acc, d) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].balance : principal;
        acc.push({ year: `Y${d.year}`, balance: Math.max(0, prev - d.principalPaid) });
        return acc;
      }, []),
    [result.yearlyData, principal],
  );

  const interestShare = result.totalPayment > 0 ? (result.totalInterest / result.totalPayment) * 100 : 0;

  const handleAddEmiToExpenses = () => {
    const emiRounded = Math.round(result.emi);
    updateInputs({ monthlyExpenditure: inputs.monthlyExpenditure + emiRounded });
    showToast(`Added ${formatCurrency(emiRounded)}/mo loan EMI to monthly expenditure (total: ${formatCurrency(inputs.monthlyExpenditure + emiRounded)}/mo)!`, 'success');
  };

  const theme = getChartTheme();

  return (
    <CalculatorShell
      title="EMI Calculator"
      description="Estimate loan EMI, total interest, and the principal-vs-interest breakdown."
      hasInput={principal > 0 || rate > 0}
      inputs={
        <>
          <CurrencyInput label="Loan Amount" value={principal} onChange={setPrincipal} step={50000} />
          <Slider
            label="Interest Rate"
            value={rate}
            onChange={setRate}
            min={0}
            max={24}
            step={0.1}
            suffix="%"
          />
          <NumberInput label="Loan Tenure" value={years} onChange={setYears} suffix="years" min={1} max={40} />
          <Button onClick={handleAddEmiToExpenses} className="w-full text-xs mt-2" variant="outline">
            Add EMI to Plan Expenses
          </Button>
        </>
      }
      results={
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <MetricCard label="EMI" value={formatCurrency(result.emi)} icon={<Wallet size={18} strokeWidth={1.6} />} variant="default" />
          <MetricCard label="Total Interest" value={formatCurrency(result.totalInterest)} icon={<Percent size={18} strokeWidth={1.6} />} variant="gold" />
          <MetricCard label="Total Payment" value={formatCurrency(result.totalPayment)} icon={<PiggyBank size={18} strokeWidth={1.6} />} />
        </div>
      }
    >
      <div className="mt-5 rounded-lg border border-border bg-raised">
        <div className="px-5 pt-4 pb-3 border-b border-border-subtle">
          <div className="eyebrow">Yearly Amortisation</div>
        </div>
        <div className="p-5">
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            Interest is front-loaded: {interestShare.toFixed(0)}% of every EMI rupee over the full tenure goes to interest, so the principal outstanding falls slowly in the early years.
          </p>
          <div className="h-72" role="img" aria-label={`Stacked bar chart of yearly principal and interest payments over ${years} years. Total interest is ${formatCurrency(result.totalInterest)} on a ${formatCurrency(principal)} loan.`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                <Legend verticalAlign="top" height={36} iconType="circle" />
                <Bar dataKey="principal" name="Principal" stackId="a" fill={theme.primary} />
                <Bar dataKey="interest" name="Interest" stackId="a" fill={theme.negative} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Yearly principal and interest paid</caption>
            <thead>
              <tr><th>Year</th><th>Principal paid</th><th>Interest paid</th></tr>
            </thead>
            <tbody>
              {chartData.map((d) => (
                <tr key={d.year}>
                  <td>{d.year}</td>
                  <td>{formatCurrency(d.principal)}</td>
                  <td>{formatCurrency(d.interest)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-raised">
        <div className="px-5 pt-4 pb-3 border-b border-border-subtle">
          <div className="eyebrow">Outstanding Balance Curve</div>
        </div>
        <div className="p-5">
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            Half the principal is still outstanding around the midpoint of the tenure despite paying half the EMIs — the balance only accelerates down once the interest component shrinks.
          </p>
          <div className="h-64" role="img" aria-label={`Area chart of the remaining loan balance by year, starting at ${formatCurrency(principal)} and reaching zero in year ${years}.`}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="emiBalance" x1="0" y1="0" x2="0" y2="1">
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
                  formatter={(value) => [formatCurrency(Number(value)), 'Outstanding balance']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: `1px solid ${theme.tooltipBorder}`,
                    backgroundColor: theme.tooltipBg,
                    color: theme.tooltipText,
                    padding: '10px 14px',
                  }}
                />
                <ReferenceLine y={principal / 2} stroke={theme.muted} strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="balance"
                  name="Outstanding Balance"
                  stroke={theme.primary}
                  strokeWidth={2}
                  fill="url(#emiBalance)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <table className="sr-only">
            <caption>Outstanding loan balance at the end of each year</caption>
            <thead>
              <tr><th>Year</th><th>Balance</th></tr>
            </thead>
            <tbody>
              {balanceData.map((d) => (
                <tr key={d.year}>
                  <td>{d.year}</td>
                  <td>{formatCurrency(d.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </CalculatorShell>
  );
};
