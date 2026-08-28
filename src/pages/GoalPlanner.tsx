import { useMemo, useState } from 'react';
import { Target } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { SectionTitle } from '../components/ui/SectionTitle';
import { MetricCard } from '../components/ui/MetricCard';
import { requiredSIPForGoal, requiredLumpsumForGoal } from '../lib/calculations';
import { formatCurrency } from '../lib/formatters';

export const GoalPlanner = () => {
  const [target, setTarget] = useState(50000000);
  const [years, setYears] = useState(15);
  const [returnRate, setReturnRate] = useState(12);
  const [stepUp, setStepUp] = useState(10);

  const requiredSIP = useMemo(
    () => requiredSIPForGoal(target, years, returnRate, stepUp),
    [target, years, returnRate, stepUp],
  );
  const requiredLumpsum = useMemo(
    () => requiredLumpsumForGoal(target, years, returnRate),
    [target, years, returnRate],
  );

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Goal Planner"
        subtitle="Work backwards from a future corpus target to find the required monthly SIP or lumpsum investment today."
        badge="Standalone"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center space-x-2 mb-5">
            <Target size={18} className="text-gold" />
            <h3 className="text-lg font-serif text-navy">Goal Inputs</h3>
          </div>
          <div className="space-y-4">
            <NumberInput label="Target Corpus" value={target} onChange={setTarget} />
            <NumberInput label="Years to Goal" value={years} onChange={setYears} />
            <NumberInput label="Expected Return" value={returnRate} onChange={setReturnRate} suffix="%" />
            <NumberInput label="Annual SIP Step-up" value={stepUp} onChange={setStepUp} suffix="%" />
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard label="Required Monthly SIP" value={formatCurrency(requiredSIP)} subtext="First month" variant="navy" />
            <MetricCard label="Required Lumpsum" value={formatCurrency(requiredLumpsum)} subtext="Invest today" variant="gold" />
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Planning Notes</h3>
            <ul className="space-y-3 text-stone-600 text-sm">
              <li>
                <strong>SIP Path:</strong> Start with{' '}
                <strong className="text-navy">{formatCurrency(requiredSIP)}</strong> per month and step it up by{' '}
                <strong>{stepUp}%</strong> every year. By year {years}, assuming a{' '}
                <strong>{returnRate}%</strong> return, you should reach{' '}
                <strong className="text-gold">{formatCurrency(target)}</strong>.
              </li>
              <li>
                <strong>Lumpsum Path:</strong> If you have the capital today, a single investment of{' '}
                <strong className="text-gold">{formatCurrency(requiredLumpsum)}</strong> at{' '}
                <strong>{returnRate}%</strong> would grow to the same target in {years} years.
              </li>
              <li>
                Most real-world plans use a combination: deploy existing capital via STP and layer on a monthly SIP.
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
};
