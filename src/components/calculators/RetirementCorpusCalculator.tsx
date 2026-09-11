import { useMemo, useState } from 'react';
import { Target, Calendar, Wallet, TrendingUp } from 'lucide-react';
import { CurrencyInput } from '../ui/CurrencyInput';
import { NumberInput } from '../ui/NumberInput';
import { Slider } from '../ui/Slider';
import { MetricCard } from '../ui/MetricCard';
import { CalculatorShell } from './CalculatorShell';
import { calculateRetirementCorpus } from '../../lib/calculators';
import { formatCurrency, formatCurrencyCompact, formatPercent } from '../../lib/formatters';
import { getChartTheme } from '../../lib/chartTheme';
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

  const theme = getChartTheme();

  const mathRows: { label: string; value: string; strong?: boolean }[] = [
    { label: 'Monthly need today', value: formatCurrency(monthlyNeedToday) },
    { label: `Monthly need at retirement (${result.yearsToRetirement} yrs)`, value: formatCurrency(result.monthlyNeedAtRetirement) },
    { label: 'Annual need at retirement', value: formatCurrency(result.annualNeedAtRetirement) },
    { label: 'Retirement years', value: String(result.retirementYears) },
    { label: 'Required corpus', value: formatCurrency(result.requiredCorpus), strong: true },
    { label: 'Inflation-adjusted sustainable monthly draw', value: formatCurrency(result.sustainableMonthlyWithdrawal) },
  ];

  return (
    <CalculatorShell
      title="Retirement Corpus Required"
      description="Find the corpus needed to fund inflation-adjusted withdrawals through retirement."
      hasInput={monthlyNeedToday > 0 || currentAge > 0}
      inputs={
        <>
          <NumberInput label="Current Age" value={currentAge} onChange={setCurrentAge} min={0} max={100} />
          <NumberInput label="Retirement Age" value={retirementAge} onChange={setRetirementAge} min={0} max={100} />
          <NumberInput label="Life Expectancy" value={lifeExpectancy} onChange={setLifeExpectancy} min={0} max={120} />
          <CurrencyInput label="Monthly Need Today" value={monthlyNeedToday} onChange={setMonthlyNeedToday} step={5000} />
          <Slider
            label="Inflation"
            value={inflation}
            onChange={setInflation}
            min={0}
            max={15}
            step={0.25}
            suffix="%"
          />
          <Slider
            label="Post-Retirement Return"
            value={postRetirementReturn}
            onChange={setPostRetirementReturn}
            min={0}
            max={20}
            step={0.5}
            suffix="%"
          />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="Years to Retirement" value={`${result.yearsToRetirement}`} icon={<Calendar size={18} strokeWidth={1.6} />} variant="default" />
          <MetricCard label="Monthly Need at Retirement" value={formatCurrency(result.monthlyNeedAtRetirement)} icon={<Wallet size={18} strokeWidth={1.6} />} />
          <MetricCard label="Required Corpus" value={formatCurrency(result.requiredCorpus)} icon={<Target size={18} strokeWidth={1.6} />} variant="gold" />
          <MetricCard label="Real Return" value={formatPercent(result.realReturn)} icon={<TrendingUp size={18} strokeWidth={1.6} />} />
        </div>
      }
    >
      <div className="mt-5 rounded-lg border border-border bg-raised">
        <div className="px-5 pt-4 pb-3 border-b border-border-subtle">
          <div className="eyebrow">Retirement Math</div>
        </div>
        <div className="p-5">
          <dl className="divide-y divide-border-subtle text-sm">
            {mathRows.map((row) => (
              <div key={row.label} className="flex justify-between py-2.5">
                <dt className="text-muted">{row.label}</dt>
                <dd className={`font-mono tabular-nums font-medium ${row.strong ? 'text-brass-strong' : 'text-ink'}`}>
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-border bg-raised">
        <div className="px-5 pt-4 pb-3 border-b border-border-subtle">
          <div className="eyebrow">Withdrawal Need Escalation</div>
        </div>
        <div className="p-5">
          <p className="text-[13px] text-muted leading-relaxed mb-4">
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
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.grid} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: theme.axisLabel }} axisLine={false} tickLine={false} />
                <YAxis
                  tickFormatter={formatCurrencyCompact}
                  tick={{ fontSize: 11, fill: theme.axisLabel }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(Number(value)), 'Monthly need']}
                  contentStyle={{
                    borderRadius: '8px',
                    border: `1px solid ${theme.tooltipBorder}`,
                    backgroundColor: theme.tooltipBg,
                    color: theme.tooltipText,
                    padding: '10px 14px',
                  }}
                />
                <Bar dataKey="value" name="Monthly need" radius={[4, 4, 0, 0]}>
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
        </div>
      </div>
    </CalculatorShell>
  );
};
