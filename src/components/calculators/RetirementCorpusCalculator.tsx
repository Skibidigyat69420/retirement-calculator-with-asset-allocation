import { useMemo, useState } from 'react';
import { Target, Calendar, Wallet, TrendingUp } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { CalculatorShell } from './CalculatorShell';
import { calculateRetirementCorpus } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { COLORS } from '../../lib/constants';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';

export const RetirementCorpusCalculator = () => {
  const { inputs, updateInputs, showToast } = useCalculator();
  const [currentAge, setCurrentAge] = useState(inputs.currentAge || 34);
  const [retirementAge, setRetirementAge] = useState(inputs.retirementAge || 60);
  const [lifeExpectancy, setLifeExpectancy] = useState(inputs.lifeExpectancy || 85);
  const [monthlyNeedToday, setMonthlyNeedToday] = useState(inputs.swp.monthlyNeedToday || 1_00_000);
  const [inflation, setInflation] = useState(inputs.inflation || 5);
  const [postRetirementReturn, setPostRetirementReturn] = useState(inputs.swp.postRetirementReturn || 9);

  const result = useMemo(
    () =>
      calculateRetirementCorpus(
        currentAge,
        retirementAge,
        lifeExpectancy,
        monthlyNeedToday,
        inflation,
        postRetirementReturn,
      ),
    [currentAge, retirementAge, lifeExpectancy, monthlyNeedToday, inflation, postRetirementReturn],
  );

  const handleApply = () => {
    updateInputs({
      currentAge,
      retirementAge,
      lifeExpectancy,
      inflation,
      swp: {
        ...inputs.swp,
        monthlyNeedToday,
        postRetirementReturn,
      }
    });
    showToast('Retirement assumptions applied to Master Plan.', 'success');
  };

  const handleSyncFromPlan = () => {
    setCurrentAge(inputs.currentAge || 34);
    setRetirementAge(inputs.retirementAge || 60);
    setLifeExpectancy(inputs.lifeExpectancy || 85);
    setMonthlyNeedToday(inputs.swp.monthlyNeedToday || 100000);
    setInflation(inputs.inflation || 5);
    setPostRetirementReturn(inputs.swp.postRetirementReturn || 9);
    showToast('Loaded retirement timeline & assumptions from Master Plan.', 'info');
  };

  return (
    <CalculatorShell
      title="Retirement Corpus Required"
      description="Find the corpus needed to fund inflation-adjusted withdrawals through retirement."
      inputs={
        <>
          <NumberInput label="Current Age" value={currentAge} onChange={setCurrentAge} />
          <NumberInput label="Retirement Age" value={retirementAge} onChange={setRetirementAge} />
          <NumberInput label="Life Expectancy" value={lifeExpectancy} onChange={setLifeExpectancy} />
          <NumberInput label="Monthly Need Today" value={monthlyNeedToday} onChange={setMonthlyNeedToday} />
          <NumberInput label="Inflation" value={inflation} onChange={setInflation} suffix="%" />
          <NumberInput label="Post-Retirement Return" value={postRetirementReturn} onChange={setPostRetirementReturn} suffix="%" />
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
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Years to Retirement" value={`${result.yearsToRetirement}`} icon={<Calendar size={18} />} variant="navy" />
            <MetricCard label="Monthly Need at Retirement" value={formatCurrency(result.monthlyNeedAtRetirement)} icon={<Wallet size={18} />} />
            <MetricCard label="Required Corpus" value={formatCurrency(result.requiredCorpus)} icon={<Target size={18} />} variant="gold" />
            <MetricCard label="Real Return" value={formatPercent(result.realReturn)} icon={<TrendingUp size={18} />} />
          </div>

          <Card>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-4">Retirement Math</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-soft">Monthly need today</span>
                <span className="font-medium">{formatCurrency(monthlyNeedToday)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Monthly need at retirement ({result.yearsToRetirement} yrs)</span>
                <span className="font-medium">{formatCurrency(result.monthlyNeedAtRetirement)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Annual need at retirement</span>
                <span className="font-medium">{formatCurrency(result.annualNeedAtRetirement)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Retirement years</span>
                <span className="font-medium">{result.retirementYears}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Required corpus</span>
                <span className="font-medium text-navy">{formatCurrency(result.requiredCorpus)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Inflation-adjusted sustainable monthly draw</span>
                <span className="font-medium">{formatCurrency(result.sustainableMonthlyWithdrawal)}</span>
              </div>
            </div>
          </Card>

          <Card>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-ink-soft mb-4">Withdrawal Need Escalation</h4>
            <p className="text-xs text-muted mb-3">
              Inflation multiplies the monthly need by {(result.monthlyNeedAtRetirement / Math.max(1, monthlyNeedToday)).toFixed(2)}× over {result.yearsToRetirement} years — the required corpus is sized to the retirement-date need, not today&rsquo;s.
            </p>
            <div className="h-64" role="img" aria-label={`Bar chart comparing monthly withdrawal needs: ${formatCurrency(monthlyNeedToday)} today, ${formatCurrency(result.monthlyNeedAtRetirement)} at retirement, and a sustainable draw of ${formatCurrency(result.sustainableMonthlyWithdrawal)}.`}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { label: 'Today', value: monthlyNeedToday },
                    { label: 'At Retirement', value: result.monthlyNeedAtRetirement },
                    { label: 'Sustainable Draw', value: result.sustainableMonthlyWithdrawal },
                  ]}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.accent} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={formatCurrencyCompact}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(Number(value)), 'Monthly need']}
                    contentStyle={{
                      borderRadius: '14px',
                      border: '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      padding: '10px 14px',
                    }}
                  />
                  <Bar dataKey="value" name="Monthly need" radius={[6, 6, 0, 0]}>
                    <Cell style={{ fill: 'var(--color-muted)' }} />
                    <Cell style={{ fill: 'var(--color-accent)' }} />
                    <Cell style={{ fill: 'var(--color-info)' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Monthly withdrawal needs today, at retirement, and the sustainable draw</caption>
              <tbody>
                <tr><th scope="row">Today</th><td>{formatCurrency(monthlyNeedToday)}</td></tr>
                <tr><th scope="row">At retirement</th><td>{formatCurrency(result.monthlyNeedAtRetirement)}</td></tr>
                <tr><th scope="row">Sustainable draw</th><td>{formatCurrency(result.sustainableMonthlyWithdrawal)}</td></tr>
              </tbody>
            </table>
          </Card>
        </>
      }
    />
  );
};
