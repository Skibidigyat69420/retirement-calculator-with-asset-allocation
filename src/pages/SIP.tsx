import { useMemo, useState } from 'react';
import { TrendingUp } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { SectionTitle } from '../components/ui/SectionTitle';
import { MetricCard } from '../components/ui/MetricCard';
import { GrowthCurveChart } from '../components/charts/GrowthCurveChart';
import { calculateSIPStandalone } from '../lib/calculations';
import { formatCurrency, formatPercent } from '../lib/formatters';

export const SIP = () => {
  const [amount, setAmount] = useState(25000);
  const [returnRate, setReturnRate] = useState(12);
  const [years, setYears] = useState(15);
  const [stepUp, setStepUp] = useState(10);

  const result = useMemo(
    () => calculateSIPStandalone(amount, returnRate, years, stepUp),
    [amount, returnRate, years, stepUp],
  );

  const chartData = result.monthlyData.map((d) => ({ label: `Y${d.month / 12}`, value: d.value }));

  return (
    <div className="space-y-6">
      <SectionTitle
        title="SIP Engine"
        subtitle="Project the future value of a monthly Systematic Investment Plan with annual step-ups."
        badge="Standalone"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center space-x-2 mb-5">
            <TrendingUp size={18} className="text-gold" />
            <h3 className="text-lg font-serif text-navy">Inputs</h3>
          </div>
          <div className="space-y-4">
            <NumberInput label="Monthly Investment" value={amount} onChange={setAmount} />
            <NumberInput label="Expected Return" value={returnRate} onChange={setReturnRate} suffix="%" />
            <NumberInput label="Duration" value={years} onChange={setYears} />
            <NumberInput label="Annual Step-up" value={stepUp} onChange={setStepUp} suffix="%" />
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Total Invested" value={formatCurrency(result.invested)} variant="navy" />
            <MetricCard label="Wealth Gained" value={formatCurrency(result.gained)} variant="gold" />
            <MetricCard label="Future Value" value={formatCurrency(result.total)} />
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Growth Curve</h3>
            <GrowthCurveChart data={chartData} name="Corpus" color="#1A233A" />
          </Card>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Summary</h3>
            <p className="text-stone-600 leading-relaxed">
              Investing <strong>{formatCurrency(amount)}</strong> every month for <strong>{years} years</strong>{' '}
              at an expected return of <strong>{formatPercent(returnRate)}</strong> with an annual step-up of{' '}
              <strong>{formatPercent(stepUp)}</strong> grows to{' '}
              <strong className="text-gold">{formatCurrency(result.total)}</strong>. You invested{' '}
              {formatCurrency(result.invested)} and gained {formatCurrency(result.gained)}.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
