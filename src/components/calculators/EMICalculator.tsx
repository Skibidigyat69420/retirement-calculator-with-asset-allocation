import { useMemo, useState } from 'react';
import { Wallet, Percent, PiggyBank } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { CalculatorShell } from './CalculatorShell';
import { calculateEMI } from '../../lib/calculators';
import { formatCurrency } from '../../lib/formatters';
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

export const EMICalculator = () => {
  const [principal, setPrincipal] = useState(50_00_000);
  const [rate, setRate] = useState(9);
  const [years, setYears] = useState(20);

  const result = useMemo(() => calculateEMI(principal, rate, years), [principal, rate, years]);

  const chartData = result.yearlyData.map((d) => ({
    year: `Y${d.year}`,
    principal: d.principalPaid,
    interest: d.interestPaid,
  }));

  return (
    <CalculatorShell
      title="EMI Calculator"
      description="Estimate loan EMI, total interest, and the principal-vs-interest breakdown."
      inputs={
        <>
          <NumberInput label="Loan Amount" value={principal} onChange={setPrincipal} />
          <NumberInput label="Interest Rate" value={rate} onChange={setRate} suffix="%" />
          <NumberInput label="Loan Tenure" value={years} onChange={setYears} />
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
            <h4 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-4">Yearly Amortisation</h4>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Bar dataKey="principal" name="Principal" stackId="a" fill="#111111" />
                  <Bar dataKey="interest" name="Interest" stackId="a" fill="#A31621" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      }
    />
  );
};
