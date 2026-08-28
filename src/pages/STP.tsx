import { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { SectionTitle } from '../components/ui/SectionTitle';
import { MetricCard } from '../components/ui/MetricCard';
import { GrowthCurveChart } from '../components/charts/GrowthCurveChart';
import { calculateSTPStandalone } from '../lib/calculations';
import { formatCurrency } from '../lib/formatters';

export const STP = () => {
  const [lumpsum, setLumpsum] = useState(5000000);
  const [monthlyTransfer, setMonthlyTransfer] = useState(100000);
  const [liquidReturn, setLiquidReturn] = useState(7);
  const [targetReturn, setTargetReturn] = useState(12);

  const result = useMemo(
    () => calculateSTPStandalone(lumpsum, monthlyTransfer, liquidReturn, targetReturn),
    [lumpsum, monthlyTransfer, liquidReturn, targetReturn],
  );

  const chartData = useMemo(() => {
    const data: { label: string; value: number }[] = [];
    const liqR = liquidReturn / 100 / 12;
    const tgtR = targetReturn / 100 / 12;
    let liquid = lumpsum;
    let target = 0;
    let months = 0;

    while (liquid > 0 && months < 360) {
      months++;
      liquid = liquid * (1 + liqR);
      target = target * (1 + tgtR);
      const transfer = Math.min(liquid, monthlyTransfer);
      liquid -= transfer;
      target += transfer;
      if (months % 6 === 0) {
        data.push({ label: `M${months}`, value: liquid + target });
      }
    }
    return data;
  }, [lumpsum, monthlyTransfer, liquidReturn, targetReturn]);

  return (
    <div className="space-y-6">
      <SectionTitle
        title="STP Deployment"
        subtitle="Model how a lumpsum parked in a liquid fund gets systematically transferred into a higher-return portfolio."
        badge="Standalone"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center space-x-2 mb-5">
            <Wallet size={18} className="text-gold" />
            <h3 className="text-lg font-serif text-navy">Inputs</h3>
          </div>
          <div className="space-y-4">
            <NumberInput label="Lumpsum Capital" value={lumpsum} onChange={setLumpsum} />
            <NumberInput label="Monthly Transfer" value={monthlyTransfer} onChange={setMonthlyTransfer} />
            <NumberInput label="Liquid Fund Return" value={liquidReturn} onChange={setLiquidReturn} suffix="%" />
            <NumberInput label="Target Portfolio Return" value={targetReturn} onChange={setTargetReturn} suffix="%" />
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Depletion Time" value={`${result.months} Months`} variant="navy" />
            <MetricCard label="Final Value" value={formatCurrency(result.total)} variant="gold" />
            <MetricCard label="Wealth Gained" value={formatCurrency(result.total - lumpsum)} />
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Deployment Curve</h3>
            <GrowthCurveChart data={chartData} name="Total Value" color="#B68B40" />
          </Card>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">How it works</h3>
            <p className="text-stone-600 leading-relaxed">
              Instead of investing <strong>{formatCurrency(lumpsum)}</strong> directly into the market, it sits in a
              liquid fund earning <strong>{liquidReturn}%</strong>. Every month,{' '}
              <strong>{formatCurrency(monthlyTransfer)}</strong> is transferred into the target portfolio. This
              eliminates timing risk and typically takes <strong>{result.months} months</strong> to fully deploy,
              leaving a final value of <strong className="text-gold">{formatCurrency(result.total)}</strong>.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
};
