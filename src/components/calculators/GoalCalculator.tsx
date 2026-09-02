import { useMemo, useState } from 'react';
import { Target, Coins, TrendingUp } from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';
import { MetricCard } from '../ui/MetricCard';
import { Card } from '../ui/Card';
import { CalculatorShell } from './CalculatorShell';
import { calculateGoal } from '../../lib/calculators';
import { formatCurrency } from '../../lib/formatters';
import { useCalculator } from '../../context/CalculatorContext';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

export const GoalCalculator = () => {
  const { inputs, addGoal, showToast } = useCalculator();
  const [name, setName] = useState('');
  const [target, setTarget] = useState(1_00_00_000);
  const [years, setYears] = useState(15);
  const [returnRate, setReturnRate] = useState(12);
  const [inflation, setInflation] = useState(inputs.inflation || 5);
  const [stepUp, setStepUp] = useState(5);

  const result = useMemo(
    () => calculateGoal(target, years, returnRate, inflation, stepUp),
    [target, years, returnRate, inflation, stepUp],
  );

  const handleAddGoal = () => {
    const goalName = name.trim() || 'New Goal';
    addGoal({
      name: goalName,
      targetAmount: target,
      yearsToGoal: years,
      inflation,
    });
    showToast(`Added goal "${goalName}" to Master Plan.`, 'success');
  };

  const handleLoadGoal = () => {
    if (inputs.goals.length > 0) {
      const g = inputs.goals[0];
      setName(g.name);
      setTarget(g.targetAmount);
      setYears(g.yearsToGoal);
      setInflation(g.inflation);
      showToast(`Loaded goal "${g.name}" from Master Plan.`, 'info');
    } else {
      showToast('No goals found in Master Plan to load.', 'warning');
    }
  };

  return (
    <CalculatorShell
      title="Target Corpus Calculator"
      description="Work backwards from a future goal to today's required investment."
      inputs={
        <>
          <Input label="Goal Name (optional)" value={name} onChange={(e) => setName(e.currentTarget.value)} placeholder="e.g. Child Education" />
          <NumberInput label="Target Amount (today's ₹)" value={target} onChange={setTarget} />
          <NumberInput label="Time Horizon" value={years} onChange={setYears} />
          <NumberInput label="Expected Return" value={returnRate} onChange={setReturnRate} suffix="%" />
          <NumberInput label="Goal Inflation" value={inflation} onChange={setInflation} suffix="%" />
          <NumberInput label="Annual SIP Step-up" value={stepUp} onChange={setStepUp} suffix="%" />
          <div className="flex gap-2 mt-2">
            <Button onClick={handleLoadGoal} className="flex-1 text-xs" variant="ghost">
              Sync from Plan
            </Button>
            <Button onClick={handleAddGoal} className="flex-1 text-xs" variant="outline">
              Add to Plan Goals
            </Button>
          </div>
        </>
      }
      results={
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <MetricCard label="Future Value Needed" value={formatCurrency(result.futureValue)} icon={<Target size={18} />} variant="navy" />
            <MetricCard label="Required Lumpsum Today" value={formatCurrency(result.requiredLumpsum)} icon={<Coins size={18} />} variant="gold" />
            <MetricCard label="Required Monthly SIP" value={formatCurrency(result.requiredSIP)} icon={<TrendingUp size={18} />} variant="success" />
          </div>

          <Card>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-stone-700 mb-4">Goal Funding Options</h4>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-700">Target (today's value)</span>
                <span className="font-medium">{formatCurrency(result.target)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-700">Inflation-adjusted target</span>
                <span className="font-medium">{formatCurrency(result.futureValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-700">Invest lumpsum today</span>
                <span className="font-medium">{formatCurrency(result.requiredLumpsum)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-700">OR monthly SIP</span>
                <span className="font-medium">{formatCurrency(result.requiredSIP)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-700">OR step-up SIP (growing {stepUp}%/yr)</span>
                <span className="font-medium">{formatCurrency(result.requiredSIPWithStepUp)}</span>
              </div>
            </div>
          </Card>
        </>
      }
    />
  );
};
