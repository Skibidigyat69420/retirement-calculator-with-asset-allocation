import { useMemo, useState } from 'react';
import { Umbrella, Calendar, Wallet, PiggyBank } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { CalculatorShell } from './CalculatorShell';
import { calculateSWPStandalone } from '../../lib/calculations';
import { formatCurrency } from '../../lib/formatters';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { COLORS } from '../../lib/constants';

export const RetirementIncomeCalculator = () => {
  const [corpus, setCorpus] = useState(5_000_000);
  const [monthlyWithdrawal, setMonthlyWithdrawal] = useState(50_000);
  const [returnRate, setReturnRate] = useState(8);
  const [inflation, setInflation] = useState(5);
  const [taxRate, setTaxRate] = useState(10);

  const result = useMemo(
    () => calculateSWPStandalone(corpus, monthlyWithdrawal, returnRate, inflation, taxRate, 50),
    [corpus, monthlyWithdrawal, returnRate, inflation, taxRate],
  );

  const chartData = useMemo(
    () =>
      result.yearlyData.map((d) => ({
        year: `Yr ${d.year}`,
        withdrawal: d.monthlyNeed * 12,
        corpus: d.corpusLeft,
      })),
    [result.yearlyData],
  );

  const totalWithdrawn = result.yearlyData.reduce((sum, d) => sum + d.monthlyNeed * 12, 0);

  return (
    <CalculatorShell
      title="Retirement Income Calculator"
      description="How long will your corpus last given a monthly withdrawal, expected return, inflation, and tax?"
      inputs={
        <>
          <NumberInput label="Starting Corpus" value={corpus} onChange={setCorpus} />
          <NumberInput label="Monthly Withdrawal (today's ₹)" value={monthlyWithdrawal} onChange={setMonthlyWithdrawal} />
          <NumberInput label="Expected Return" value={returnRate} onChange={setReturnRate} suffix="%" />
          <NumberInput label="Inflation" value={inflation} onChange={setInflation} suffix="%" />
          <NumberInput label="Tax Rate" value={taxRate} onChange={setTaxRate} suffix="%" />
        </>
      }
      results={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="Sustainable?"
            value={result.sustainable ? 'Yes' : 'No'}
            icon={<Umbrella size={18} />}
            variant={result.sustainable ? 'success' : 'danger'}
          />
          <MetricCard
            label="Years of Income"
            value={result.years.toString()}
            icon={<Calendar size={18} />}
            variant="navy"
          />
          <MetricCard
            label={result.depletionYear !== null ? 'Depletion Year' : 'Lasts 50+ Years'}
            value={result.depletionYear !== null ? `Year ${result.depletionYear}` : '—'}
            icon={<Wallet size={18} />}
            variant={result.depletionYear !== null ? 'danger' : 'success'}
          />
          <MetricCard
            label="Total Withdrawn"
            value={formatCurrency(totalWithdrawn)}
            icon={<PiggyBank size={18} />}
            variant="gold"
          />
        </div>
      }
    >
      <Card>
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700 mb-4">
          Corpus Drawdown
        </h4>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="retirementCorpus" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.ink} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={COLORS.ink} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => formatCurrency(Number(v))}
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip
                formatter={(value: any) => formatCurrency(Number(value))}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
              />
              <ReferenceLine y={0} stroke={COLORS.accent} />
              <Area
                type="monotone"
                dataKey="corpus"
                name="Corpus Left"
                stroke={COLORS.ink}
                strokeWidth={2}
                fill="url(#retirementCorpus)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-700 mb-4">
          Year-by-Year Withdrawals
        </h4>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Scrollable table">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-[10px] uppercase tracking-wider text-slate-700">
                <th className="py-2 pr-4">Year</th>
                <th className="py-2 pr-4 text-right">Annual Withdrawal</th>
                <th className="py-2 pr-4 text-right">Corpus Left</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {result.yearlyData.map((d) => (
                <tr key={d.year} className="hover:bg-slate-50/80">
                  <td className="py-2 pr-4">Year {d.year}</td>
                  <td className="py-2 pr-4 text-right">{formatCurrency(d.monthlyNeed * 12)}</td>
                  <td className="py-2 pr-4 text-right">{formatCurrency(d.corpusLeft)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </CalculatorShell>
  );
};
