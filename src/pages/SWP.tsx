import { useMemo, useState } from 'react';
import { Wallet } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { SectionTitle } from '../components/ui/SectionTitle';
import { MetricCard } from '../components/ui/MetricCard';
import { SWPDrawdownChart } from '../components/charts/SWPDrawdownChart';
import { calculateSWPStandalone } from '../lib/calculations';
import { formatCurrency } from '../lib/formatters';
import { Badge } from '../components/ui/Badge';

export const SWP = () => {
  const [corpus, setCorpus] = useState(90000000);
  const [withdrawal, setWithdrawal] = useState(250000);
  const [returnRate, setReturnRate] = useState(9);
  const [inflation, setInflation] = useState(5);
  const [taxRate, setTaxRate] = useState(10);

  const result = useMemo(
    () => calculateSWPStandalone(corpus, withdrawal, returnRate, inflation, taxRate, 50),
    [corpus, withdrawal, returnRate, inflation, taxRate],
  );

  const chartData = result.yearlyData.map((d) => ({ label: `Y${d.year}`, corpus: d.corpusLeft }));

  return (
    <div className="space-y-6">
      <SectionTitle
        title="SWP Engine"
        subtitle="Inflation-indexed Systematic Withdrawal Plan. See how long your corpus lasts when withdrawals grow every year."
        badge="Standalone"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center space-x-2 mb-5">
            <Wallet size={18} className="text-gold" />
            <h3 className="text-lg font-serif text-navy">Inputs</h3>
          </div>
          <div className="space-y-4">
            <NumberInput label="Starting Corpus" value={corpus} onChange={setCorpus} />
            <NumberInput label="Initial Monthly Withdrawal" value={withdrawal} onChange={setWithdrawal} />
            <NumberInput label="Expected Return" value={returnRate} onChange={setReturnRate} suffix="%" />
            <NumberInput label="Annual Inflation" value={inflation} onChange={setInflation} suffix="%" />
            <NumberInput label="Tax Rate" value={taxRate} onChange={setTaxRate} suffix="%" />
          </div>
        </Card>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard label="Longevity" value={result.sustainable ? '50+ Years' : `${result.years} Years`} variant="navy" />
            <MetricCard label="Sustainable" value={result.sustainable ? 'Yes' : 'No'} variant={result.sustainable ? 'success' : 'danger'} />
            <MetricCard label="Final Withdrawal" value={formatCurrency(result.yearlyData[result.yearlyData.length - 1]?.monthlyNeed || 0)} />
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Corpus Longevity</h3>
            <SWPDrawdownChart data={chartData} xKey="label" />
          </Card>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-4">Withdrawal Schedule</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
                    <th className="py-2 pr-4">Year</th>
                    <th className="py-2 pr-4 text-right">Monthly Need</th>
                    <th className="py-2 pr-4 text-right">Corpus Left</th>
                    <th className="py-2 pr-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {result.yearlyData.filter((_, i) => i % 5 === 0 || i === result.yearlyData.length - 1).map((d) => (
                    <tr key={d.year} className="border-b border-stone-100">
                      <td className="py-2 pr-4">{d.year}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(d.monthlyNeed)}</td>
                      <td className="py-2 pr-4 text-right">{formatCurrency(d.corpusLeft)}</td>
                      <td className="py-2 pr-4 text-center">
                        {d.corpusLeft > 0 ? (
                          <Badge variant="success">Active</Badge>
                        ) : (
                          <Badge variant="danger">Depleted</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
