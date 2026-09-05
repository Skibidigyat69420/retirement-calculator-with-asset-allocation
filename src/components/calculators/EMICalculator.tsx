import { useMemo, useState } from 'react';
import { Wallet, Percent, PiggyBank } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { CalculatorShell } from './CalculatorShell';
import { calculateEMI } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact } from '../../lib/formatters';
import { COLORS } from '../../lib/constants';
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

  const handleAddEmiToExpenses = () => {
    const emiRounded = Math.round(result.emi);
    updateInputs({ monthlyExpenditure: inputs.monthlyExpenditure + emiRounded });
    showToast(`Added ${formatCurrency(emiRounded)}/mo loan EMI to monthly expenditure (total: ${formatCurrency(inputs.monthlyExpenditure + emiRounded)}/mo)!`, 'success');
  };

  return (
    <CalculatorShell
      title="EMI Calculator"
      description="Estimate loan EMI, total interest, and the principal-vs-interest breakdown."
      inputs={
        <>
          <NumberInput label="Loan Amount" value={principal} onChange={setPrincipal} />
          <NumberInput label="Interest Rate" value={rate} onChange={setRate} suffix="%" />
          <NumberInput label="Loan Tenure" value={years} onChange={setYears} />
          <Button onClick={handleAddEmiToExpenses} className="w-full mt-2" variant="outline">
            Add EMI to Plan Expenses
          </Button>
        </>
      }
      results={
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard label="EMI" value={formatCurrency(result.emi)} icon={<Wallet size={18} />} variant="navy" />
            <MetricCard label="Total Interest" value={formatCurrency(result.totalInterest)} icon={<Percent size={18} />} variant="gold" />
            <MetricCard label="Total Payment" value={formatCurrency(result.totalPayment)} icon={<PiggyBank size={18} />} />
          </div>

          <Card>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-zinc-700 mb-4">Yearly Amortisation</h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={formatCurrencyCompact}
                    tick={{ fontSize: 12, fill: '#64748b' }}
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
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="principal" name="Principal" stackId="a" fill={COLORS.ink} />
                  <Bar dataKey="interest" name="Interest" stackId="a" fill={COLORS.red} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      }
    />
  );
};
