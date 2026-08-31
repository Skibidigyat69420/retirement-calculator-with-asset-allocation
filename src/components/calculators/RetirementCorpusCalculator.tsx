import { useMemo, useState } from 'react';
import { Target, Calendar, Wallet, TrendingUp } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { CalculatorShell } from './CalculatorShell';
import { calculateRetirementCorpus } from '../../lib/calculators';
import { formatCurrency, formatPercent } from '../../lib/formatters';

import { useCalculator } from '../../context/CalculatorContext';
import { Button } from '../ui/Button';

export const RetirementCorpusCalculator = () => {
  const { inputs, updateInputs } = useCalculator();
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
    alert('Retirement assumptions applied to Master Plan');
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
          <Button onClick={handleApply} className="w-full mt-2" variant="outline">
            Apply to Master Plan
          </Button>
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
            <h4 className="text-sm font-semibold uppercase tracking-wider text-stone-500 mb-4">Retirement Math</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Monthly need today</span>
                <span className="font-medium">{formatCurrency(monthlyNeedToday)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Monthly need at retirement ({result.yearsToRetirement} yrs)</span>
                <span className="font-medium">{formatCurrency(result.monthlyNeedAtRetirement)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Annual need at retirement</span>
                <span className="font-medium">{formatCurrency(result.annualNeedAtRetirement)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Retirement years</span>
                <span className="font-medium">{result.retirementYears}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Required corpus</span>
                <span className="font-medium text-navy">{formatCurrency(result.requiredCorpus)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Inflation-adjusted sustainable monthly draw</span>
                <span className="font-medium">{formatCurrency(result.sustainableMonthlyWithdrawal)}</span>
              </div>
            </div>
          </Card>
        </>
      }
    />
  );
};
