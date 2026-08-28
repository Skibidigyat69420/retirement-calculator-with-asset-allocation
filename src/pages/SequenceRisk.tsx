import { useState, useMemo } from 'react';
import { TrendingDown, AlertTriangle } from 'lucide-react';
import { SectionTitle } from '../components/ui/SectionTitle';
import { Card } from '../components/ui/Card';
import { NumberInput } from '../components/ui/NumberInput';
import { Button } from '../components/ui/Button';
import { MetricCard } from '../components/ui/MetricCard';
import { useCalculator } from '../context/CalculatorContext';
import { calculateMasterPlan } from '../lib/calculations';
import { NominalRealChart } from '../components/charts/NominalRealChart';
import { formatCurrency } from '../lib/formatters';

export const SequenceRisk = () => {
  const { inputs } = useCalculator();
  const [shockYears, setShockYears] = useState(3);
  const [shockReturn, setShockReturn] = useState(-8);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const baseResult = useMemo(() => calculateMasterPlan(inputs), [inputs]);

  const stressedInputs = useMemo(() => {
    const copy = JSON.parse(JSON.stringify(inputs));
    copy.sip.equityReturn = Math.max(0, copy.sip.equityReturn + shockReturn);
    copy.sip.debtReturn = Math.max(0, copy.sip.debtReturn + shockReturn * 0.3);
    copy.assets.forEach((a: any) => {
      a.returnRate = Math.max(0, a.returnRate + shockReturn * (a.category === 'equity' ? 1 : 0.3));
    });
    return copy;
  }, [inputs, shockReturn]);

  const stressedResult = useMemo(() => calculateMasterPlan(stressedInputs), [stressedInputs]);

  const chartData = useMemo(() => {
    const data: { label: string; nominal: number; real: number }[] = [];
    const minLen = Math.min(baseResult.snapshots.length, stressedResult.snapshots.length);
    for (let i = 0; i < minLen; i++) {
      const base = baseResult.snapshots[i];
      const stress = stressedResult.snapshots[i];
      data.push({
        label: `Y${base.year}`,
        nominal: stress.nominal,
        real: base.nominal,
      });
    }
    return data;
  }, [baseResult, stressedResult]);

  return (
    <div className="space-y-8">
      <SectionTitle
        title="Sequence of Returns Risk"
        subtitle="Model how a poor-return window early in retirement or accumulation changes your plan's sustainability."
        badge="Risk Lab"
      />

      <Card className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <NumberInput label="Shock Years" value={shockYears} onChange={setShockYears} />
          <NumberInput label="Annual Shock Return" value={shockReturn} onChange={setShockReturn} suffix="%" />
          <div className="flex items-end">
            <Button onClick={() => setShowAnalysis(true)} className="w-full">
              <TrendingDown size={16} className="mr-1.5" /> Run Stress Test
            </Button>
          </div>
        </div>
      </Card>

      {showAnalysis && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              label="Base Depletion Age"
              value={baseResult.sustainable ? 'Sustainable' : `${baseResult.depletionAge || 'N/A'}`}
              subtext={baseResult.sustainable ? 'Plan succeeds' : 'Plan fails'}
              variant={baseResult.sustainable ? 'success' : 'danger'}
            />
            <MetricCard
              label="Stressed Depletion Age"
              value={stressedResult.sustainable ? 'Sustainable' : `${stressedResult.depletionAge || 'N/A'}`}
              subtext={stressedResult.sustainable ? 'Plan survives shock' : 'Shock breaks plan'}
              variant={stressedResult.sustainable ? 'success' : 'danger'}
            />
            <MetricCard
              label="Terminal Corpus Gap"
              value={formatCurrency(baseResult.terminalCorpusNominal - stressedResult.terminalCorpusNominal)}
              subtext="Nominal difference"
            />
          </div>

          <Card>
            <h3 className="text-lg font-serif text-navy mb-6">Base vs Stressed Corpus</h3>
            <NominalRealChart data={chartData} xKey="label" />
          </Card>

          {!stressedResult.sustainable && (
            <div className="p-4 bg-rose-50 text-rose-800 rounded-xl border border-rose-200 flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0" />
              <div>
                <div className="font-semibold">Sequence risk detected</div>
                <div className="text-sm">
                  A {shockReturn}% return for {shockYears} years causes corpus depletion at age {stressedResult.depletionAge}. Consider increasing SIPs, delaying retirement, or adding defensive allocation.
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
