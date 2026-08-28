import { useMemo, useState } from 'react';
import { Percent } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { SectionTitle } from '../components/ui/SectionTitle';
import { MetricCard } from '../components/ui/MetricCard';
import { GrowthCurveChart } from '../components/charts/GrowthCurveChart';
import { formatCurrency } from '../lib/formatters';

export const Inflation = () => {
  const [amount, setAmount] = useState(150000);
  const [inflation, setInflation] = useState(5);
  const [years, setYears] = useState(20);

  const result = useMemo(() => {
    const data = [];
    for (let y = 0; y <= years; y++) {
      data.push({
        year: y,
        futureValue: amount * Math.pow(1 + inflation / 100, y),
        purchasingPower: amount / Math.pow(1 + inflation / 100, y),
      });
    }
    return data;
  }, [amount, inflation, years]);

  const futureValue = amount * Math.pow(1 + inflation / 100, years);
  const purchasingPower = amount / Math.pow(1 + inflation / 100, years);

  const chartData = result.map((d) => ({ label: `Y${d.year}`, value: d.futureValue }));

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Inflation Impact"
        subtitle="See how inflation erodes purchasing power and why your nominal corpus must outpace it."
        badge="Standalone"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center space-x-2 mb-5">
            <Percent size={18} className="text-gold" />
            <h3 className="text-lg font-serif text-navy">Inputs</h3>
          </div>
          <div className="space-y-4">
            <NumberInput label="Amount Today" value={amount} onChange={setAmount} />
            <NumberInput label="Annual Inflation" value={inflation} onChange={setInflation} suffix="%" />
            <NumberInput label="Years" value={years} onChange={setYears} />
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MetricCard
              label={`Future Nominal Need (${years}Y)`}
              value={formatCurrency(futureValue)}
              variant="navy"
            />
            <MetricCard
              label="Purchasing Power Today"
              value={formatCurrency(purchasingPower)}
              subtext="What that future amount buys today"
              variant="gold"
            />
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Inflation Trajectory</h3>
            <GrowthCurveChart data={chartData} name="Future Value" color="#B68B40" />
          </Card>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Why this matters</h3>
            <p className="text-stone-600 leading-relaxed">
              At <strong>{inflation}%</strong> inflation, an expense of{' '}
              <strong>{formatCurrency(amount)}</strong> today becomes{' '}
              <strong className="text-gold">{formatCurrency(futureValue)}</strong> in {years} years. Conversely,
              <strong>{formatCurrency(futureValue)}</strong> in {years} years will only buy what{' '}
              <strong>{formatCurrency(purchasingPower)}</strong> buys today. This is why retirement planning must be
              inflation-indexed, not just corpus-focused.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
