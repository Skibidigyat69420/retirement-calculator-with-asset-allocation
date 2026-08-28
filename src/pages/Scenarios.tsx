import { useMemo, useState } from 'react';
import { Check, X, ArrowRight } from 'lucide-react';
import { useCalculator } from '../context/CalculatorContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { SectionTitle } from '../components/ui/SectionTitle';
import { MetricCard } from '../components/ui/MetricCard';
import { NominalRealChart } from '../components/charts/NominalRealChart';
import { DonutChart } from '../components/charts/DonutChart';
import { calculateMasterPlan } from '../lib/calculations';
import { formatCurrency, formatPercent } from '../lib/formatters';
import { ASSET_COLORS } from '../lib/constants';

export const Scenarios = () => {
  const { scenarios, loadScenario } = useCalculator();
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  const results = useMemo(
    () => scenarios.map((s) => ({ ...s, result: calculateMasterPlan(s.inputs) })),
    [scenarios],
  );

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Scenario Comparator"
        subtitle="Compare capital-deployment strategies side-by-side. Load any scenario into the Master Plan to edit the assumptions."
        badge="Strategic Planning"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {results.map((scenario) => {
          const terminal = scenario.result.snapshots[scenario.result.snapshots.length - 1];
          const allocationData = [
            { name: 'Equity', value: terminal.equity, color: ASSET_COLORS.equity },
            { name: 'Debt', value: terminal.debt, color: ASSET_COLORS.debt },
            { name: 'Gold', value: terminal.gold, color: ASSET_COLORS.gold },
            { name: 'Real Estate', value: terminal.realEstate, color: ASSET_COLORS.realestate },
            { name: 'Liquid', value: terminal.liquid, color: ASSET_COLORS.liquid },
            { name: 'Other', value: terminal.other, color: ASSET_COLORS.other },
          ].filter((d) => d.value > 0);

          const chartData = scenario.result.snapshots
            .filter((s) => s.phase === 'accumulation')
            .map((s) => ({
              label: `Y${s.year}`,
              nominal: s.nominal,
              real: s.real,
            }));

          return (
            <Card key={scenario.id} className="relative">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-serif text-navy">{scenario.name}</h3>
                  <p className="text-sm text-stone-500 mt-1">{scenario.description}</p>
                </div>
                <Button
                  variant={activeScenarioId === scenario.id ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => {
                    loadScenario(scenario);
                    setActiveScenarioId(scenario.id);
                  }}
                >
                  {activeScenarioId === scenario.id ? (
                    <>
                      <Check size={14} className="mr-1" /> Loaded
                    </>
                  ) : (
                    <>
                      Load <ArrowRight size={14} className="ml-1" />
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <MetricCard
                  label="Terminal Corpus"
                  value={formatCurrency(scenario.result.terminalCorpusNominal)}
                  subtext="Nominal"
                  variant="navy"
                />
                <MetricCard
                  label="Real Corpus"
                  value={formatCurrency(scenario.result.terminalCorpusReal)}
                  subtext="Purchasing power"
                  variant="gold"
                />
                <MetricCard label="CAGR Nominal" value={formatPercent(scenario.result.cagrNominal)} />
                <MetricCard label="CAGR Real" value={formatPercent(scenario.result.cagrReal)} />
              </div>

              <div className="mb-5">
                <NominalRealChart data={chartData} xKey="label" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Terminal Allocation</h4>
                  <DonutChart data={allocationData} innerRadius={45} outerRadius={70} />
                </div>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 mb-2">Key Assumptions</h4>
                  <div className="text-sm space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-stone-500">STP active</span>
                      <span>{scenario.inputs.stp.active ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">STP Lumpsum</span>
                      <span>{formatCurrency(scenario.inputs.stp.lumpsum)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Monthly SIP</span>
                      <span>{formatCurrency(scenario.inputs.sip.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Equity / Debt</span>
                      <span>
                        {scenario.inputs.sip.equitySplit}% / {scenario.inputs.sip.debtSplit}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">SWP Sustainable</span>
                      <span className={scenario.result.sustainable ? 'text-green-600' : 'text-red-600'}>
                        {scenario.result.sustainable ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card>
        <h3 className="text-lg font-serif text-navy mb-4">Comparison Summary</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-200 text-left text-[10px] uppercase tracking-wider text-stone-500">
                <th className="py-2 pr-4">Scenario</th>
                <th className="py-2 pr-4 text-right">Terminal Corpus</th>
                <th className="py-2 pr-4 text-right">Real Corpus</th>
                <th className="py-2 pr-4 text-right">CAGR Nominal</th>
                <th className="py-2 pr-4 text-right">CAGR Real</th>
                <th className="py-2 pr-4 text-center">Sustainable</th>
              </tr>
            </thead>
            <tbody>
              {results.map((s) => (
                <tr key={s.id} className="border-b border-stone-100">
                  <td className="py-3 pr-4 font-medium">{s.name}</td>
                  <td className="py-3 pr-4 text-right">{formatCurrency(s.result.terminalCorpusNominal)}</td>
                  <td className="py-3 pr-4 text-right">{formatCurrency(s.result.terminalCorpusReal)}</td>
                  <td className="py-3 pr-4 text-right">{formatPercent(s.result.cagrNominal)}</td>
                  <td className="py-3 pr-4 text-right">{formatPercent(s.result.cagrReal)}</td>
                  <td className="py-3 pr-4 text-center">
                    {s.result.sustainable ? (
                      <Check size={16} className="inline text-green-600" />
                    ) : (
                      <X size={16} className="inline text-red-600" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
