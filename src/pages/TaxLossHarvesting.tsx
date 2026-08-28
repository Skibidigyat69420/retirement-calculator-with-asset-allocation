import { useState, useMemo } from 'react';
import { Scissors, TrendingDown, PiggyBank } from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { DataTable } from '../components/ui/DataTable';
import { MetricCard } from '../components/ui/MetricCard';
import { useCalculator } from '../context/CalculatorContext';
import { formatCurrency } from '../lib/formatters';

interface HarvestItem {
  name: string;
  value: number;
  avgPrice: number;
  ltp: number;
  quantity: number;
  unrealizedLoss: number;
  taxAlpha: number;
}

export const TaxLossHarvesting = () => {
  const { inputs } = useCalculator();
  const [taxRate, setTaxRate] = useState(12.5);
  const [carryForward, setCarryForward] = useState(0);

  const opportunities: HarvestItem[] = useMemo(() => {
    return inputs.assets
      .filter((a) => a.value > 0 && a.returnRate < 0)
      .map((a) => {
        const quantity = Math.max(1, Math.round(a.value / 100));
        const avgPrice = a.value / quantity;
        const ltp = avgPrice * (1 + a.returnRate / 100);
        const unrealizedLoss = (avgPrice - ltp) * quantity;
        const taxAlpha = Math.max(0, unrealizedLoss * (taxRate / 100));
        return { name: a.name, value: a.value, avgPrice, ltp, quantity, unrealizedLoss, taxAlpha };
      });
  }, [inputs.assets, taxRate]);

  const totalHarvestable = opportunities.reduce((sum, o) => sum + o.unrealizedLoss, 0);
  const totalTaxAlpha = opportunities.reduce((sum, o) => sum + o.taxAlpha, 0);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Tax-Loss Harvesting"
        subtitle="Identify unrealized losses that can be harvested to offset gains and improve after-tax returns."
        badge="Tax Alpha"
      />

      <Card className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <NumberInput label="Tax Rate on Gains" value={taxRate} onChange={setTaxRate} suffix="%" />
          <NumberInput label="Carry-Forward Losses" value={carryForward} onChange={setCarryForward} />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard label="Harvestable Losses" value={formatCurrency(totalHarvestable)} subtext="Current opportunities" />
        <MetricCard label="Tax Alpha" value={formatCurrency(totalTaxAlpha)} subtext="Estimated tax savings" variant="success" />
        <MetricCard label="Opportunities" value={opportunities.length.toString()} subtext="Assets in loss" />
      </div>

      <Card>
        <h3 className="text-lg font-serif text-navy mb-4 flex items-center gap-2">
          <Scissors size={18} className="text-gold" /> Harvest Opportunities
        </h3>
        <DataTable
          data={opportunities}
          columns={[
            { key: 'name', header: 'Asset' },
            { key: 'value', header: 'Value', align: 'right', render: (r) => formatCurrency(r.value) },
            { key: 'avgPrice', header: 'Avg Price', align: 'right', render: (r) => formatCurrency(r.avgPrice) },
            { key: 'ltp', header: 'LTP', align: 'right', render: (r) => formatCurrency(r.ltp) },
            { key: 'unrealizedLoss', header: 'Unrealized Loss', align: 'right', render: (r) => (
              <span className="text-rose-600 font-medium">{formatCurrency(r.unrealizedLoss)}</span>
            )},
            { key: 'taxAlpha', header: 'Tax Alpha', align: 'right', render: (r) => formatCurrency(r.taxAlpha) },
          ]}
          emptyMessage="No loss-making assets found in current portfolio."
        />
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-navy text-white">
          <h3 className="text-lg font-serif text-gold mb-3 flex items-center gap-2">
            <TrendingDown size={18} /> Wash Sale Note
          </h3>
          <p className="text-sm text-stone-200">
            India does not have explicit wash-sale rules, but avoid repurchasing the same security immediately to defend the bona fide nature of the transaction under general anti-avoidance principles.
          </p>
        </Card>
        <Card className="bg-gold/10 border-gold/30">
          <h3 className="text-lg font-serif text-navy mb-3 flex items-center gap-2">
            <PiggyBank size={18} /> Reinvestment
          </h3>
          <p className="text-sm text-stone-600">
            Deploy harvested proceeds into a similar (not identical) instrument to maintain market exposure while realizing the loss for tax purposes.
          </p>
        </Card>
      </div>
    </div>
  );
};
